const COLOR_SCHEMES = ['Blues', 'Greens', 'Greys', 'Oranges', 'Purples', 'Reds', 'Turbo', 'Viridis', 'Inferno', 'Magma', 'Cividis', 'Warm', 'Cool', 'CubehelixDefault', 'BuGn', 'BuPu', 'GnBu','OrRd', 'PuBuGn','PuBu','PuRd','RdPu','YlGnBu','YlGn','YlOrBr','YlOrRd','Rainbow','Sinebow']
const FIELD_DETAILS = {
    cases: {label: "Cases", colorScheme: "Blues", min: 0, max: 2500, format: ',d'},
    deaths: {label: "Deaths", colorScheme: "Reds", min: 0, max: 500, format: ',d'},
    increase: {label: "Increase in Cases Today", colorScheme: "Reds", min: 0, max: 1000, format: ',d'},
    // TODO increase_pct: {label: "% Increase in Cases Today", colorScheme: "Reds", min: 0, max: 100},
    population: {label: "Population", colorScheme: "Blues", min: 0, max: 1000000, format: ',d'},
    cases_per_10k_people: {label: "Cases per 10,000 People", colorScheme: "Reds", min: 0, max: 15, format: '.2f'},
    cases_per_bed: {label: "Cases per Hospital Bed", colorScheme: "Reds", min: 0, max: 2, format: '.2f'},
    cases_per_icu_bed: {label: "Cases per ICU Bed", colorScheme: "Reds", min: 0, max: 5, format: '.2f'},
    hospitals: {label: "# of Hospitals", format: ',d'},
    hospital_beds: {label: "# of Hospital Beds", format: ',d'},
    icu_beds: {label: "# of ICU Beds", format: ',d'},
};
const FIELDS = ['cases', 'deaths', 'increase', 'population', 'cases_per_10k_people', 'cases_per_bed', 'cases_per_icu_bed'];
const TOOLTIP_FIELDS = ['cases', 'deaths', 'increase', 'population', 'hospitals', 'hospital_beds', 'icu_beds', 'cases_per_10k_people', 'cases_per_bed', 'cases_per_icu_bed']

function getToolTipHTML(d) {
    html = `
        <table class="tooltip-table">
            <tr><th colspan="3" class="tooltip-header">${d.properties['area']}</th></tr>
            ${getToolTipFields(d)}
        </table>`;
    return html;
}

function getToolTipFields(d) {
    html = '';
    for (i = 0; i < TOOLTIP_FIELDS.length; i++) {
        let field = TOOLTIP_FIELDS[i];
        let settings = FIELD_DETAILS[field];
        let fieldLabel = settings.label;
        let fieldFormat = settings.format;
        let value = getFieldValueForDisplay(d, field);
        let colorCell = null;
        if (value != null && settings.colorScheme != null) {
            colorCell = getColorMapFunction(field, settings)(d);
        }
        if (value != null && fieldFormat != null) {
            value = d3.format(fieldFormat)(value);
        } else {
            value = '';
        }
        html += `<tr>
                    <td class="tooltip-label-cell">${fieldLabel}: </td>
                    <td class="tooltip-value-cell">${value}</td>`;
        if (colorCell != null) {
            html += `<td class="tooltip-color-cell" style="background-color: ${colorCell};"></td>`;
        }
        html += '</tr>';
    }
    return html;
}

INCLUDE_COUNTIES = true;
LAST_FIELD = "cases";
METADATA = {};
var disableAutoUpdates = true;

var fieldSelector = d3.select("#data-field");
fieldSelector.selectAll("option")
    .data(FIELDS)
    .enter()
    .append("option")
    .text(function(d) {
        return FIELD_DETAILS[d]['label'];
    })
    .attr('value', function(d) {
        return d;
    });
