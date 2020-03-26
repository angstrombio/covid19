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


def load(msafile, statesfile, outputfile, msa_only_outputfile):
    """
    Loads our data into the appropriate GeoJSON file

    :param msafile: The MSA GeoJSON file to start from (required)
    :param statesfile: The State outline GeoJSON file to start from (optional)
    :param outputfile: The output file to write, containing state information
    :param msa_only_outputfile: The output file to write without the state information
    """
    msa = pygeoj.load(filepath=msafile)
    total = len(msa)

    count = 1
    with psycopg2.connect(dbname=coronadb.database, port=coronadb.port, user=coronadb.user, host=coronadb.host, password=coronadb.password) as conn:
        with conn.cursor() as cursor:
            for feature in msa:
                print(str(count) + " / " + str(total), end='\r')
                # The "CBSAFP" property in our GeoJSON file links to the census MSA data in the database.
                # Base logic here:
                #     For each MSA:
                #          Look up the MSA, all of the counties it contains, and all of the data for the individual counties
                #          Our DB views look back at prior days, so we also grab some data on increases in cases and pct increases
                #          Calculating a few metrics on the fly, like cases per hospital bed, since these are summing across hospitals and county case counts
                #          We grab all of that detail from the DB, then shove it into our new GeoJSON file.
                cbsafp = feature.properties['CBSAFP']
                cursor.execute("""
                    select msa.cbsa, msa.msa_name, msa.pop_2018, sum(cases.cases) as cases, 
                        case when msa.pop_2018 is null then null else sum(cases.cases)::float/msa.pop_2018*10000 end as cases_per_10k_people,
                        sum(cases.deaths) as deaths, sum(recovered) as recovered, sum(active) as active, sum(cases_delta) as increase_yesterday,
                        hc.num_hospitals, hc.licensed_beds, hc.staffed_beds, hc.icu_beds, hc.combined_bed_utilization,
                        case when hc.licensed_beds is null or hc.licensed_beds=0 then null else sum(cases.cases::float)/hc.licensed_beds end as cases_per_licensed_bed,
                        case when hc.staffed_beds is null or hc.staffed_beds=0 then null else sum(cases.cases::float)/hc.staffed_beds end as cases_per_staffed_bed,
                        case when hc.icu_beds is null or hc.icu_beds=0 then null else sum(cases.cases::float)/hc.icu_beds end as cases_per_icu_bed,
                        case when sum(cases.prior_cases) is null or sum(cases.prior_cases)=0 then null else sum(cases.cases_delta)::float/sum(cases.prior_cases) end as case_increase_pct,
                        sum(cases_delta2) as increase_2days, 
                        case when sum(cases.prior_cases2) is null or sum(cases.prior_cases2)=0 then null else sum(cases.cases_delta2)::float/sum(cases.prior_cases2) end as case_increase_pct_2days,
                        sum(cases_delta3) as increase_3days,   
                        case when sum(cases.prior_cases3) is null or sum(cases.prior_cases3)=0 then null else sum(cases.cases_delta3)::float/sum(cases.prior_cases3) end as case_increase_pct_3days
                    from covid19.census_msa msa 
                    inner join covid19.census_msa_counties mc on msa.cbsa=mc.cbsa
                    left outer join covid19.census c on mc.fips_stcou= c.fips
                    left outer join covid19.cases_us_current cases on cases.fips=c.fips
                    left outer join covid19.healthcare_msa hc on hc.cbsa=msa.cbsa
                    where msa.cbsa=%s
                    group by msa.cbsa, msa.msa_name, msa.pop_2018, hc.num_hospitals, hc.licensed_beds, hc.staffed_beds, hc.icu_beds, hc.combined_bed_utilization
                """, (cbsafp,))
                result = cursor.fetchone()
                if result is not None:
                    # Note that the GeoJSON file has regions for PR, which we don't have any data for, so we skip them here

                    # We are going to recreate the properties for each feature (metro area) in our GeoJSON file - we don't really want any
                    # of the original properties, and will instead fill in information we loaded from the DB
                    feature.properties = {"cbsa": cbsafp, "Metro Area": result[1], "Population": result[2]}
                    set_property(feature.properties, "Cases", result[3])
                    set_rounded_property(feature.properties, "Cases per 10,000 People", result[4], 2)
                    set_property(feature.properties, "Deaths", result[5])
                    set_property(feature.properties, "Recovered", result[6])
                    set_property(feature.properties, "Active Cases", result[7])
                    set_property(feature.properties, "Increase in Active Cases Today", result[8])
                    set_property(feature.properties, "# of Hospitals", result[9])
                    set_property(feature.properties, "# of Hospital Beds (Licensed)", result[10])
                    set_property(feature.properties, "# of Hospital Beds (Staffed)", result[11])
                    set_property(feature.properties, "# of ICU Beds", result[12])
                    set_rounded_property(feature.properties, "Est. Combined Bed Utilization", result[13], 4)
                    set_rounded_property(feature.properties, "Cases per Hospital Bed (Licensed)", result[14], 2)
                    set_rounded_property(feature.properties, "Cases per Hospital Bed (Staffed)", result[15], 2)
                    set_rounded_property(feature.properties, "Cases per ICU Bed", result[16], 2)

                # Double-checking whether a CBSA might have matched multiple places - e.g., we have errors/mismatches in our data
                # This doesn't happen in the correct, underlying datasets, but checking to make sure we haven't made a mistake
                # in data loading somwhere.
                result = cursor.fetchone()
                if result is not None:
                    print()
                    print("Found multiple rows for CBSA " + cbsafp)

                count = count + 1
    print()

    # We can write out the "msa" collection of GeoJSON, which contains no state outlines.  If requested, do that now
    if msa_only_outputfile is not None:
        msa.save(msa_only_outputfile)

    # As a second step, we are loading a GeoJSON for the state outlines, and merging our MSA data from above into it
    # We'll strip the existing features in the state-level file (just making note of the name), and then put
    # the MSA data at the end so it sits on top of the states.
    if statesfile is not None:
        states = pygeoj.load(filepath=statesfile)
        for feature in states:
            feature.properties = {"Metro Area": feature.properties["NAME"] + " (State)"}

        for feature in msa:
            states.add_feature(feature)

        states.save(outputfile)


# Main part of the script: just examine/verify command line and invoke our loader
parser = argparse.ArgumentParser(description='Script to load Census data into the database')
parser.add_argument("--msa", required=True, type=str, help="MSA GeoJSON File to load")          # typically "/Users/jfeldman/Desktop/test.json.geojson")
parser.add_argument("--states", type=str, help="State GeoJSON File to load")                    # typically "/Users/jfeldman/Downloads/gz_2010_us_040_00_5m.json"
parser.add_argument("--states_output", type=str, help="Output file to save with states data")   # typically "/Users/jfeldman/Desktop/msa-case-density-with-hc-and-states.geojson"
parser.add_argument("--msa_output", type=str, help="Output file to save without states data")   # typically "/Users/jfeldman/Desktop/msa-case-density-with-hc.geojson"
args = parser.parse_args()
if args.states is None and args.states_output is not None:
    print("Please specify a states input file if states output is required")
elif args.states_output is None and args.msa_output is None:
    print("No output file specified")
else:
    load(args.msa, args.states, args.states_output, args.msa_output)
