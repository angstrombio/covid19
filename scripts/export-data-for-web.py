import pygeoj
import psycopg2
import coronadb
import argparse
import json
import numpy as np
from fitutil import Fit


def set_property(metadata, properties, title, value, round_digits=None):
    """ Helper method to set a property in the GeoJSON properties, skipping it if is null/empty """
    if value is not None and value != "":
        if round_digits is not None:
            properties[title] = round(value, round_digits)
        else:
            properties[title] = value
        if title in metadata:
            if value < metadata[title]['min']:
                metadata[title]['min'] = value
            if value > metadata[title]['max']:
                metadata[title]['max'] = value


def round_if_valid(value, digits):
    if value is not None and value != "":
        return round(value, digits)

    return value


def append_history(continuing, history, value, round_digits=None, date_format=None):
    if continuing:
        if value is not None and value != "":
            if round_digits is not None:
                history.append(round(value, round_digits))
            elif date_format is not None:
                history.append(value.strftime(date_format))
            else:
                history.append(value)

            return True

    return False


def load(areas_geojsonfile, mergecounties_geojsonfile, output_geojsonfile, output_metadata):
    """
        Loads our data into the appropriate GeoJSON file

    :param areas_geojsonfile:   Our input file
    :param mergecounties_geojsonfile: Optional GeoJSON of counties to include in combined mode
    :param output_geojsonfile: Output file
    """
    # Use defaults if not specified
    if areas_geojsonfile is None or areas_geojsonfile == "":
        areas_geojsonfile = "../input-data/msa-input.geojson"
    if mergecounties_geojsonfile is None or mergecounties_geojsonfile == "":
        mergecounties_geojsonfile = "../input-data/counties_input.geojson"

    metadata = {
        "last_file_date": None,
        "file_date_history": None,
        "cases": {"min": 0, "max": 0},
        "cases_per_10k_people": {"min": 0.0, "max": 0.0},
        "deaths": {"min": 0, "max": 0},
        "cases_per_bed": {"min": 0, "max": 0},
        "cases_per_icu_bed": {"min": 0, "max": 0},
        "population": {"min": 999999, "max": 0},
        "cases_fit": {"min": 1, "max": 0},
        "increase": {"min": 0, "max": 0},
        "increase_per_10k_people": {"min": 0, "max": 0}
    }

    print("Exporting Metro Areas")
    areas = load_data_into_geo(metadata, areas_geojsonfile, True)
    print("Examining counties to merge")
    merge = load_data_into_geo(metadata, mergecounties_geojsonfile, False)
    county_count = 0
    for feature in merge:
        areas.add_feature(feature)
        county_count += 1
    print("Merged " + str(county_count) + " counties")

    print("Saving Export File")
    areas.save(output_geojsonfile)

    print("Saving Metadata")
    with open(output_metadata, "w") as metadata_file:
        json.dump(metadata, metadata_file)


