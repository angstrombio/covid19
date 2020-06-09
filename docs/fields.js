/**
 * Classes and methods relating to data fields we display on the map and in
 * related controls.
 */

/**
 * Definition of a data field we will be using.
 *
 * Data fields may be static (e.g. in the source data) or dynamically calculated.  Instances of
 * this class will hold metadata and related information for accessing, displaying and formatting
 * the data.
 */
class Field {
    /**
     * Defines a new field.
     *
     * @param fieldId   The identifier for the field.
     * @param label     The display label for the field.
     */
    constructor(fieldId, label) {
        this.fieldId = fieldId;
        this.label = label;
        this.logScaleColors = true;
        this.format = null;
        this.hasHistory = true;
        this.calculateDataFunction = null;
        this.sortAscending = true;
        this.forceColorMin = this.forceColorMax = null;
        this.dataMin = null;
        this.dataMax = null;
        this.colorInterpolator = null;
        this.legendFormat = null;
        this.text = false;
        this.useRawValuesForInterpolator = false;
        this.legendValuesFunction = null;
        this.useWideLegend = false;
    }

    /**
     * Builder method to define information about the color scheme used for this field.
     *
     * @param colorInterpolator A color interpolator function (e.g. d3.interpolateReds) to apply for this field.
     * @param logScaleColors    Specifies whether we will apply the color gradient on a log scale (defaults to true).
     * @param forceColorMin     Specifies a value to use at the minimum color, rather than 0.  Optional; defaults to not defined.
     * @param forceColorMax     Specifies a value to use at the maximum color, rather than the data max.  Optional; defaults to not defined.
     * @param useRawValuesForInterpolator   Specifies to use raw values (rather than a percent of range) to pass to the color interpolator
     */
    setColorScheme(colorInterpolator, logScaleColors = true, forceColorMin = null, forceColorMax = null, useRawValuesForInterpolator = false) {
        this.colorInterpolator = colorInterpolator;
        this.logScaleColors = logScaleColors;
        this.forceColorMin = forceColorMin;
        this.forceColorMax = forceColorMax;
        this.useRawValuesForInterpolator = useRawValuesForInterpolator;
        return this;
    }

    /**
     * Builder method to define an integer format for this field.  Data will be displayed with a
     * thousands-separator and no decimal places.
     */
    setIntFormat(includeSign = false) {
        this.format = (includeSign ? '+' : '') + ',d';
        return this;
    }

    /**
     * Builder method to define a float format for this field.  Data will be displayed with
     * the specified number of decimal places.
     *
     * @param numDigits The number of decimal places to display.  Optional; defaults to 2.
     */
    setFloatFormat(numDigits = 2) {
        this.format = '.' + numDigits + 'f';
        return this;
    }

    setPercentFormat(numDigits = 0, includeSign = false) {
        this.format = (includeSign ? '+' : '') + '.' + numDigits + '%';
        return this;
    }

    /**
     * Builder method to define a text format for this field.
     */
    setTextFormat() {
        this.format = null;
        this.text = true;
        return this.setNoHistory();
    }

    /**
     * Builder method to define the sort behavior for this field.
     *
     * @param value If true, specifies to sort ascending.
     */
    setSortAscending(value) {
        this.sortAscending = value;
        return this;
    }

    /**
     * Builder method to define that this field has no history.
     */
    setNoHistory() {
        this.hasHistory = false;
        return this;
    }

    /**
     * Builder method to define a custom calculation for data in this field, based on calculating
     * an increase to the prior day for a different field.
     *
     * @param field The underlying field to examine.
     */
    setIncreaseDataFunction(field) {
        this.calculateDataFunction = function(data, offset) {
            let today = field.getFieldValue(data, offset);
            let yesterday = field.getFieldValue(data, offset-1);
            if (today != null && today > 0) {
                if (yesterday != null && yesterday > 0) {
                    return today - yesterday;
                }
                return today;
            }
            return null;
        };
        return this;
    }

    /**
     * Builder method to define a custom calculation for data in this field, based on calculating
     * a ratio between two other fields
     *
     * @param numeratorField    The field to use as the numerator of the ratio.
     * @param denominatorField  The field to use as the denominator of the ratio.
     * @param per10k            Specifies that this ratio is "per 10,000", so the denominator should be divided by 10000.  Optional; defaults to false.
     * @param requireDenominatorGreaterThan Specifies that the ratio should not be calculated if the denominator is not greater than the defined value.  Optional; defaults to zero.
     */
    setRatioDataFunction(numeratorField, denominatorField, per10k = false, requireDenominatorGreaterThan = 0) {
        this.calculateDataFunction = function (data, offset) {
            let denominator = denominatorField.getFieldValue(data, offset);
            let numerator = numeratorField.getFieldValue(data, offset);
            if (numerator != null && denominator != null && denominator > requireDenominatorGreaterThan) {

                if (per10k) {
                    denominator = denominator / 10000;
                }
                return numerator / denominator;
            }
            return null;
        };
        return this;
    }