fieldSelector.on('change', function() {
    var selection = d3.select(this).property('value');
    disableAutoUpdates = true;

    let newField = d3.select("#data-field").property('value');
    let currentSettings = getCurrentSettings(LAST_FIELD);
    FIELD_DETAILS[LAST_FIELD].colorScheme = currentSettings.colorScheme;
    FIELD_DETAILS[LAST_FIELD].min = currentSettings.min;
    FIELD_DETAILS[LAST_FIELD].max = currentSettings.max;

    loadSettings(FIELD_DETAILS[newField]);
    LAST_FIELD = newField;
    disableAutoUpdates = false;
    updateMap();
});
var colorSelector = d3.select("#data-color-scheme");
colorSelector.selectAll("option")
    .data(COLOR_SCHEMES)
    .enter()
    .append("option")
    .attr('id', function(d) { return 'scheme-' + d })
    .text(function(d) { return d; })
    .attr('value', function(d) { return d; });
colorSelector.on('change', function() {
    if (!disableAutoUpdates) {
        updateMap();
    }
});
d3.select("#field-min")
    .on('change', function() {
        if (!disableAutoUpdates) {
            updateMap();
        }
    });
d3.select("#field-max")
    .on('change', function() {
        if (!disableAutoUpdates) {
            updateMap();
        }
    });
d3.select("#msa-only")
    .on('change', function() {
        if (!disableAutoUpdates) {
            INCLUDE_COUNTIES = !d3.select(this).property("checked");
            updateMap();
        }
    });
d3.select("#history-range")
    .on('change', function() {
        updateHistorySelection();
        if (!disableAutoUpdates) {
            updateMap();
        }
    });

loadSettings(FIELD_DETAILS[LAST_FIELD]);

HISTORY_INDEX = -1;

disableAutoUpdates = false;

function updateMetadata(metadata) {
    METADATA = metadata;
    d3.select("#map-text").append('span').html('Last Updated: ' + metadata.last_file_date);
    historyLength = metadata.file_date_history.length
    d3.select("#history-range").attr('min', 0).attr('max', historyLength).property('value', historyLength);
    updateHistorySelection();
}

function updateHistorySelection() {
    let max = METADATA.file_date_history.length;
    let value = d3.select("#history-range").property('value');
    if (value == max) {
        HISTORY_INDEX = -1;
        historyLabel = METADATA.last_file_date;
    } else {
        HISTORY_INDEX = max - value - 1;
        historyLabel = METADATA.file_date_history[HISTORY_INDEX];
    }
    d3.select('#history-range-label').html(historyLabel);
}

function getCurrentField() {
    return LAST_FIELD;
}

function getCurrentSettings(fieldToUse) {
    let colorScheme = d3.select("#data-color-scheme").property('value');
    let min = d3.select("#field-min").property('value');
    let max = d3.select("#field-max").property('value');
    return {"label": FIELD_DETAILS[fieldToUse].label, "colorScheme": colorScheme, "min": min, "max": max};
}

function loadSettings(settings) {
    d3.select("#scheme-" + settings.colorScheme).property('selected', true);
    d3.select("#field-min").property('value', settings.min);
    d3.select("#field-max").property('value', settings.max);
}

function getColorInterpolator(settings) {
    if (!COLOR_SCHEMES.includes(settings.colorScheme)) {
        return d3.interpolateBlues;
    }
    return d3['interpolate' + settings.colorScheme];
}

function getFieldValueForDisplay(d, field) {
    if (HISTORY_INDEX >= 0) {
        let history = d.properties[field + "_history"];
        if (history != null) {
            if (HISTORY_INDEX >= history.length) {
                return null;
            }
            return history[HISTORY_INDEX];
        }
    }
    return d.properties[field];
}

function getColorMapFunction(field, settings) {
    let interpolator = getColorInterpolator(settings);
    return function(d) {
        let regionType = d.properties['area_type'];
        if (!INCLUDE_COUNTIES && regionType == 'County') {
            return "#ffffff";
        }
        let value = getFieldValueForDisplay(d, field);
        if (value == null || value == 0) {
            return "#ffffff";
        } else {
            if (value <= settings.min) {
                pct = 0.0;
            } else if (value >= settings.max) {
                pct = 1.0;
            } else {
                pct = (value - settings.min) / (settings.max - settings.min);
            }
            if(d.properties['area'].startsWith("New ")) {
                console.log(d.properties['area']);
                console.log(d.properties) //['history_dates'])
            }//TODO
            return interpolator(pct);
        }
    }
}

