from datetime import datetime, timedelta

FIELDS = [
    {'name': 'area', 'position': 1, 'include_metadata': False, 'include_history': False},
    {'name': 'area_type', 'position': 2, 'include_metadata': False, 'include_history': False},
    {'name': 'population', 'position': 3, 'include_history': False},
    {'name': 'cases', 'position': 5, 'round_digits': 2},
    {'name': 'deaths', 'position': 6, },
    {'name': 'hospitals', 'position': 7, 'include_history': False},
    {'name': 'hospital_beds', 'position': 8, 'include_history': False},
    {'name': 'icu_beds', 'position': 9, 'include_history': False},
]

DERIVED_METADATA_FIELDS = [
    'cases_per_bed', 'cases_per_icu_bed', 'cases_per_10k_people', 'increase', 'increase_per_10k_people',
    'deaths_increase', 'deaths_per_10k_people', 'deaths_per_case']

FILE_DATE_POSITION = 4

class DataTracker:

    def __init__(self, expected_current_date, expected_history_dates, area_id, base_metadata):
        self.expected_dates = []
        self.expected_dates.append(expected_current_date)
        for date in expected_history_dates:
            self.expected_dates.append(date)

        self.area_id = area_id
        self.metadata = base_metadata

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
        self.update_metadata()
        daily_new_rate_change = self._calculate_daily_new_rate_change()

        for field in FIELDS:
            name = field['name']
            if not get_optional(field, 'metadata_only', False):
                if len(self.data) > 0 and name in self.data[0]:
                    properties[name] = self.data[0][name]

        for field in FIELDS:
            name = field['name']
            include_history = get_optional(field, 'include_history', True)
            metadata_only = get_optional(field, 'metadata_only', False)
            if include_history and not metadata_only:
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

        if daily_new_rate_change is not None and len(daily_new_rate_change) > 0:
            properties['new_rate_change'] = daily_new_rate_change[0]
            if len(daily_new_rate_change) > 1:
                properties['new_rate_change_history'] = daily_new_rate_change[1:len(daily_new_rate_change)]

        return properties

    def _extract_first_day_field_from_row_if_exists(self, row, field):
        if len(row) > 0:
            return self._extract_field_from_day_if_exists(row[0], field)
        else:
            return 0

    def _extract_field_from_day_if_exists(self, day, field):
        if field in day:
            return day[field]
        else:
            return 0

    def _add_derived_ratio(self, derived, field, numerator, denominator):
        if numerator > 0 and denominator > 0:
            derived[field] = numerator / denominator

    def update_metadata(self):
        # Add the derived metadata as needed

        # Single data points we need
        num_beds = self._extract_first_day_field_from_row_if_exists(self.data, 'hospital_beds')
        num_icu_beds = self._extract_first_day_field_from_row_if_exists(self.data, 'icu_beds')
        population = self._extract_first_day_field_from_row_if_exists(self.data, 'population')
        pop_10k = population / 10000

        prior_cases = 0
        prior_deaths = 0

        # Reverse order to make calculating increases easy
        for data_day in self.data[::-1]:
            cases = self._extract_field_from_day_if_exists(data_day, 'cases')
            if cases < 0:
                cases = 0
            deaths = self._extract_field_from_day_if_exists(data_day, 'deaths')
            if deaths < 0:
                deaths = 0
            cases_minus_deaths = cases - deaths
            if cases_minus_deaths < 0:
                cases_minus_deaths = 0

            increase = cases - prior_cases
            # For metadata, don't save negative increases
            if increase < 0:
                increase = 0
            # We actually want to save increase for use in other calculations
            data_day['increase'] = increase

            deaths_increase = deaths - prior_deaths
            if deaths_increase < 0:
                deaths_increase = 0
            derived = {}
            derived['increase'] = increase

            derived['deaths_increase'] = deaths_increase
            self._add_derived_ratio(derived, 'cases_per_bed', cases_minus_deaths, num_beds)
            self._add_derived_ratio(derived, 'cases_per_icu_bed', cases_minus_deaths, num_icu_beds)
            self._add_derived_ratio(derived, 'cases_per_10k_people', cases, pop_10k)
            self._add_derived_ratio(derived, 'increase_per_10k_people', increase, pop_10k)
            self._add_derived_ratio(derived, 'deaths_per_10k_people', deaths, pop_10k)
            if cases >= 20:
                self._add_derived_ratio(derived, 'deaths_per_case', deaths, cases)

            prior_cases = cases
            prior_deaths = deaths

            # Now update metadata
            for field in DERIVED_METADATA_FIELDS:
                if field not in self.metadata:
                    self.metadata[field] = {'min': 0, 'max': 0}
                if field in derived:
                    current = derived[field]
                    if current < self.metadata[field]['min']:
                        self.metadata[field]['min'] = current
                    if current > self.metadata[field]['max']:
                        self.metadata[field]['max'] = current




    def _calculate_daily_new_rate_change(self):
        # Calculate the average daily new cases over the last 7 days,
        # then over the 7 days before that, and calculate the rate of change
        rate_changes = []
        for position in range(0, len(self.data)):
            position_1week_back = self._get_index_1week_back(position)
            if position_1week_back is None or position_1week_back >= len(self.data):
                # not enough data
                return rate_changes
            position_2weeks_back = self._get_index_1week_back(position_1week_back)
            if position_2weeks_back is None or position_2weeks_back >= len(self.data):
                # not enough data, but we'll mark this as +100%
                rate_changes.append(1.00)
                return rate_changes
            current_avg = self._calculate_average_new_cases(position, position_1week_back-1, )
            prior_avg = self._calculate_average_new_cases(position_1week_back, position_2weeks_back-1)
            if prior_avg is None or current_avg is None or prior_avg < 1:
                # not enough data
                return rate_changes

            rate_change = round((current_avg / prior_avg) - 1, 2)
            rate_changes.append(rate_change)
        return rate_changes

    def _calculate_average_new_cases(self, range_start, range_end):
        count = 0
        total = 0
        for position in range(range_start, range_end+1):
            count += 1
            increase = self.data[position]['increase']
            total += increase

        if count > 0:
            return total / count
        else:
            return None

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



