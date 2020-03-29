function drawLegend(currentSettings) {
    let interpolator = getColorInterpolator(currentSettings);
    var width = 200;
    var height = 15;
    var svg = d3.select("#legend").select('svg');
    if (svg.empty()) {
        svg = d3.select("#legend").append('svg')
            .attr('width', width + 25)
            .attr('height', height + 50);
    }

    let colorMin = currentSettings.min;
    let colorMax = currentSettings.max;
    let rangeMin = Math.min(currentSettings.dataMin, colorMin);
    let rangeMax = Math.max(currentSettings.dataMax, colorMax);

    let logFunction = null;
    if (currentSettings.logScaleColors != null && currentSettings.logScaleColors !== 'linear') {
        logFunction = Math[currentSettings.logScaleColors];
        colorMin = (colorMin <= 0 ? 0 : logFunction(colorMin));
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
            console.log(pct);
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