function drawLegend() {
    let currentField = getCurrentField();
    let currentSettings = getCurrentSettings(currentField);
    let interpolator = getColorInterpolator(currentSettings);
    var width = 200;
    var height = 15;
    var svg = d3.select("#legend").select('svg');
    if (svg.empty()) {
        svg = d3.select("#legend").append('svg')
            .attr('width', width + 25)
            .attr('height', height + 50);
    }

    if (METADATA[currentField] == null) {
        console.log("no metadata for field " + currentField);
    }
    let max = Math.max(METADATA[currentField].max, currentSettings.max);
    let min = Math.min(METADATA[currentField].min, currentSettings.min);
    rangePct =

    colorData = [...Array(width).keys()];
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
            pct = d/width;
            value = min + (pct * (max - min));
            if (value < currentSettings.min) {
                pct = 0;
            } else if (value > currentSettings.max) {
                pct = 1;
            } else {
                pct = (value - currentSettings.min)/currentSettings.max;
            }
            return interpolator(pct);
        })
        .exit().remove();

    let bounds = [{"value": 0, "x": 0}, {"value": max, "x": width-10}]
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

function drawMap(geojson) {
    var width = 700,
    height = 425;
    var svg = d3.select('#map-content')
        .append('div')
        .classed('svg-container', true)
        .append('svg')
        .attr('preserveAspectRatio', 'xMinYMin meet')
        .attr('viewBox', '0 0 ' + width + ' ' + height)
        .classed('svg-content-responsive', true);

    var g = svg.append('g');

    var albersProjection = d3.geoAlbersUsa()
        .scale(950)
        .translate([width/2, height/2]);

    var geoPath = d3.geoPath().projection(albersProjection);

    var tooltip = d3.select("#tooltip");

    var field = getCurrentField();
    var settings = getCurrentSettings(field);

    g.selectAll('path')
        .data(geojson.features)
        .enter()
        .append('path')
        .attr('fill', getColorMapFunction(field, settings))
        .attr('stroke', '#bbb')
        .attr('stroke-width', 0.1)
        .attr('d', geoPath)
        .on("mouseover", function(d) {
            // We place the tooltip to the left of the region if the region is on the right half of the map,
            // and right otherwise.
            // Similarly, we place to the top of the region if the region is in the bottom half of the map,
            // and top otherwise.
            let regionBoundingRect = d3.select(this).node().getBoundingClientRect();
            let mapBoundingRect = svg.node().getBoundingClientRect();
            let mapMidPointX = (mapBoundingRect['x'] + mapBoundingRect['width']/2);
            let mapMidPointY = (mapBoundingRect['y'] + mapBoundingRect['height']/2);
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
                // TODO what about window.pageYOffset?
            } else {
                // Go up
                tooltipTop = window.pageYOffset + regionBoundingRect['y'] - 250 - 5
            }

            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            tooltip.html(getToolTipHTML(d))
                //.style("left", (d3.event.pageX) + "px")
                //.style("top", (d3.event.pageY - 28) + "px");
                .style('left', tooltipLeft + 'px')
                .style('top', tooltipTop + "px");
        })
        .on("mouseout", function(d) {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        })
    ;
}

function updateMap() {
    field = getCurrentField();
    settings = getCurrentSettings(field);
    d3.selectAll('path')
        .transition()
        .duration(1000)
        .attr('fill', getColorMapFunction(field, settings));
    drawLegend();
}

d3.json('2020-03-28-metadata.json', function(metadata) {
    updateMetadata(metadata);
    d3.json('2020-03-28-cases-healthcare-history.geojson', function(geojson) {
        drawMap(geojson);
        drawLegend();
    });
});

