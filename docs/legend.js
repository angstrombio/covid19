function drawLegend(field, settings, svg) {
    let svgLegendGroup = svg.select('.legend-group');
    if (svgLegendGroup.empty()) {
        svgLegendGroup = svg.append('g').classed('legend-group', true);
    }

    let interpolator = getColorInterpolator(settings);
    let width = 100;
    let height = 10;
    let xOffset = 700;
    let yOffset = 60;

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
    let rect = svgLegendGroup.selectAll('rect');
    let merged = rect.data(colorData)
        .enter()
        .append('rect')
        .attr('width', 2)
        .attr('height', height)
        .attr('x', function(d) { return xOffset + d; })
        .attr('y', yOffset)
        .merge(rect);
    merged.transition(750)
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
        });
    merged.exit().remove();

    let bounds = [{"value": 0, "x": xOffset - 8}, {"value": rangeMax, "x": xOffset+width+3}];
    let labels = svgLegendGroup.selectAll('.legend-text');
    labels.data(bounds)
        .enter()
        .append('text')
        .classed('legend-text', true)
        .attr('y', yOffset + height - 2)
        .merge(labels)
        .attr('x', function(d) { return d.x })
        .text(function(d) { return d3.format(',d')(d.value) })
        .exit().remove();

    let legendLabel = svgLegendGroup.selectAll('.legend-label');
    if (legendLabel.empty()) {
        legendLabel = svgLegendGroup.append('text')
            .classed('legend-label', true)
            .attr('y', yOffset - 4)
            .attr('x', xOffset + 2);
    }

    legendLabel.text(settings.label);
}
