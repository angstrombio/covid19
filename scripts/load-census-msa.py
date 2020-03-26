import argparse
import coronadb
import psycopg2
import csv


_EXPECTED_HEADERS = ["CBSA", "MDIV", "STCOU", "NAME", "LSAD", None, None, None, None, None, None,
                     None, None, None, None, "POPESTIMATE2018"]


def load(source):
    with psycopg2.connect(dbname=coronadb.database, port=coronadb.port, user=coronadb.user, host=coronadb.host, password=coronadb.password) as db:
        clear_census_data(db)
        load_census_data(db, source)


def clear_census_data(db):
    with db.cursor() as cursor:
        cursor.execute("DELETE FROM covid19.census_msa")
        cursor.execute("DELETE FROM covid19.census_mdiv")
        cursor.execute("DELETE FROM covid19.census_msa_counties")
        cursor.execute("DELETE FROM covid19.census_mdiv_counties")

    db.commit()
    print("Cleaned database")


def load_census_data(db, source):
    with open(source, 'r', errors='ignore') as file:
        reader = csv.reader(file)
        header = next(reader, None)

        for i, expected_title in enumerate(_EXPECTED_HEADERS):
            if expected_title is not None and header[i] != expected_title:
                print("Invalid Header at position " + str(i) + ": Expected \"" + expected_title + "\", found \"" + header[i])
                return False

        count = 1
        with db.cursor() as cursor:
            for row in reader:
                row_type = row[4]
                if row_type == "Metropolitan Statistical Area" or row_type == "Micropolitan Statistical Area":
                    insert_msa(cursor, row[0], row[3], row[4], row[15])
                elif row_type == "County or equivalent":
                    insert_county(cursor, row[0], row[1], row[2], row[3], row[15])
                elif row_type == "Metropolitan Division":
                    insert_mdiv(cursor, row[0], row[1], row[3], row[15])
                else:
                    print("Invalid area type: " + row_type)
                    return False

                print(str(count), end='\r')
                count += 1

    print()
    db.commit()


def insert_msa(cursor, cbsa, name, msa_type, pop_2018):
    cursor.execute("INSERT INTO covid19.census_msa (cbsa, msa_name, msa_type, pop_2018) VALUES (%s, %s, %s, %s)",
                   (cbsa, name, msa_type, pop_2018))


def insert_mdiv(cursor, cbsa, mdiv, name, pop_2018):
    cursor.execute("INSERT INTO covid19.census_mdiv (cbsa, mdiv, mdiv_name, pop_2018) VALUES (%s, %s, %s, %s)",
                   (cbsa, mdiv, name, pop_2018))


def insert_county(cursor, cbsa, mdiv, fips_stcou, name, pop_2018):
    cursor.execute("INSERT INTO covid19.census_msa_counties (cbsa, fips_stcou, county_name, pop_2018) VALUES (%s, %s, %s, %s)",
                   (cbsa, fips_stcou, name, pop_2018))
    if mdiv is not None and mdiv != "":
        cursor.execute("INSERT INTO covid19.census_mdiv_counties (cbsa, mdiv, fips_stcou, county_name, pop_2018) VALUES (%s, %s, %s, %s, %s)",
                       (cbsa, mdiv, fips_stcou, name, pop_2018))


parser = argparse.ArgumentParser(description='Script to load Census MSA data into the database')
parser.add_argument("--source", required=True, type=str, help="File to load")
args = parser.parse_args()
load(args.source)
