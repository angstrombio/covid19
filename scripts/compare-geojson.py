import pygeoj
from sys import argv


def match(file1_features, file2_features, label_for_file1, label_for_file2, show_diffs):
    num_without_id = 0
    num_not_matched = 0
    num_diff = 0
    num_ok = 0

    for feature1 in file1_features:
        id1 = None
        if 'id' not in feature1.properties:
            if 'GEOID' in feature1.properties:
                id1 = feature1.properties['GEOID']
            else:
                print(label_for_file1 + ': Found feature with no ID')
                for prop in feature1.properties:
                    print('\t1[' + prop + ']="' + str(feature1.properties[prop]) + '"')
                num_without_id += 1
        else:
            id1 = feature1.properties['id']

        if id1 is not None:
            matched_feature2 = None
            for feature2 in file2_features:
                id2 = None
                if 'id' in feature2.properties:
                    id2 = feature2.properties['id']
                elif 'GEOID' in feature2.properties:
                    id2 = feature2.properties['GEOID']

                if id2 is not None and id1 == id2:
                    matched_feature2 = feature2

            if matched_feature2 is None:
                print(label_for_file1 + ': feature with id ' + id1 + ' not in ' + label_for_file2)
                num_not_matched += 1

            elif show_diffs:
                if diff(feature1, matched_feature2, label_for_file1, label_for_file2, id1):
                    num_diff += 1
                else:
                    num_ok += 1
            else:
                num_ok += 1

    return num_without_id, num_not_matched, num_diff, num_ok


def print_diff_header(already_has_differences, file_label, areaid):
    if not already_has_differences:
        print(file_label + ': Diff[id=' + areaid + ']:')


def diff(feature1, feature2, label_for_file1, label_for_file2, areaid):
    has_differences = False
    for prop in feature1.properties:
        if prop not in feature2.properties:
            if prop != 'date_history' and (not prop.endswith('_history') or len(feature1.properties[prop]) > 0):
                print_diff_header(has_differences, label_for_file1, areaid)
                has_differences = True
                print('\tMissing from ' + label_for_file2 + ': ' + prop)
        elif feature1.properties[prop] != feature2.properties[prop]:
            if not prop.endswith('_history'):
                print_diff_header(has_differences, label_for_file1, areaid)
                has_differences = True
                print('\tProperty Difference: ' + prop + '[' + label_for_file1 + ']="' + str(
                    feature1.properties[prop]) + '", [' + label_for_file2 + ']="' + str(feature2.properties[prop]) + '"')

    for prop in feature2.properties:
        if prop not in feature1.properties:
            if prop != 'date_history':
                print_diff_header(has_differences, label_for_file1, areaid)
                has_differences = True
                print('\tMissing from ' + label_for_file1 + ': ' + prop)

    return has_differences


def diff_geojson(file1, file2):
    # file1 = '/Users/jfeldman/projects/covid19-clean-copy/docs/data/2020-04-06-cases-healthcare-history.geojson'
    # file2 = '/Users/jfeldman/projects/covid19/docs/data/2020-04-06-cases-healthcare-history.geojson'

    file1_geojson = pygeoj.load(filepath=file1)
    file2_geojson = pygeoj.load(filepath=file2)

    num1_without_id, num1_notin_2, num_diff, num_ok = match(file1_geojson, file2_geojson, '1', '2', True)
    num2_without_id, num2_notin_1, x, y = match(file2_geojson, file1_geojson, '2', '1', False)
    print(str(num1_without_id) + ' had no ID in 1')
    print(str(num2_without_id) + ' had no ID in 2')
    print(str(num1_notin_2) + ' features in 1 not in 2')
    print(str(num2_notin_1) + ' features in 2 not in 1')
    print(str(num_diff) + ' matched but were different')
    print(str(num_ok) + ' matched completely')


if len(argv) < 3:
    print("USAGE: python compare-geojson.py <path_to_file1> <path_to_file2>")
else:
    diff_geojson(argv[1], argv[2])
