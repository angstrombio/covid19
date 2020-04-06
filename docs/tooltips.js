
function getShowTooltipFunction(MapOptions, FieldDetails) {
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
        if (regionBoundingRect['x'] < mapMidPointX) {
            // Go right
            tooltipLeft = regionBoundingRect['x'] + regionBoundingRect['width'] + 5;
        } else {
            // Go left
            tooltipLeft = regionBoundingRect['x'] - 250 - 5;
        }
        if (regionBoundingRect['y'] < mapMidPointY) {
            // Go down
            tooltipTop = window.pageYOffset + regionBoundingRect['y'] + regionBoundingRect['height'] + 5;
        } else {
            // Go up
            tooltipTop = window.pageYOffset + regionBoundingRect['y'] - 290 - 5;
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
    }
}

function hideTooltipFunction(d) {
    d3.select("#tooltip")
        .transition()
        .duration(500)
        .style("opacity", 0);
}

function addToolTipHTML(tooltip, feature, backgroundColor) {
    tooltip.select(".tooltip-header").html(feature.properties.area);
    tooltip.select(".tooltip-sub-header").html(feature.properties.area_type);

    MapOptions.tooltipFields.forEach(function(field) {
        value = getToolTipFieldValue(feature, field);
        d3.select("#tooltip-value-" + field).html(value);
        d3.select("#tooltip-colorblock-" + field).style('background-color', getToolTipColorCell(feature, backgroundColor, field, value));
    });

    return tooltip;
}


function getToolTipFieldValue(feature, field) {
    let value = getFieldValueForDisplay(feature, field);
    let fieldFormat = FieldDetails[field].format;
    let colorCell = null;
    if (value != null && fieldFormat != null) {
        value = d3.format(fieldFormat)(value);
    } else if (value == null) {
        value = '';
    }
    return value;
}

function getToolTipColorCell(feature, defaultBackgroundColor, field, value) {
    let settings = FieldDetails[field];
    if (value != null && settings.colorScheme != null) {
        return getColorMapFunction(field, settings)(feature);
    }
    return defaultBackgroundColor;
}
