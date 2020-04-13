import argparse
import coronadb
import psycopg2
import csv


def load(source):
    with psycopg2.connect(dbname=coronadb.database, port=coronadb.port,
                          user=coronadb.user, host=coronadb.host, password=coronadb.password) as db:

        clear_healthcare_data(db)
        load_healthcare_data(db, source)


def clear_healthcare_data(db):
    with db.cursor() as cursor:
        cursor.execute("DELETE FROM covid19.def_healthcare_data")

    db.commit()
    print("Cleaned database")


_EXPECTED_HEADERS = ["X", "Y", "OBJECTID", "HOSPITAL_NAME", "HOSPITAL_TYPE", "HQ_ADDRESS", "HQ_ADDRESS1",
                     "HQ_CITY", "HQ_STATE", "HQ_ZIP_CODE", "COUNTY_NAME", "STATE_NAME", "STATE_FIPS",
                     "CNTY_FIPS", "FIPS", "NUM_LICENSED_BEDS", "NUM_STAFFED_BEDS", "NUM_ICU_BEDS",
                     "BED_UTILIZATION", "Potential_Increase_In_Bed_Capac"]


def load_healthcare_data(db, source):
    with open(source, 'r', errors='ignore') as file:
        reader = csv.reader(file)
        header = next(reader, None)

        for i, expected in enumerate(_EXPECTED_HEADERS):
            if header[i] != expected and expected != "X":
                print("Unexpected header in column " + str(i) + ": Expected \"" + expected +
                      "\", found \"" + repr(header[i]) + "\"")
                return False

        count = 1
        with db.cursor() as cursor:
            for row in reader:
                print(str(count), end='\r')
                insert_row(cursor, row)
                count += 1

    print()
    db.commit()


def insert_row(cursor, row):
    # Convert empty strings to None so we can insert to integer fields
    if row[15] == "":
        row[15] = None
    if row[16] == "":
        row[16] = None
    if row[17] == "":
        row[17] = None
    if row[18] == "":
        row[18] = None
    if row[19] == "":
        row[19] = None
    cursor.execute("""
            INSERT INTO covid19.def_healthcare_data (
                x, y, OBJECTID, hospital_name, hospital_type, hq_address, hq_address1, hq_city, hq_state, hq_zip_code,
                county_name, state_name, state_fips, cnty_fips, fips, num_licensed_beds, num_staffed_beds,
                num_icu_beds, bed_utilization, potential_increase_in_bed_capac)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)""",
                   row)


parser = argparse.ArgumentParser(description='Script to load Census data into the database')
parser.add_argument("--source", required=True, type=str, help="File to load")
args = parser.parse_args()
load(args.source)
