function getColorInterpolator(settings) {
    return d3['interpolate' + settings.colorScheme];
}

function getColorMapFunction(field, settings) {
    let interpolator = getColorInterpolator(settings);
    let logFunction = null;
    if (settings.logScaleColors) {
        logFunction = function(value) {
            return Math.log(value+1);
        };
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
            let min = 0;
            if (settings["forceColorMin"] != null) {
                min = settings.forceColorMin;
            }
            let max = settings.dataMax;
            if (logFunction != null) {
                if (min > 1) {
                    min = logFunction(min)
                }
                max = logFunction(max);
                if (value <= min) {
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