import math
from datetime import datetime, timedelta

FIELDS = [
    {'name': 'area', 'position': 1, 'include_metadata': False, 'include_history': False},
    {'name': 'area_type', 'position': 2, 'include_metadata': False, 'include_history': False},
    {'name': 'population', 'position': 3, 'include_history': False},
    {'name': 'cases', 'position': 5, 'round_digits': 2},
    {'name': 'cases_per_10k_people', 'position': 6, 'round_digits': 2},
    {'name': 'deaths', 'position': 7, },
    # {'name': 'recovered', 'position': 8, },
    # {'name': 'active', 'position': 9, },
    {'name': 'increase', 'position': 10, },
    {'name': 'hospitals', 'position': 11, 'include_history': False},
    {'name': 'hospital_beds', 'position': 12, 'include_history': False},
    {'name': 'icu_beds', 'position': 13, 'include_history': False},
    {'name': 'cases_per_bed', 'position': 14, 'round_digits': 2},
    {'name': 'cases_per_icu_bed', 'position': 15, 'round_digits': 2},
    {'name': 'increase_per_10k_people', 'position': 16, 'round_digits': 3},
    {'name': 'deaths_increase', 'position': 17},
    {'name': 'deaths_per_10k_people', 'position': 18, 'round_digits': 3},
]
FILE_DATE_POSITION = 4


class DataTracker:

    def __init__(self, expected_current_date, expected_history_dates, metadata, area_id):
        self.expected_dates = []
        self.expected_dates.append(expected_current_date)
        for date in expected_history_dates:
            self.expected_dates.append(date)

        self.area_id = area_id
        self.metadata = metadata
        self.data = []

    def _extract_data_for_row(self, row, is_first):
        data = {}
        for field in FIELDS:
            name = field['name']
            if is_first or get_optional(field, 'include_history', True):
                value = row[field['position']]
                if value is not None and value != "":
                    round_digits = get_optional(field, 'round_digits')
                    if round_digits is not None:
                        data[name] = round(value, round_digits)
                    else:
                        data[name] = value
                    if get_optional(field, 'include_metadata', True):
                        if name not in self.metadata:
                            self.metadata[name] = {'min': 0, 'max': 0}

                        if value < self.metadata[name]['min']:
                            self.metadata[name]['min'] = value
                        if value > self.metadata[name]['max']:
                            self.metadata[name]['max'] = value

        return data

    def _find_position_for_date(self, file_date):
        for position in range(0, len(self.expected_dates)):
            if file_date == self.expected_dates[position]:
                return position
            elif file_date > self.expected_dates[position]:
                print("Mismatch of dates")
                return None

        print("Mismatch of dates-not found")
        return None

    def add_data_row(self, row):
        file_date = row[FILE_DATE_POSITION].strftime('%Y-%m-%d')
        if self.metadata['last_file_date'] is None or file_date > self.metadata['last_file_date']:
            self.metadata['last_file_date'] = file_date

        data_for_row = self._extract_data_for_row(row, len(self.data) == 0)
        target_position = self._find_position_for_date(file_date)

        while target_position >= len(self.data):
            self.data.append(data_for_row)

    def to_properties(self):
        properties = {'id': self.area_id}
        doubling_data = self._calculate_doubling_rates()

        for field in FIELDS:
            name = field['name']
            if len(self.data) > 0 and name in self.data[0]:
                properties[name] = self.data[0][name]

        for field in FIELDS:
            name = field['name']
            include_history = get_optional(field, 'include_history', True)
            if include_history:
                history = []
                stop = False
                for position in range(1, len(self.data)):
                    if not stop:
                        if name in self.data[position]:
                            history.append(self.data[position][name])
                        else:
                            stop = True
                if len(history) > 0:
                    properties[name + '_history'] = history

        if doubling_data is not None and len(doubling_data) > 0:
            properties['doubling'] = doubling_data[0]
            if len(doubling_data) > 1:
                properties['doubling_history'] = doubling_data[1:len(doubling_data)]

        return properties

    def _calculate_doubling_rates(self):
        # Calculate growth rate as # days the number is doubling over the last week
        # growth rate = (log(cases) - log(cases 7 days ago)/log(2)  ---- # of doubling in the last week
        # doubling = 7/growth rate (# of days to double)
        # Like NYT, only calculate when we have 7 days of data and cases > 20
        doubling_rates = []
        for position in range(0, len(self.data)):
            position_1week_back = self._get_index_1week_back(position)
            if position_1week_back is None or position_1week_back >= len(self.data):
                # Stop and return what we have
                return doubling_rates
            else:
                cases_current = self.data[position]['cases']
                cases_1week = self.data[position_1week_back]['cases']
                if cases_current < 20 or cases_1week == 0:
                    # Stop and return what we have
                    return doubling_rates
                else:
                    growth_rate_1wk = (math.log(cases_current) - math.log(cases_1week)) / math.log(2)
                    doubling = 7 / growth_rate_1wk
                    doubling_rates.append(round(doubling, 1))

        return doubling_rates

    def _get_index_1week_back(self, current_position):
        current_date = datetime.strptime(self.expected_dates[current_position], '%Y-%m-%d')
        target_date = (current_date - timedelta(days=7)).strftime('%Y-%m-%d')
        for position in range(current_position, len(self.expected_dates)):
            if self.expected_dates[position] == target_date:
                return position

        return None


def get_optional(obj, prop, default_value=None):
    if prop in obj:
        return obj[prop]
    else:
        return default_value
