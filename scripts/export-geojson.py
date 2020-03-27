import pygeoj
import psycopg2
import coronadb
import argparse


def set_property(properties, title, value):
    """ Helper method to set a property in the GeoJSON properties, skipping it if is null/empty """
    if value is not None and value != "":
        properties[title] = value


def set_rounded_property(properties, title, value, digits):
    """ Helper method to round and store a numeric property in the GeoJSON properties, skipping it if is null/empty """
    if value is not None and value != "":
        properties[title] = round(value, digits)


def load(areas_geojsonfile, state_outlines_geojsonfile, mergecounties_geojsonfile, output_geojsonfile, level):
    """
        Loads our data into the appropriate GeoJSON file

    :param areas_geojsonfile:   Our input file
    :param state_outlines_geojsonfile: Optional GeoJSON of state outlines to include
    :param mergecounties_geojsonfile: Optional GeoJSON of counties to include in combined mode
    :param output_geojsonfile: Output file
    :param level: msa, counties, or combined
    """

    if level == 'combined':
        print("Exporting Metro Areas")
        areas = load_data_into_geo(areas_geojsonfile, 'msa')
        print("Examining counties to merge")
        merge = load_data_into_geo(mergecounties_geojsonfile, 'counties_not_in_msa')
        county_count = 0
        for feature in merge:
            areas.add_feature(feature)
            county_count += 1
        print("Merged " + str(county_count) + " counties")
    else:
        print("Exporting Areas")
        areas = load_data_into_geo(areas_geojsonfile, level)

    # As a second step, we are loading a GeoJSON for the state outlines, and merging our area data from above into it
    # We'll strip the existing features in the state-level file (just making note of the name), and then put
    # the MSA data at the end so it sits on top of the states.
    if state_outlines_geojsonfile is not None:
        print("Exporting State Outlines")
        states = pygeoj.load(filepath=state_outlines_geojsonfile)
        for feature in states:
            feature.properties = {"Area": feature.properties["NAME"], "Area Type": "State"}

        for feature in areas:
            states.add_feature(feature)

        areas = states

    print("Saving Export File")
    areas.save(output_geojsonfile)


def load_data_into_geo(geojson_file, level):
    """
    Loads the census, case data, and healthcare data from the database into a GeoJSON file.  Since we have
    matching views at the MSA, county and combined level sin the database, this function can be used
    to load data at any of those levels, but we must pass in some information on how it will be used.

    :param geojson_file:    The file to load
    :param level:           Whether to load msa, county, or counties not in an msa
    """
    geo_features = pygeoj.load(filepath=geojson_file)
    output_features = pygeoj.new()
    output_features.define_crs('name', name='name": "urn:ogc:def:crs:EPSG::4269')

    total = len(geo_features)
    count = 1
    with psycopg2.connect(dbname=coronadb.database, port=coronadb.port, user=coronadb.user, host=coronadb.host,
                          password=coronadb.password) as conn:
        with conn.cursor() as cursor:
            for feature in geo_features:
                print(str(count) + " / " + str(total), end='\r')
                if level == 'msa':
                    area_id = feature.properties['CBSAFP']
                else:
                    area_id = feature.properties['GEOID']

                # noinspection SqlResolve
                base_query = """SELECT cbsa, fips, area_name, area_type, population,
                           cases, cases_per_10k_people, deaths, recovered, active, 
                           increase_yesterday, increase_2days, increase_3days,
                           case_increase_pct, case_increase_pct_2days, case_increase_pct_3days,
                           num_hospitals, licensed_beds, staffed_beds, icu_beds, combined_bed_utilization, 
                           cases_per_licensed_bed, cases_per_staffed_bed, cases_per_icu_bed"""

                if level == 'msa':
                    query = base_query + " FROM covid19.cases_and_healthcare_by_msa WHERE cbsa=%s"
                elif level == 'counties':
                    query = base_query + " FROM covid19.cases_and_healthcare_by_county WHERE fips=%s"
                elif level == 'counties_not_in_msa':
                    query = base_query + " FROM covid19.cases_and_healthcare_by_county WHERE fips=%s AND fips not in (select fips_stcou from covid19.census_msa_counties)"

                cursor.execute(query, (area_id,))
                result = cursor.fetchone()
                # Note that the GeoJSON file has regions for PR and other US terriotiries, which we don't have any data for, so we skip them here
                if result is not None:
                    # We are going to recreate the properties for each feature (metro area) in our GeoJSON file - we don't really want any
                    # of the original properties, and will instead fill in information we loaded from the DB
                    feature.properties = {"ID": area_id, "Area": result[2], "Area Type": result[3],
                                          "Population": result[4]}
                    set_property(feature.properties, "Cases", result[5])
                    set_rounded_property(feature.properties, "Cases per 10,000 People", result[6], 2)
                    set_property(feature.properties, "Deaths", result[7])
                    set_property(feature.properties, "Recovered", result[8])
                    set_property(feature.properties, "Active Cases", result[9])
                    set_property(feature.properties, "Increase in Cases Today", result[10])
                    # set_property(feature.properties, "Increase over 2 Days", result[11])
                    # set_property(feature.properties, "Increase over 3 Days", result[12])
                    if result[13] is not None:
                        set_rounded_property(feature.properties, "% Increase in Cases Today", result[13] * 100, 1)
                    # if result[14] is not None:
                    #    set_rounded_property(feature.properties, "% Increase in Cases over 2 Days", result[14] * 100, 1)
                    # if result[15] is not None:
                    #    set_rounded_property(feature.properties, "% Increase in Cases over 3 Days", result[15] * 100, 1)
                    set_property(feature.properties, "# of Hospitals", result[16])
                    set_property(feature.properties, "# of Hospital Beds (Licensed)", result[17])
                    set_property(feature.properties, "# of Hospital Beds (Staffed)", result[18])
                    set_property(feature.properties, "# of ICU Beds", result[19])
                    set_rounded_property(feature.properties, "Est. Combined Bed Utilization", result[20], 4)
                    set_rounded_property(feature.properties, "Cases per Hospital Bed (Licensed)", result[21], 2)
                    set_rounded_property(feature.properties, "Cases per Hospital Bed (Staffed)", result[22], 2)
                    set_rounded_property(feature.properties, "Cases per ICU Bed", result[23], 2)
                    output_features.add_feature(feature)

                # Double-checking whether a CBSA might have matched multiple places - e.g., we have errors/mismatches in our data
                # This doesn't happen in the correct, underlying datasets, but checking to make sure we haven't made a mistake
                # in data loading somwhere.
                result = cursor.fetchone()
                if result is not None:
                    print()
                    print("Found multiple rows for area " + area_id)

                count = count + 1
    print()
    return output_features


# Main part of the script: just examine/verify command line and invoke our loader
parser = argparse.ArgumentParser(description='Script to load Census data into the database')
parser.add_argument("--input", required=True, type=str, help="MSA or counties GeoJSON File to load")
parser.add_argument("--mergecounties", type=str, help="Counties GeoJSON file to merge in combined mode")
parser.add_argument("--stateoutlines", type=str, help="State outline GeoJSON File to load")
parser.add_argument("--output", required=True, type=str, help="Output file to save")
parser.add_argument("--level", required=True, choices=['msa', 'counties', 'combined'], help="Whether to output MSA data, county data, or combined data")
args = parser.parse_args()
load(args.input, args.stateoutlines, args.mergecounties, args.output, args.level)