    /**
     * Builder method to define a formatting function to use for the data displayed in the legend.
     *
     * @param fmt   The format to use.
     */
    setLegendFormat(fmt) {
        this.legendFormat = fmt;
        return this;
    }

    /**
     * Retrieves the identifier for this field.
     */
    getFieldId() {
        return this.fieldId;
    }

    /**
     * Retrieves this field's label.
     */
    getLabel() {
        return this.label;
    }

    /**
     * Retrieves the value of this field within a dataset.
     *
     * @param data          The dataset to examine.
     * @param dayOffset     Optional offset (typically negative) to a different day than the current selected.  Defaults to 0.
     */
    getFieldValue(data, dayOffset = 0) {
        if (this.calculateDataFunction != null) {
            return this.calculateDataFunction(data, dayOffset);
        }
        let historyIndex = MapOptions.historyIndex - dayOffset;
        if (historyIndex >= 0 && this.hasHistory) {
            let history = data.properties[this.fieldId + "_history"];
            if (history == null) {
                return null;
            }
            if (historyIndex >= history.length) {
                return null;
            }
            return history[historyIndex];
        }
        return data.properties[this.fieldId];
    }

    /**
     * Retrieves the value of this field in the dataset and formats it for display.
     *
     * @param data          The dataset to examine.
     */
    getFormattedFieldValue(data) {
        let value = this.getFieldValue(data);
        if (value != null && this.format != null) {
            value = d3.format(this.format)(value);
        } else if (value == null) {
            value = '';
        }
        return value;
    }

    /**
     * Retrieves a function that maps values to colors for this field.
     */
    getColorMapFunction(colorForNoValue = '#ffffff', valueRetrievalFunction = null) {
        if (this.colorInterpolator == null) {
            return null;
        }
        let field = this;
        if (valueRetrievalFunction == null) {
            valueRetrievalFunction = function(d) {
                return field.getFieldValue(d);
            }
        }
        let interpolator = this.colorInterpolator;
        if (this.useRawValuesForInterpolator) {
            return function(d) {
                let value = field.getFieldValue(d);
                if (value == null || value == 0) {
                    return colorForNoValue;
                } else {
                    return interpolator(value);
                }
            }
        }
        let logFunction = null;
        if (this.logScaleColors) {
            logFunction = function(value) {
                return Math.log(value+1);
            };
        }
        let min = (this.forceColorMin == null) ? 0 : this.forceColorMin;
        let max = (this.forceColorMax == null) ? this.dataMax : this.forceColorMax;
        if (logFunction != null) {
            if (min > 1) {
                min = logFunction(min)
            }
            max = logFunction(max)
        }
        return function(d, i) {
            let value = valueRetrievalFunction(d, i);
            if (value == null || value == 0) {
                return colorForNoValue;
            } else {
                if (logFunction != null) {
                    if (value <= 0) {
                        value = min;
                    } else {
                        value = logFunction(value);
                    }
                }
                let pct;
                if (value <= min) {
                    pct = 0.0;
                } else if (value >= max) {
                    pct = 1.0;
                } else {
                    pct = (value - min) / (max - min);
                }
                return interpolator(pct);
            }
        }
    }

    /**
     * Retrieves the maximum value to use for the legend.
     */
    getLegendMax() {
        if (this.forceColorMax != null) {
            return this.forceColorMax;
        }
        return this.dataMax;
    }

    getDataMax() {
        return this.dataMax;
    }

    /**
     * Retrieves a function that can calculate colors for the legend.
     *
     * @param width Width (number of color data points) of the legend.
     */
    getLegendColorFunction(width) {
        let interpolator = this.colorInterpolator;
        let useRawValues = this.useRawValuesForInterpolator;
        let colorMin = (this.forceColorMin == null) ? 0 : this.forceColorMin;
        let colorMax = this.getLegendMax();
        let rangeMin = (useRawValues ? this.forceColorMin : 0);
        let rangeMax = colorMax;


        let logFunction = null;
        if (this.logScaleColors) {
            logFunction = function(v) {
                return Math.log(v+1);
            };
            if (colorMin > 1) {
                colorMin = logFunction(colorMin);
            }
            colorMax = logFunction(colorMax);
        }
        return function(d) {
            let value = (d/width * (rangeMax - rangeMin)) + rangeMin;
            if (logFunction != null) {
                value = logFunction(value);
            }
            let pct;
            if (useRawValues) {
                pct = value;
            } else if (value < colorMin) {
                pct = 0;
            } else if (value > colorMax) {
                pct = 1;
            } else {
                pct = (value - colorMin)/(colorMax - colorMin);
            }
            return interpolator(pct);
        };
    }

