import argparse
import coronadb
import psycopg2
import csv


_EXPECTED_HEADERS = [None, "REGION", "DIVISION", "STATE", "COUNTY", "STNAME", "CTYNAME", None, None, None, None, None, None, None, None, None, None, "POPESTIMATE2018"]


def load(source):
    with psycopg2.connect(dbname=coronadb.database, port=coronadb.port, user=coronadb.user, host=coronadb.host, password=coronadb.password) as db:
        clear_census_data(db)
        load_census_data(db, source)


def clear_census_data(db):
    with db.cursor() as cursor:
        cursor.execute("DELETE FROM covid19.census")

    db.commit()
    print("Cleaned database")


def load_census_data(db, source):
    with open(source, 'r', errors='ignore') as file:
        reader = csv.reader(file)
        header = next(reader, None)

        # First, confirm the file matches our expected layout so we don't load bad data
        for i, expected in enumerate(_EXPECTED_HEADERS):
            if expected is not None and header[i] != expected:
                print("Invalid Header at Position " + str(i) + ": Expected \"" + expected + "\", found \"" + header[i] + "\"")
                return False

        count = 1
        with db.cursor() as cursor:
            for row in reader:
                print(str(count), end='\r')

                region = row[1]
                division = row[2]
                state_num = row[3]
                county_num = row[4]
                state = row[5]
                county = row[6]
                population_2018 = row[17]
                fips = str(state_num).zfill(2) + str(county_num).zfill(3)

                cursor.execute("""
                        INSERT INTO covid19.census (region, division, state_num, county_num, fips, state, county, pop_2018)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)""",
                               (region, division, state_num, county_num, fips, state, county, population_2018))
                count += 1

    print()
    db.commit()


parser = argparse.ArgumentParser(description='Script to load Census data into the database')
parser.add_argument("--source", required=True, type=str, help="File to load")
args = parser.parse_args()
load(args.source)
