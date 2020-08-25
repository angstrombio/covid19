import argparse
import os
import csv
import psycopg2
from psycopg2 import extras
import coronadb


FIPS_OVERRIDE = {
    "Missouri":
        {
            "Kansas City": "29095",
        },
    "New York":
        {
            "New York City": "36061"
        }
}


def load(source, clean, reload):
    with get_db_connection(coronadb.host, coronadb.port, coronadb.database, coronadb.user, coronadb.password) as conn:
        if clean:
            clear_all_data(conn)

        if os.path.isfile(source):
            load_file(conn, source, clean, reload)
        else:
            print("Invalid source location")
            return False


def read_last_line(filename):
    with open(filename, 'rb') as f:
        f.seek(-2, os.SEEK_END)
        while f.read(1) != b'\n':
            f.seek(-2, os.SEEK_CUR)
        return f.readline().decode()


def load_file(db, source, clean, reload):
    file_date = None
    if not clean:
        last_line = read_last_line(source)
        file_date = last_line[0:last_line.find(',')]
        print('File Date ' + file_date)
        if data_exists_for_date(db, file_date):
            if reload:
                print("Removing existing data for this date")
                remove_data_for_date(db, file_date)
            else:
                print('Data already loading for this date')
                return False

    file = open(source, 'r', encoding="utf-8-sig")
    lines = file.readlines()

    header = lines[0].strip()
    lines.pop(0)
    if header == 'date,county,state,fips,cases,deaths':
        parse_counties(db, file_date, lines)

    else:
        raise ValueError("Unrecognized header format: " + header)

    db.commit()



def parse_number(original):
    if original is None or original == '':
        return None

    try:
        return int(original)
    except ValueError:
        print("Silently converting \"" + original + "\" to None")
        return None


def parse_counties(db, file_date, lines):
    count = 1
    all_data = []

    with db.cursor() as cursor:
        reader = csv.reader(lines, delimiter=',')
        for row in reader:
            print(str(count) + " / " + str(len(lines)), end='\r')

            date = row[0]
            county_name = row[1]
            state = row[2]
            fips = row[3]
            cases = row[4]
            deaths = row[5]

            if state in FIPS_OVERRIDE:
                if county_name in FIPS_OVERRIDE[state]:
                    fips = FIPS_OVERRIDE[state][county_name]

            if file_date is None or file_date == date:
                all_data.append((date, county_name, state, fips, parse_number(cases), parse_number(deaths)))
            count += 1
        print()
        insert_rows(cursor, all_data)


def get_db_connection(host, port, name, user, pw):
    return psycopg2.connect(dbname=name, port=port, user=user, host=host, password=pw)


def insert_rows(cursor, all_data):
    print("Inserting Data (" + str(len(all_data)) + " rows)")
    extras.execute_values(
        cursor,
        "INSERT INTO covid19.nyt (file_date, county_name, state_name, fips, cases, deaths) VALUES %s",
        all_data)


def check_existing_data(db, file_date):
    with db.cursor() as cursor:
        cursor.execute("SELECT COUNT(*) FROM covid19.nyt WHERE file_date=%s", file_date)
        count = cursor.fetchone()[0]
        return count > 0


def clear_all_data(db):
    with db.cursor() as cursor:
        # noinspection SqlWithoutWhere
        cursor.execute("DELETE FROM covid19.nyt")

    db.commit()
    print("Cleaned database")


def remove_data_for_date(db, file_date):
    with db.cursor() as cursor:
        cursor.execute("DELETE FROM covid19.nyt WHERE file_date=%s", (file_date,))

    db.commit()
    print("Removed data for " + file_date)


def data_exists_for_date(db, file_date):
    with db.cursor() as cursor:
        cursor.execte("SELECT count(*) FROM covid19.nyt WHERE file_date=%s", (file_date,))
        row = cursor.fetchone()
        return row is None or row[0] == 0


parser = argparse.ArgumentParser(description='Script to load JHU data into the database')
parser.add_argument("--source", required=True, type=str, help="Directory or single file to load")
parser.add_argument("--clean", action="store_true", help="If true, clears the data before loading")
parser.add_argument("--reload", action="store_true", help="If true, deletes any existing data that matches the file date")

args = parser.parse_args()

load(args.source, args.clean, args.reload)