    /**
     * Retrieves a numeric format to use for the legend.
     */
    getLegendFormat() {
        if (this.legendFormat == null) {
            return ',d';
        } else {
            return this.legendFormat;
        }
    }

    /**
     * Retrieves information on whether this field is sorted ascending.
     */
    getSortAscending() {
        return this.sortAscending;
    }

    /**
     * Determines if this field holds text values.
     */
    isText() {
        return this.text;
    }

    setLegendValuesFunction(f) {
        this.legendValuesFunction = f;
        return this;
    }

    getLegendValuesFunction() {
        return this.legendValuesFunction;
    }

    getUseWideLegend() {
        return this.useWideLegend;
    }

    setUseWideLegend(value) {
        this.useWideLegend = value;
        return this;
    }

    setMetadata(dataMinValue, dataMaxValue) {
        this.dataMin = dataMinValue;
        this.dataMax = dataMaxValue;
        return this;
    }
}

/**
 * Holds all of the defined fields for use throughout the system.
 */
FieldDetails = {
    area: new Field('area',"Region").setTextFormat(),
    area_type: new Field('area_type',"Type").setTextFormat(),
    cases: new Field('cases',"Total Cases").setColorScheme(d3.interpolateGreys).setIntFormat(),
    deaths: new Field('deaths',"Deaths").setColorScheme(d3.interpolateBlues).setIntFormat(),
    population: new Field('population',"Population").setColorScheme(d3.interpolateGreens, true, 50000).setIntFormat().setNoHistory(),
    hospitals: new Field('hospitals',"# of Hospitals").setIntFormat().setNoHistory(),
    hospital_beds: new Field('hospital_beds',"# of Hospital Beds").setIntFormat().setNoHistory(),
    icu_beds: new Field('icu_beds',"# of ICU Beds").setIntFormat().setNoHistory(),
    new_rate_change: new Field('new_rate_change', 'Change in New Cases in the Past Week').setPercentFormat(0, true)
        .setColorScheme(interpolateNewCaseRateChange, false, -1, 1, true).setLegendFormat('+.0%').setLegendValuesFunction(getNewCaseLegendValues).setUseWideLegend(true),
};

// Now add calculated fields
FieldDetails.increase = new Field('increase',"New Cases Today").setColorScheme(d3.interpolateRdPu).setIntFormat(true).setIncreaseDataFunction(FieldDetails.cases);
FieldDetails.cases_per_10k_people = new Field('cases_per_10k_people',"Cases per 10,000 People").setColorScheme(d3.interpolateOranges).setFloatFormat(2).setRatioDataFunction(FieldDetails.cases, FieldDetails.population, true);
FieldDetails.increase_per_10k_people = new Field('increase_per_10k_people',"New Cases per 10,000").setColorScheme(d3.interpolateRdPu, true, null, 25).setFloatFormat(2).setRatioDataFunction(FieldDetails.increase, FieldDetails.population, true);
FieldDetails.cases_per_bed = new Field('cases_per_bed',"Cases per Hospital Bed").setColorScheme(d3.interpolateReds).setFloatFormat(2).setRatioDataFunction(FieldDetails.cases, FieldDetails.hospital_beds);
FieldDetails.cases_per_icu_bed = new Field('cases_per_icu_bed',"Cases per ICU Bed").setColorScheme(d3.interpolateReds).setFloatFormat(2).setRatioDataFunction(FieldDetails.cases, FieldDetails.icu_beds);
FieldDetails.deaths_increase = new Field('deaths_increase',"New Deaths").setColorScheme(d3.interpolateBlues).setIntFormat(true).setIncreaseDataFunction(FieldDetails.deaths);
FieldDetails.deaths_per_10k_people = new Field('deaths_per_10k_people', "Deaths per 10,000").setColorScheme(d3.interpolateBlues).setFloatFormat(2).setRatioDataFunction(FieldDetails.deaths, FieldDetails.population, true);
FieldDetails.deaths_per_case = new Field('deaths_per_case',"Deaths / Case").setColorScheme(d3.interpolateBlues).setPercentFormat(2).setRatioDataFunction(FieldDetails.deaths, FieldDetails.cases, false, 19).setLegendFormat('.2f');
FieldDetails.increase_per_icu_bed = new Field('increase_per_icu_bed', 'New Cases / ICU Bed').setColorScheme(d3.interpolateReds).setFloatFormat(2).setRatioDataFunction(FieldDetails.increase, FieldDetails.icu_beds).setMetadata(0, 2);

