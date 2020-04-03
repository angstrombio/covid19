function getColorInterpolator(settings) {
    let scheme = settings.colorScheme;
    if (scheme === 'custom-doubling') {
        let oranges = d3.interpolateOranges;
        return function(d) {
            if (d < 0.001) {
                return "#ffffff";
            }
            if (d <= 0.3) {
                return oranges(0.8);
            } else if (d <= 0.5) {
                return oranges(0.5);
            } else if (d <= 0.7) {
                return oranges(0.25);
            } else {
                return oranges(0.1);
            }
        }
    } else {
        return d3['interpolate' + scheme];
    }
}

function getColorMapFunction(field, settings) {
    let interpolator = getColorInterpolator(settings);
    let logFunction = null;
    if (settings.logScaleColors) {
        logFunction = function(value) {
            return Math.log(value+1);
        };
    }
    let min = 0;
    if (settings["forceColorMin"] != null) {
        min = settings.forceColorMin;
    }
    let max = settings.dataMax;
    if (settings['forceColorMax'] != null) {
        max = settings.forceColorMax;
    }
    if (logFunction != null) {
        if (min > 1) {
            min = logFunction(min)
        }
        max = logFunction(max)
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
            if (logFunction != null) {
                if (value <= 0) {
                    value = min;
                } else {
                    value = logFunction(value);
                }
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