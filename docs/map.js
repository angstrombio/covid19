/**
 * Core functions for managing data and displaying the map.
 */

/**
 * Holds settings and current data/state information for the map.
 */
MapOptions = {
    targetWidth: 1000,
    targetHeight: 600,

    currentField: FieldDetails.new_rate_change,
    lastUpdateDate: null,
    dateHistory: [],

    historyIndex: -1,

    allData: null,
    showTables: false,
    tablesShowSelections: false,
    selectedAreaIds: []
};

/**
 * Updates settings and data after the metadata is loaded.
 *
 * @param metadata  Metadata JSON loaded from the server.
 */
function updateMetadata(metadata) {
    MapOptions.lastUpdateDate = metadata.last_file_date;
    MapOptions.dateHistory = metadata.file_date_history;

    for (field in FieldDetails) {
        if (metadata[field] != null) {
            FieldDetails[field].dataMin = metadata[field].min;
            FieldDetails[field].dataMax = metadata[field].max;
        }
    }

    d3.select("#map-text").append('span').html(MapOptions.lastUpdateDate);
    setTimelineRange(0, MapOptions.dateHistory.length);
}

/**
 * Draws an empty placeholder on the screen while we load the map data, so the rest of the page
 * doesn't jump around when we are ready to display the map.
 */
function drawEmptyMapPlaceholder() {
    let svg = d3.select('#map-content')
        .append('div')
        .classed('svg-container', true)
        .append('svg')
        .classed("map-svg", true)
        .attr('preserveAspectRatio', 'xMinYMin meet')
        .attr('viewBox', '0 0 ' + MapOptions.targetWidth + ' ' + MapOptions.targetHeight)
        .classed('svg-content-responsive', true);

    svg.append('text')
        .classed('loading-text', true)
        .attr('x', 400)
        .attr('y', 300)
        .text('Loading Map Content...');

    return svg;
}

/**
 * Callback used when a region is selected.  If we are on a page that uses this information, we
 * update tracking and display details.
 *
 * @param d Data for the region that was clicked.
 */
function regionClicked(d) {
    if (MapOptions.showTables) {
        let id = d.properties.id;
        if (MapOptions.selectedAreaIds.includes(id)) {
            MapOptions.selectedAreaIds = MapOptions.selectedAreaIds.filter(function(d) { return d !== id;});
        } else {
            MapOptions.selectedAreaIds.push(id);
        }
        if (MapOptions.tablesShowSelections) {
            updateTable();
        }
    }
}

/**
 * Draws the map.
 *
 * @param svg       The SVG to draw in.
 * @param geojson   Our core data (geographic areas and data)
 * @param states    Geographic areas for state outlines, which we will draw on top of the counties/areas.
 */
function drawMap(svg, geojson, states) {
    let baseGroup = svg.append('g').classed('map-zoom-items', true);
    let g = baseGroup.append('g')
        .classed('map-areas', true);

    svg.select('#loading-text').remove();

    let albersProjection = d3.geoAlbersUsa()
        .scale(1200)
        .translate([MapOptions.targetWidth/2, MapOptions.targetHeight/2]);

    let geoPath = d3.geoPath().projection(albersProjection);

    let field = MapOptions.currentField;

    let tooltipChartSvg = createTooltipChartSVG();

    g.selectAll('path')
        .data(geojson.features)
        .enter()
        .append('path')
        .attr('fill', field.getColorMapFunction())
        .attr('stroke', '#bbb')
        .attr('stroke-width', 0.1)
        .attr('d', geoPath)
        .on("mouseover", getShowTooltipFunction(tooltipChartSvg))
        .on("mouseout",  hideTooltipFunction)
        .on("click", regionClicked);

    const zoom = d3.zoom()
        .scaleExtent([1, 40])
        .translateExtent([[0,0], [MapOptions.targetWidth, MapOptions.targetHeight]])
        .extent([[0, 0], [MapOptions.targetWidth, MapOptions.targetHeight]])
        .on('zoom', function() {
            baseGroup.attr('transform', d3.event.transform);
        });

    svg.call(zoom).on("wheel.zoom", null);

    let gs = baseGroup.append('g')
        .classed('map-states', true);
    gs.selectAll('path')
        .data(states.features)
        .enter()
        .append('path')
        .attr('stroke','#000')
        .attr('stroke-width', 0.1)
        .attr('d', geoPath)
        .attr('fill', 'none');

    setupZoomButtons(svg, baseGroup, zoom);
    drawLegend(field, baseGroup);
}

/**
 * Defines zoom controls for the map.
 *
 * @param svg       The SVG in which we are drawing the map.
 * @param zoomArea  The area of the SVG that will be zoomed in and out.
 * @param zoom      The D3 zoom object.
 */
function setupZoomButtons(svg, zoomArea, zoom) {
    let zoomControlGroup = svg.append('g')
        .classed('map-zoom-controls', true)
        .attr('transform', 'translate(50, 50)');

    let zoomIn = function() {
        zoom.scaleBy(svg.transition().duration(500), 1.5);
    };
    let zoomOut = function() {
        zoom.scaleBy(svg.transition().duration(500), 1/1.5);
    };
    let zoomReset = function() {
        zoom.transform(svg.transition().duration(500), d3.zoomIdentity.scale(1));
    };

    let controls = [{label: 'Zoom In', icon: '\uf067', xOffset: 0, onClick: zoomIn},
        {label: 'Zoom Out', icon: '\uf068', xOffset: 0, onClick: zoomOut},
        {label: 'Reset Zoom', icon: '\uf015',  xOffset: -1,onClick: zoomReset}];

    let buttonGroup = zoomControlGroup.selectAll('g')
        .data(controls)
        .enter()
        .append('g')
        .attr('transform', function(x, i) {
            return 'translate(0, ' + 30 * i + ')';
        });

    buttonGroup.append('text')
        .attr('font-family', 'FontAwesome')
        .attr('fill', '#000')
        .attr('x', function(d) { return d.xOffset })
        .text(function(d) { return d.icon; });

    buttonGroup.append('rect')
        .attr('stroke','#000')
        .attr('stroke-width', 0.2)
        .attr('fill', 'rgba(100, 100, 100, 0.1)')
        .attr('width', 20)
        .attr('height', 20)
        .attr('x', -4)
        .attr('y', -16)
        .on('click', function(d) {
            return d.onClick(d.label);
        });
}

/**
 * Updates the map (e.g. when field selections, timeline, or data have changed).
 */
function updateMap() {
    let field = MapOptions.currentField;
    let svg = d3.select('.map-svg');
    svg.select('.map-areas').selectAll('path')
        .transition()
        .duration(750)
        .attr('fill', field.getColorMapFunction());
    drawLegend(field, svg);
}

/**
 * Initializes all of our map controls, loads data from the server, and draws the map/related controls.
 *
 * @param shouldDrawTables  If true, we are drawing data tables below the map (not used on all pages).
 */
function initializeMap(shouldDrawTables = false) {
    MapOptions.showTables = shouldDrawTables;
    initializeControls();
    let svg = drawEmptyMapPlaceholder();
    const urlParams = new URLSearchParams(window.location.search);
    let metadataUrl = 'data/metadata.json';

    d3.json(metadataUrl, function (metadata) {
        updateMetadata(metadata);
        d3.json('data/' + MapOptions.lastUpdateDate + '-cases-healthcare-history.geojson', function (geojson) {
            MapOptions.allData = geojson.features;
            d3.json('data/states.geojson', function(states) {
                drawMap(svg, geojson, states);
                if (MapOptions.showTables) {
                    enableTables();
                    updateTable();
                }
            });
        });
    });
}