def load_data_into_geo(metadata, geojson_file, load_msa):
    """
    Loads the census, case data, and healthcare data from the database into a GeoJSON file.  Since we have
    matching views at the MSA, county and combined level sin the database, this function can be used
    to load data at any of those levels, but we must pass in some information on how it will be used.
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
                if load_msa:
                    area_id = feature.properties['CBSAFP']
                else:
                    area_id = feature.properties['GEOID']

                # noinspection SqlResolve
                base_query = """SELECT cbsa, fips, area_name, area_type, population,
                            file_date, cases, cases_per_10k_people, deaths, recovered, active,
                            increase_yesterday,
                            num_hospitals, staffed_beds, icu_beds,  
                            cases_per_staffed_bed, cases_per_icu_bed, increase_per_10k_people"""

                if load_msa:
                    query = base_query + " FROM covid19.cases_and_healthcare_historical_by_msa WHERE cbsa=%s"
                else:
                    query = base_query + " FROM covid19.cases_and_healthcare_historical_by_county WHERE fips=%s AND fips not in (select fips_stcou from covid19.census_msa_counties)"

                cursor.execute(query, (area_id,))
                result = cursor.fetchone()
                # Note that the GeoJSON file has regions for PR and other US terriotiries, which we don't have any data for, so we skip them here
                if result is not None:
                    # We are going to recreate the properties for each feature (metro area) in our GeoJSON file - we don't really want any
                    # of the original properties, and will instead fill in information we loaded from the DB
                    feature.properties = {"id": area_id, "area": result[2], "area_type": result[3]}
                    file_date = result[5].strftime('%Y-%m-%d')
                    if metadata['last_file_date'] is None or file_date > metadata['last_file_date']:
                        metadata['last_file_date'] = file_date

                    set_property(metadata, feature.properties, "population", result[4])
                    cases_today = result[6]
                    set_property(metadata, feature.properties, "cases", cases_today)

                    set_property(metadata, feature.properties, "cases_per_10k_people", result[7], round_digits=2)
                    set_property(metadata, feature.properties, "deaths", result[8])
                    # set_property(feature.properties, "recovered", result[9])
                    # set_property(feature.properties, "active", result[10])
                    set_property(metadata, feature.properties, "increase", result[11])
                    set_property(metadata, feature.properties, "hospitals", result[12])
                    set_property(metadata, feature.properties, "hospital_beds", result[13])
                    set_property(metadata, feature.properties, "icu_beds", result[14])
                    set_property(metadata, feature.properties, "cases_per_bed", result[15], round_digits=2)
                    set_property(metadata, feature.properties, "cases_per_icu_bed", result[16], round_digits=2)
                    set_property(metadata, feature.properties, "increase_per_10k_people", result[17], round_digits=3)

                    history_rows = cursor.fetchall()
                    has_history = False
                    date_history = []
                    cases_history = []
                    deaths_history = []
                    cases_per_10k_people_history = []
                    increase_per_10k_people_history = []
                    cases_per_icu_bed_history = []
                    increase_history = []
                    continue_deaths = True
                    continue_per_capita = True
                    continue_per_icu = True
                    continue_increase = True
                    contineu_increase_per_capita = True

                    num_days_with_cases = 0

                    for result in history_rows:
                        # Process historical data
                        has_history = True
                        append_history(True, date_history, result[5], date_format='%Y-%m-%d')
                        cases_history.append(result[6])
                        if result[6] > 0:
                            num_days_with_cases += 1
                        continue_per_capita = append_history(continue_per_capita, cases_per_10k_people_history, result[7], round_digits=2)
                        continue_deaths = append_history(continue_deaths, deaths_history, result[8])
                        continue_increase = append_history(continue_increase, increase_history, result[11])
                        continue_per_icu = append_history(continue_per_icu, cases_per_icu_bed_history, result[16], round_digits=2)
                        contineu_increase_per_capita = append_history(contineu_increase_per_capita, increase_per_10k_people_history, result[17], round_digits=3)

                    if has_history:
                        if metadata['file_date_history'] is None or len(metadata['file_date_history']) < len(date_history):
                            metadata['file_date_history'] = date_history

                        feature.properties['date_history'] = date_history
                        feature.properties['cases_history'] = cases_history
                        feature.properties['cases_per_10k_people_history'] = cases_per_10k_people_history
                        feature.properties['deaths_history'] = deaths_history
                        feature.properties['increase_history'] = increase_history
                        feature.properties['cases_per_icu_bed_history'] = cases_per_icu_bed_history
                        feature.properties['increase_per_10k_people_history'] = increase_per_10k_people_history

                        if num_days_with_cases > 2:
                            nlen = len(cases_history) + 1
                            t = np.arange(0.0, nlen, 1.0)
                            n = np.empty(nlen)
                            for i in range(1, nlen):
                                n[i] = cases_history[nlen-i-1]
                            n[0] = cases_today

                            fit_value = Fit(t, n)
                            if not np.isnan(fit_value):
                                set_property(metadata, feature.properties, "cases_fit", fit_value, round_digits=4)

                    output_features.add_feature(feature)

                count = count + 1
    print()
    return output_features


# Main part of the script: just examine/verify command line and invoke our loader
parser = argparse.ArgumentParser(description='Script to load data from the database to GeoJSON for the web')
parser.add_argument("--input", type=str, help="MSA GeoJSON File to load")
parser.add_argument("--mergecounties", type=str, help="Counties GeoJSON file to merge")
parser.add_argument("--output", required=True, type=str, help="Output file to save")
parser.add_argument("--metadata", required=True, type=str, help="Output file for metadata")
args = parser.parse_args()
load(args.input, args.mergecounties, args.output, args.metadata)
