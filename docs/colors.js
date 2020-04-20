/**
 * Functions related to color-coding data fields and displaying
 * legends for that color coding.
 */

/**
 * Custom color scheme for the "doubling" data field.  We use a
 * reverse scheme with several fixed points that color changes,
 * similar to the NYT analysis.
 *
 * @param data  The doubling rate value.
 */
function interpolateCaseDoubling(data) {
    if (data < 0.001) {
        return "#ffffff";
    }
    if (data <= 0.3) {
        return d3.interpolateOranges(0.8);
    } else if (data <= 0.5) {
        return d3.interpolateOranges(0.5);
    } else if (data <= 0.7) {
        return d3.interpolateOranges(0.25);
    } else {
        return d3.interpolateOranges(0.1);
    }
}

/**
 * Determines if a color is "dark" and therefore should have light foreground text, by examining
 * luminance of the color.
 *
 * See https://stackoverflow.com/questions/3116260/given-a-background-color-how-to-get-a-foreground-color-that-makes-it-readable-o .
 *
 * @param color The color to examine.
 */
function isDarkColor(color) {
    let rgb = d3.rgb(color);
    let luminance = (0.2126 * rgb.r + 0.7152*rgb.g + 0.0722*rgb.b);
    return luminance < 140;
}

/**
 * Draws the color legend on the map.
 *
 * @param field The field we are coloring by.
 * @param svg   The SVG display area that contains the map and legend.
 */
function drawLegend(field, svg) {
    let svgLegendGroup = svg.select('.legend-group');
    if (svgLegendGroup.empty()) {
        svgLegendGroup = svg.append('g').classed('legend-group', true);
    }

    let width = 100;
    let height = 10;
    let xOffset = 450;
    let yOffset = 30;

    let rangeMax = field.getLegendMax();
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
        .attr('fill', field.getLegendColorFunction(width));
    merged.exit().remove();

    let bounds = [{"value": 0, "x": xOffset - 8, "format": ',d'}, {"value": rangeMax, "x": xOffset+width+3, "format": field.getLegendFormat()}];
    let labels = svgLegendGroup.selectAll('.legend-text');
    labels.data(bounds)
        .enter()
        .append('text')
        .classed('legend-text', true)
        .attr('y', yOffset + height - 2)
        .merge(labels)
        .attr('x', function(d) { return d.x })
        .text(function(d) { return d3.format(d.format)(d.value) })
        .exit().remove();

    let legendLabel = svgLegendGroup.selectAll('.legend-label');
    if (legendLabel.empty()) {
        legendLabel = svgLegendGroup.append('text')
            .classed('legend-label', true)
            .attr('text-anchor', 'middle')
            .attr('y', yOffset - 10)
            .attr('x', xOffset + 50);
    }

    legendLabel.text(field.getLabel());

    let instructionsLabel = svg.selectAll('.instructions-label');
    if (instructionsLabel.empty()) {
        svg.append('text')
            .classed('instructions-label', true)
            .attr('x', 700)
            .attr('y',30)
            .text('Hover or click on regions to see detailed data')
    }
}
