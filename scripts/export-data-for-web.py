import pygeoj
import psycopg2
import coronadb
import argparse
import json
import os
from data import DataTracker


MAX_HISTORY = 300


def export_data(areas_geojsonfile, output_folder, overwrite):
    """
        Exports our data into the appropriate GeoJSON file
    """
    # Use defaults if not specified
    if areas_geojsonfile is None or areas_geojsonfile == "":
        areas_geojsonfile = "../input-data/areas.geojson"
    if output_folder is None or output_folder == "":
        output_folder = '../docs/data'

    with psycopg2.connect(dbname=coronadb.database, port=coronadb.port, user=coronadb.user, host=coronadb.host,
                          password=coronadb.password) as db:

        metadata = {
            "last_file_date": None,
            "file_date_history": None,
        }

        file_date, history_dates, all_dates_str = get_file_dates(db, metadata)
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

        all_data = {}
        count = 1
        with db.cursor() as cursor:
            cursor.execute("""SELECT GEOID, area_name, area_type, population,
                    file_date, cases, deaths, num_hospitals, staffed_beds, icu_beds
                    FROM covid19.cases_and_healthcare_historical_combined_simple WHERE file_date in (""" + all_dates_str + """) 
                     ORDER BY GEOID, file_date DESC""")


            for row in cursor.fetchall():
                print(count, end='\r')
                area_id = row[0]
                if area_id in all_data:
                    data = all_data[area_id]
                else:
                    data = DataTracker(file_date, history_dates, area_id, metadata)
                    all_data[area_id] = data

                data.add_data_row(row)
                count += 1
            print()

        print("Processing GeoJSON")
        total = len(geo_features)
        count = 1
        for feature in geo_features:
            print(str(count) + " / " + str(total), end='\r')
            area_id = feature.properties['GEOID']
            use_type = feature.properties['USE']
            if use_type is not None and use_type == 'STATE_OUTLINE':
                state_outlines.add_feature(feature)
            else:
                if area_id in all_data:
                    data = all_data[area_id]
                    feature.properties = data.to_properties()
                else:
                    feature.properties = {'id': area_id, 'name': feature.properties['NAME']}

                areas.add_feature(feature)

            count = count + 1

        print("Saving Export File")
        areas.save(output_geojsonfile)
        state_outlines.save(stateoutput_geojsonfile)

        print("Saving Metadata")
        with open(output_metadatafile, "w") as metadata_file:
            json.dump(metadata, metadata_file)


def get_file_dates(db, metadata):
    with db.cursor() as cursor:
        cursor.execute("SELECT DISTINCT file_date FROM covid19.cases_and_healthcare_historical_combined_simple ORDER BY file_date DESC")
        rows = cursor.fetchall()
        if rows is None:
            return None

        current_date = None
        date_history = []
        all_dates_str = ''

        for row in rows:
            file_date = row[0].strftime('%Y-%m-%d')

            if current_date is None:
                current_date = file_date
            else:
                date_history.append(file_date)
                all_dates_str += ', '

            all_dates_str += '\'' + file_date + '\''

        # TODO: Select dates, not just most recent
        if len(date_history) > MAX_HISTORY:
            date_history = date_history[0:MAX_HISTORY]

        metadata['last_file_date'] = current_date
        metadata['file_date_history'] = date_history

        return current_date, date_history, all_dates_str


# Main part of the script: just examine/verify command line and invoke our loader
parser = argparse.ArgumentParser(description='Script to load data from the database to GeoJSON for the web')
parser.add_argument("--input", type=str, help="MSA GeoJSON File to load")
parser.add_argument("--outfolder", type=str, help="Output folder to write data and metadata")
parser.add_argument("--overwrite", action='store_true', help='Whether to overwrite an existing file for the date being exported')
args = parser.parse_args()
export_data(args.input, args.outfolder, args.overwrite)
