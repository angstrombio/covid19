function drawLegend() {
    MapOptions.fieldOptions.forEach(function (field) {
        drawLegendForField(field);
    });
}

function drawLegendForField(field) {
    settings = FieldDetails[field];
    let interpolator = getColorInterpolator(settings);
    var width = 150;
    var height = 10;
    var svg = d3.select("#legend-" + field).select('svg');
    if (svg.empty()) {
        svg = d3.select("#legend-" + field).append('svg')
            .attr('width', width + 25)
            .attr('height', height + 10);
    }

    let colorMin = 0;
    let rangeMin = 0;
    let colorMax = settings.dataMax;
    let rangeMax = colorMax;

    let logFunction = null;
    if (settings.logScaleColors) {
        logFunction = function(v) {
            return Math.log(v+1);
        };
        colorMax = logFunction(colorMax);
    }

    let colorData = [...Array(width).keys()];
    var rect = svg.selectAll('rect');
    rect.data(colorData)
        .enter()
        .append('rect')
        .attr('width', 1)
        .attr('height', height)
        .attr('x', function(d) { return d; })
        .attr('y', 0)
        .merge(rect)
        .attr('fill', function(d) {
            let value = rangeMin + (d/width * (rangeMax - rangeMin));
            if (logFunction != null) {
                value = logFunction(value);
            }
            if (value < colorMin) {
                pct = 0;
            } else if (value > colorMax) {
                pct = 1;
            } else {
                pct = (value - colorMin)/(colorMax - colorMin);
            }
            return interpolator(pct);
        })
        .exit().remove();

    let bounds = [{"value": 0, "x": 0}, {"value": rangeMax, "x": width-10}]
    var labels = svg.selectAll('text');
    labels.data(bounds)
        .enter()
        .append('text')
        .classed('legend-text', true)
        .attr('y', height + 10 )
        .merge(labels)
        .attr('x', function(d) { return d.x })
        .text(function(d) { return d3.format(',d')(d.value) })
        .exit().remove();
}
