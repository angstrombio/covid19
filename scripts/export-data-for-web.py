import pygeoj
import psycopg2
import coronadb
import argparse
import json
import os


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


def load(areas_geojsonfile, output_folder, overwrite):
    """
        Loads our data into the appropriate GeoJSON file
    """
    # Use defaults if not specified
    if areas_geojsonfile is None or areas_geojsonfile == "":
        areas_geojsonfile = "../input-data/areas.geojson"
    if output_folder is None or output_folder == "":
        output_folder = '../docs/data'

    metadata = {
        "last_file_date": None,
        "file_date_history": None,
        "cases": {"min": 0, "max": 0},
        "cases_per_10k_people": {"min": 0.0, "max": 0.0},
        "deaths": {"min": 0, "max": 0},
        "cases_per_bed": {"min": 0, "max": 0},
        "cases_per_icu_bed": {"min": 0, "max": 0},
        "population": {"min": 999999, "max": 0},
        "increase": {"min": 0, "max": 0},
        "increase_per_10k_people": {"min": 0, "max": 0}
    }

    with psycopg2.connect(dbname=coronadb.database, port=coronadb.port, user=coronadb.user, host=coronadb.host,
                          password=coronadb.password) as db:

        file_date = get_file_date(db)
        print("Exporting data for " + file_date)
        output_geojsonfile = os.path.join(output_folder, file_date + '-cases-healthcare-history.geojson')
        stateoutput_geojsonfile = os.path.join(output_folder, 'states.geojson')
        output_metadatafile = os.path.join(output_folder, 'metadata.json')

        if not overwrite and os.path.exists(output_geojsonfile):
            print("ERROR: File exists, overwrite not specified")
            return False

        geo_features = pygeoj.load(filepath=areas_geojsonfile)
        areas = pygeoj.new()
        areas.define_crs('name', name='name": "urn:ogc:def:crs:EPSG::4269')
        state_outlines = pygeoj.new()
        state_outlines.define_crs('name', name='name": "urn:ogc:def:crs:EPSG::4269')

        total = len(geo_features)
        count = 1
        for feature in geo_features:
            print(str(count) + " / " + str(total), end='\r')
            area_id = feature.properties['GEOID']
            use_type = feature.properties['USE']
            if use_type is not None and use_type == 'STATE_OUTLINE':
                state_outlines.add_feature(feature)
            else:
                areas.add_feature(load_data_into_feature(db, metadata, feature, area_id))
            count = count + 1

        print("Saving Export File")
        areas.save(output_geojsonfile)
        state_outlines.save(stateoutput_geojsonfile)

        print("Saving Metadata")
        with open(output_metadatafile, "w") as metadata_file:
            json.dump(metadata, metadata_file)


def get_file_date(db):
    with db.cursor() as cursor:
        cursor.execute("SELECT MAX(file_date) FROM covid19.jhu")
        result = cursor.fetchone()
        if result is None:
            return None
        else:
            file_date = result[0]
            return file_date.strftime('%Y-%m-%d')


def load_data_into_feature(db, metadata, feature, area_id):
    with db.cursor() as cursor:
        cursor.execute("""SELECT GEOID, area_name, area_type, population,
                file_date, cases, cases_per_10k_people, deaths, recovered, active,
                increase_yesterday, num_hospitals, staffed_beds, icu_beds,  
                cases_per_staffed_bed, cases_per_icu_bed, increase_per_10k_people
                FROM covid19.cases_and_healthcare_historical_combined WHERE geoid=%s""",
                       (area_id,))

        result = cursor.fetchone()
        # Note that the GeoJSON file has regions for PR and other US terriotiries, which we don't have any data for, so we skip them here
        if result is not None:
            # We are going to recreate the properties for each feature (metro area) in our GeoJSON file - we don't really want any
            # of the original properties, and will instead fill in information we loaded from the DB
            feature.properties = {"id": area_id, "area": result[1], "area_type": result[2]}
            file_date = result[4].strftime('%Y-%m-%d')
            if metadata['last_file_date'] is None or file_date > metadata['last_file_date']:
                metadata['last_file_date'] = file_date

            set_property(metadata, feature.properties, "population", result[3])
            cases_today = result[5]
            set_property(metadata, feature.properties, "cases", cases_today)

            set_property(metadata, feature.properties, "cases_per_10k_people", result[6], round_digits=2)
            set_property(metadata, feature.properties, "deaths", result[7])
            # set_property(feature.properties, "recovered", result[8])
            # set_property(feature.properties, "active", result[9])
            set_property(metadata, feature.properties, "increase", result[10])
            set_property(metadata, feature.properties, "hospitals", result[11])
            set_property(metadata, feature.properties, "hospital_beds", result[12])
            set_property(metadata, feature.properties, "icu_beds", result[13])
            set_property(metadata, feature.properties, "cases_per_bed", result[14], round_digits=2)
            set_property(metadata, feature.properties, "cases_per_icu_bed", result[15], round_digits=2)
            set_property(metadata, feature.properties, "increase_per_10k_people", result[16], round_digits=3)

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
                append_history(True, date_history, result[4], date_format='%Y-%m-%d')
                cases_history.append(result[5])
                if result[5] > 0:
                    num_days_with_cases += 1
                continue_per_capita = append_history(continue_per_capita, cases_per_10k_people_history, result[6], round_digits=2)
                continue_deaths = append_history(continue_deaths, deaths_history, result[7])
                continue_increase = append_history(continue_increase, increase_history, result[10])
                continue_per_icu = append_history(continue_per_icu, cases_per_icu_bed_history, result[15], round_digits=2)
                contineu_increase_per_capita = append_history(contineu_increase_per_capita, increase_per_10k_people_history, result[16], round_digits=3)

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

    return feature


# Main part of the script: just examine/verify command line and invoke our loader
parser = argparse.ArgumentParser(description='Script to load data from the database to GeoJSON for the web')
parser.add_argument("--input", type=str, help="MSA GeoJSON File to load")
parser.add_argument("--outfolder", type=str, help="Output folder to write data and metadata")
parser.add_argument("--overwrite", action='store_true', help='Whether to overwrite an existing file for the date being exported')
args = parser.parse_args()
load(args.input, args.outfolder, args.overwrite)
