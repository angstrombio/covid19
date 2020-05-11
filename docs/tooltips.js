/**
 * Functions for working with our tooltip data popups.
 */

/**
 * Generates a function that positions and displays data in the tooltip for a particular region.
 */
function getShowTooltipFunction(tooltipCharSvg) {
    let svg = d3.select('#map-content');
    let tooltip = d3.select("#tooltip");

    return function(d) {
        // We place the tooltip to the left of the region if the region is on the right half of the map,
        // and right otherwise.
        // Similarly, we place to the top of the region if the region is in the bottom half of the map,
        // and top otherwise.
        let regionBoundingRect = d3.select(this).node().getBoundingClientRect();
        let mapBoundingRect = svg.node().getBoundingClientRect();
        let mapMidPointX = (mapBoundingRect['x'] + mapBoundingRect['width'] / 2);
        let mapMidPointY = (mapBoundingRect['y'] + mapBoundingRect['height'] / 2);
        let tooltipLeft, tooltipTop;
        if (regionBoundingRect['x'] < mapMidPointX) {
            // Go right
            tooltipLeft = regionBoundingRect['x'] + regionBoundingRect['width'] + 5;
        } else {
            // Go left
            tooltipLeft = regionBoundingRect['x'] - 325 - 5;
        }
        if (regionBoundingRect['y'] < mapMidPointY) {
            // Go down
            tooltipTop = window.pageYOffset + regionBoundingRect['y'] + regionBoundingRect['height'] + 5;
        } else {
            // Go up
            tooltipTop = window.pageYOffset + regionBoundingRect['y'] - 265 - 5;
            // todo window.pagexoffset
        }

        let backgroundColor = 'lightSteelBlue';
        tooltip.transition()
            .duration(200)
            .style("opacity", .9)
            .style("background-color", backgroundColor );
        addToolTipHTML(tooltip, d, backgroundColor)
            .style('left', tooltipLeft + 'px')
            .style('top', tooltipTop + "px");
        updateTooltipChart(tooltipCharSvg, d);
    }
}

/**
 * Hides the tooltip popup.
 */
function hideTooltipFunction(d) {
    d3.select("#tooltip")
        .transition()
        .duration(500)
        .style("opacity", 0);
}

/**
 * Adds the data to the tooltip for a specified region
 *
 * @param tooltip           The tooltip div.
 * @param feature           The current region.
 * @param backgroundColor   Background color for the tooltip.
 */
function addToolTipHTML(tooltip, feature, backgroundColor) {
    tooltip.select(".tooltip-header").html(feature.properties.area);
    tooltip.select(".tooltip-sub-header").html(feature.properties.area_type);

    for (field in FieldDetails) {
        let value = FieldDetails[field].getFormattedFieldValue(feature);
        d3.select("#tooltip-value-" + field).html(value);
        d3.select("#tooltip-colorblock-" + field).style('background-color', getToolTipColorCell(feature, backgroundColor, field, value));
    }

    return tooltip;
}

/**
 * Generates a color icon cell for a particular field in the specified region.
 *
 * @param feature                   The current region.
 * @param defaultBackgroundColor    Default background color, if none is specified by the data.
 * @param field                     The field to display.
 * @param value                     The current value of the field.
 */
function getToolTipColorCell(feature, defaultBackgroundColor, field, value) {
    let settings = FieldDetails[field];
    if (value != null && settings.colorInterpolator != null) {
        return settings.getColorMapFunction(defaultBackgroundColor)(feature);
    }
    return defaultBackgroundColor;
}

const TOOLTIP_CHART_WIDTH = 300;
const TOOLTIP_CHART_HEIGHT = 30;

function createTooltipChartSVG() {
    return d3.select('#tooltip-newcase-chart').append('svg')
        .attr('width', TOOLTIP_CHART_WIDTH)
        .attr('height', TOOLTIP_CHART_HEIGHT)
        .append('g');
}

function getHistoryOffsetForPosition(position, maxPosition) {
    return position - maxPosition + 1;
}

function updateTooltipChart(tooltipChartSvg, feature) {
    let field = FieldDetails.increase;
    let colorField = FieldDetails.increase_per_10k_people;
    let dataCount = Math.min(40, MapOptions.dateHistory.length);
    let data = [];
    let maxValue = 0;
    for (let i = 0; i < dataCount; i++) {
        let offset = getHistoryOffsetForPosition(i, dataCount);
        let value = field.getFieldValue(feature, offset);
        if (value == null || value < 0) {
            value = 0;
        }
        if (value > maxValue) {
            maxValue = value;
        }
        data.push(value);
    }

    let barWidth = (TOOLTIP_CHART_WIDTH - dataCount) / dataCount;
    const x = d3.scaleLinear().domain([0, dataCount]).range([0,TOOLTIP_CHART_WIDTH]);
    const y = d3.scaleLinear().domain([0, maxValue]).range([0, TOOLTIP_CHART_HEIGHT]);

    let colorValueRetrievalFunction = function(d, i) {
        let offset = getHistoryOffsetForPosition(i, dataCount);
        return colorField.getFieldValue(feature, offset);
    };
    let colorFunction = colorField.getColorMapFunction('#ffffff', colorValueRetrievalFunction);

    let rect = tooltipChartSvg.selectAll('.bar').data(data);
    rect.enter()
        .append('rect')
        .classed('bar', true)
        .merge(rect)
        .attr('x', (d, i) => x(i))
        .attr('y', d => TOOLTIP_CHART_HEIGHT - y(d))
        .attr('width', barWidth)
        .attr('height', d => y(d))
        .attr('fill', colorFunction);
    rect.exit().remove();
}