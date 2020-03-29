function getColorInterpolator(settings) {
    return d3['interpolate' + settings.colorScheme];
}

function getColorMapFunction(field, settings) {
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
