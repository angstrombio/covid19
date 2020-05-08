/**
 * Functions related to color-coding data fields and displaying
 * legends for that color coding.
 */


function interpolateNewCaseRateChange(data) {
    if (data == null) {
        return '#ffffff';
    }
    if (data > 0.5) {
        return d3.interpolateReds(0.75);
    } else if (data > 0.1) {
        return d3.interpolateReds(0.25);
    } else if (data > -0.1) {
        return d3.interpolateGreys(0.2);
    } else if (data > -0.5) {
        return d3.interpolateGreens(0.25);
    } else {
        return d3.interpolateGreens(0.75);
    }
}

function getNewCaseLegendValues(xOffset, yOffset, height, legendFormat) {
    let yLocation = yOffset + height + 10;
    return [
        {"value": -0.5, 'x': xOffset + 42, 'y': yLocation, 'format': legendFormat},
        {"value": -0.1, 'x': xOffset + 78, 'y': yLocation, 'format': legendFormat},
        {"value": 0.1, 'x': xOffset + 102, 'y': yLocation, 'format': legendFormat},
        {"value": 0.5, 'x': xOffset + 140, 'y': yLocation, 'format': legendFormat},
    ];
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
    let xOffset = 450;
    let xOffsetLegend = xOffset;
    if (field.getUseWideLegend()) {
        width = 200;
        xOffsetLegend = xOffset - 50;
    }
    let height = 10;
    let yOffset = 30;

    let rangeMax = field.getLegendMax();
    let colorData = [...Array(width).keys()];
    let rect = svgLegendGroup.selectAll('rect').data(colorData);
    let merged = rect
        .enter()
        .append('rect')
        .attr('width', 2)
        .attr('height', height)
        .merge(rect)
        .attr('x', function(d) { return xOffsetLegend + d; })
        .attr('y', yOffset)
        .transition(750)
        .attr('fill', field.getLegendColorFunction(width));
    rect.exit().remove();

    let legendFormat = field.getLegendFormat();
    let bounds = [
        {"value": 0, "x": xOffsetLegend - 8, 'y': yOffset + height - 2, "format": ',d'},
        {"value": rangeMax, "x": xOffsetLegend + width + 3, 'y': yOffset + height - 2, "format": legendFormat}];
    let legendValuesFunction = field.getLegendValuesFunction();
    if (legendValuesFunction != null) {
        bounds = legendValuesFunction(xOffsetLegend, yOffset, height, legendFormat);
    }

    let labels = svgLegendGroup.selectAll('.legend-text').data(bounds);
    labels.enter()
        .append('text')
        .classed('legend-text', true)
        .merge(labels)
        .attr('x', function (d) { return d.x;  })
        .attr('y', function(d) { return d.y; })
        .text(function (d) {
            return d3.format(d.format)(d.value)
        });
    labels.exit().remove();

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
