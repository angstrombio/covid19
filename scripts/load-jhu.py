import argparse
import os
import csv
import psycopg2
from psycopg2 import extras
import coronadb
from jhudata import OVERRIDES


def load(source, dbhost, dbport, dbname, dbuser, dbpw, clean, reload, skip_existing):
    with get_db_connection(dbhost, dbport, dbname, dbuser, dbpw) as conn:
        if clean:
            clear_all_data(conn)

        if os.path.isdir(source):
            load_all(conn, source, reload, skip_existing)
        elif os.path.isfile(source):
            load_file(conn, source, get_filedate(os.path.basename(source)), reload, skip_existing)
        else:
            print("Invalid source location")
            return False

        refresh_mv(conn)


def find_source_dir(jhu_dir):
    # For convenience - if we were passed the route of the JHU git structure, navigate to the right folder
    alternate_source = os.path.join(jhu_dir, "csse_covid_19_data")
    if os.path.isdir(alternate_source):
        jhu_dir = alternate_source

    alternate_source = os.path.join(jhu_dir, "csse_covid_19_daily_reports")
    if os.path.isdir(alternate_source):
        jhu_dir = alternate_source

    return jhu_dir


def load_all(db, source, reload, skip_existing):
    source = find_source_dir(source)

    print("Loading all files from " + source)
    count = 0

    for filename in sorted(os.listdir(source)):
        if filename.endswith(".csv"):
            load_file(db, os.path.join(source, filename), get_filedate(filename), reload, skip_existing)
            count += 1

    if count == 0:
        print("No files found to load")
    else:
        print("Loaded " + str(count) + " files")


def load_file(db, source, file_date, reload, skip_existing):
    if skip_existing and check_existing_data(db, file_date):
        print("Skipping " + source)
        return False

    print("Loading file " + source)
    if reload:
        clear_file_data(db, file_date)

    file = open(source, 'r', encoding="utf-8-sig")
    lines = file.readlines()

    # Which format?
    # 01-22-20 until 02-29-20 headers were Province/State,Country/Region,Last Update,Confirmed,Deaths,Recovered
    # 03-01-20 until 03-22-20 headers were Province/State,Country/Region,Last Update,Confirmed,Deaths,Recovered,Latitude,Longitude
    # 03-23-20 onward headers were FIPS,Admin2,Province_State,Country_Region,Last_Update,Lat,Long_,Confirmed,Deaths,Recovered,Active,Combined_Key
    header = lines[0].strip()
    lines.pop(0)
    if header == "Province/State,Country/Region,Last Update,Confirmed,Deaths,Recovered":
        parse_original_format(db, file_date, lines, False)

    elif header == "Province/State,Country/Region,Last Update,Confirmed,Deaths,Recovered,Latitude,Longitude":
        parse_original_format(db, file_date, lines, True)

    elif header == "FIPS,Admin2,Province_State,Country_Region,Last_Update,Lat,Long_,Confirmed,Deaths,Recovered,Active,Combined_Key":
        parse_county_format(db, file_date, lines)

    else:
        raise ValueError("Unrecognized header format: " + header)

    db.commit()


def get_filedate(filename):
    return filename[:10]


def parse_number(original):
    if original is None or original == '':
        return None

    try:
        return int(original)
    except ValueError:
        print("Silently converting \"" + original + "\" to None")
        return None


def parse_original_format(db, file_date, lines, has_coordinates):
    count = 1
    with db.cursor() as cursor:
        reader = csv.reader(lines, delimiter=',')
        all_data = []
        for row in reader:
            print(str(count) + " / " + str(len(lines)), end='\r')
            state = row[0]
            country = row[1]
            last_update = row[2]
            cases = row[3]
            deaths = row[4]
            recovered = row[5]
            if has_coordinates:
                lat = row[6]
                long = row[7]
            else:
                lat = None
                long = None

            all_data.append((file_date, None, country, state, None, lat, long, last_update, cases, deaths, recovered, None, None))
            count += 1
        print()
        insert_rows(cursor, all_data)


def parse_county_format(db, file_date, lines):
    count = 1
    all_data = []

    with db.cursor() as cursor:
        reader = csv.reader(lines, delimiter=',')
        for row in reader:
            print(str(count) + " / " + str(len(lines)), end='\r')
            fips = row[0]
            county = row[1]
            state = row[2]
            country = row[3]
            if country == 'US':
                if fips is None or fips == '':
                    if state in OVERRIDES:
                        state_overrides = OVERRIDES[state]
                        if county in state_overrides:
                            new_fips = state_overrides[county]
                            if new_fips is None or new_fips == '':
                                print()
                                print("Found override for county, but FIPS is still empty: " + state + "." + county)
                            else:
                                fips = new_fips
                        else:
                            print()
                            print("NO MATCHING FIPS: " + state + "." + county)
                    else:
                        print()
                        print("NO MATCHING FIPS: " + state + "." + county)

                elif len(fips) == 4:
                    # Sometimes fips is too short - because it wasn't
                    print()
                    print("Fixing incorrect FIPS code")
                    fips = '0' + fips

            last_update = row[4]
            lat = row[5]
            long = row[6]
            cases = row[7]
            deaths = row[8]
            recovered = row[9]
            active = row[10]
            combined_key = row[11]

            all_data.append((file_date, fips, country, state, county, lat, long, last_update, parse_number(cases),
                             parse_number(deaths), parse_number(recovered), parse_number(active), combined_key))
            count += 1
        print()
        insert_rows(cursor, all_data)


def get_db_connection(host, port, name, user, pw):
    return psycopg2.connect(dbname=name, port=port, user=user, host=host, password=pw)


def insert_rows(cursor, all_data):
    print("Inserting Data")
    extras.execute_values(
        cursor,
        "INSERT INTO covid19.jhu (file_date, fips, country, state, county, lat, long, last_update, cases, deaths, recovered, active, combined_key) VALUES %s",
        all_data)


def check_existing_data(db, file_date):
    with db.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM covid19.jhu WHERE file_date=%(file_date)s", {"file_date": file_date})
        count = cursor.fetchone()[0]
        return count > 0


def clear_all_data(db):
    with db.cursor() as cursor:
        # noinspection SqlWithoutWhere
        cursor.execute("DELETE FROM covid19.jhu")

    db.commit()
    print("Cleaned database")


def refresh_mv(db):
    with db.cursor() as cursor:
        print("Refreshing materialized view (JHU)")
        cursor.execute("REFRESH MATERIALIZED VIEW covid19.jhu_derived")
        print("Refreshing materialized view (Combined)")
        cursor.execute("REFRESH MATERIALIZED VIEW covid19.nyt_jhu_combined_derived")


def clear_file_data(db, file_date):
    with db.cursor() as cursor:
        cursor.execute("DELETE FROM covid19.jhu WHERE file_date=%s", (file_date,))

    db.commit()
    print("Removed data for " + file_date)


parser = argparse.ArgumentParser(description='Script to load JHU data into the database')
parser.add_argument("--source", required=True, type=str, help="Directory or single file to load")
parser.add_argument("--clean", action="store_true", help="If true, clears the data before loading")
parser.add_argument("--reload", action="store_true", help="If true, deletes any existing data that matches the file date")
parser.add_argument("--skip_existing", action="store_true", help="If true, skips files containing dates already in the DB")

args = parser.parse_args()

load(args.source, coronadb.host, coronadb.port, coronadb.database, coronadb.user, coronadb.password, args.clean, args.reload, args.skip_existing)
