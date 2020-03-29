function getColorInterpolator(settings) {
    return d3['interpolate' + settings.colorScheme];
}

function getColorMapFunction(field, settings) {
    if (settings.colorScheme.startsWith('David')) {
        return getDavidColorSchemeFunction(field, settings);
    }

    let interpolator = getColorInterpolator(settings);
    let logFunction = null;
    if (settings.logScaleColors != null && settings.logScaleColors !== 'linear') {
        logFunction = Math[settings.logScaleColors];
    }
    return function(d) {
        let regionType = d.properties['area_type'];
        if (!MapOptions.includeCounties && regionType == 'County') {
            return "#ffffff";
        }
        let value = getFieldValueForDisplay(d, field);
        if (value == null || value == 0) {
            return "#ffffff";
        } else {
            let min = settings.min;
            let max = settings.max;
            if (logFunction != null) {
                min = (min == 0 ? 0 : logFunction(min));
                max = logFunction(max);
                value = logFunction(value);
            }
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

function getDavidColorSchemeFunction(field, settings) {
    return function(d) {
        prior_day_num = settings.colorScheme.substr(settings.colorScheme.length-1) - 1;
        let regionType = d.properties['area_type'];
        if (!MapOptions.includeCounties && regionType == 'County') {
            return "#ffffff";
        }
        let current = d.properties['cases'];
        let historical = d.properties['cases_history'];
        let previous = null;
        if (historical != null && prior_day_num < historical.length) {
            previous = historical[prior_day_num];
        }
        if (current == null || current == 0 || previous == null) {
            return "#ffffff";
        }
        let fac = 10.0;
        if (previous > 0 && current > 0) {
            let val = fac * Math.log(previous / current);
            let r = (0 - Math.min(val, 0.0)) / (1.0 - Math.min(val, 0.0));
            let g = 1.0 / (1.0 + Math.abs(val));
            let b = Math.max(val, 0.0) / (1.0 + Math.max(val, 0.0));
            let sat = 1.0 - 1.0 / Math.sqrt(previous + current);
            r = (sat * r + (1.0 - sat)) * 255;
            g = (sat * g + (1.0 - sat)) * 255;
            b = (sat * b + (1.0 - sat)) * 255;
            return d3.rgb(r, g, b);
        } else if (previous <= 0 < current) {
            return "#ff0000";
        } else if (previous > 0 >= current) {
            return "#0000ff";
        } else {
            return "#ffffff";
        }
    }
}