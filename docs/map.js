MapOptions = {
    colorSchemes: ['Blues', 'Greens', 'Greys', 'Oranges', 'Purples', 'Reds', 'Turbo', 'Viridis', 'Inferno', 'Magma', 'Cividis', 'Warm', 'Cool', 'CubehelixDefault', 'BuGn', 'BuPu', 'GnBu','OrRd', 'PuBuGn','PuBu','PuRd','RdPu','YlGnBu','YlGn','YlOrBr','YlOrRd','Rainbow','Sinebow'],
    fieldOptions: ['cases_per_icu_bed', 'cases_per_10k_people', 'increase', 'deaths', 'population', 'cases' ],
    tooltipFields: ['cases_per_icu_bed', 'cases_per_10k_people', 'increase', 'deaths', 'population', 'cases', 'hospitals', 'hospital_beds', 'cases_per_bed','icu_beds' ],

    targetWidth: 1000,
    targetHeight: 600,

    includeCounties: true,
    currentField: "cases_per_icu_bed",
    lastUpdateDate: null,
    dateHistory: [],

    historyIndex: -1,

};
FieldDetails = {
    cases: {label: "Total Cases", colorScheme: "Greys", format: ',d', logScaleColors: true},
    deaths: {label: "Deaths", colorScheme: "Blues", format: ',d', logScaleColors: true},
    increase: {label: "New Cases Today", colorScheme: "RdPu", format: ',d', logScaleColors: true},
    population: {label: "Population", colorScheme: "Greens", format: ',d', logScaleColors: true},
    cases_per_10k_people: {label: "Cases per 10,000 People", colorScheme: "Oranges", format: '.2f', logScaleColors: true},
    cases_per_bed: {label: "Cases per Hospital Bed", colorScheme: "Reds", format: '.2f', logScaleColors: true},
    cases_per_icu_bed: {label: "Cases per ICU Bed", colorScheme: "Reds", format: '.2f', logScaleColors: true},
    hospitals: {label: "# of Hospitals", format: ',d', logScaleColors: true},
    hospital_beds: {label: "# of Hospital Beds", format: ',d', logScaleColors: true},
    icu_beds: {label: "# of ICU Beds", format: ',d', logScaleColors: true},
};

function updateMetadata(metadata) {
    MapOptions.lastUpdateDate = metadata.last_file_date;
    MapOptions.dateHistory = metadata.file_date_history;

    for (field in FieldDetails) {
        if (metadata[field] != null) {
            FieldDetails[field].dataMin = metadata[field].min;
            FieldDetails[field].dataMax = metadata[field].max;
        }
    }

    d3.select("#map-text").append('span').html('Last Updated: ' + MapOptions.lastUpdateDate);
    setTimelineRange(0, MapOptions.dateHistory.length);
}

function getFieldValueForDisplay(d, field) {
    if (MapOptions.historyIndex >= 0) {
        let history = d.properties[field + "_history"];
        if (history != null) {
            if (MapOptions.historyIndex >= history.length) {
                return null;
            }
            return history[MapOptions.historyIndex];
        }
    }
    return d.properties[field];
}

function drawMap(geojson) {
    var svg = d3.select('#map-content')
        .append('div')
        .classed('svg-container', true)
        .append('svg')
        .classed("map-svg", true)
        .attr('preserveAspectRatio', 'xMinYMin meet')
        //.attr('preserveAspectRatio', 'mMidYMid meet')
        .attr('viewBox', '0 0 ' + MapOptions.targetWidth + ' ' + MapOptions.targetHeight)
        .classed('svg-content-responsive', true);

    var g = svg.append('g');

    var albersProjection = d3.geoAlbersUsa()
        .scale(1200)
        .translate([MapOptions.targetWidth/2, MapOptions.targetHeight/2]);

    var geoPath = d3.geoPath().projection(albersProjection);

    var settings = getCurrentSettings();

    g.selectAll('path')
        .data(geojson.features)
        .enter()
        .append('path')
        .attr('fill', getColorMapFunction(MapOptions.currentField, settings))
        .attr('stroke', '#bbb')
        .attr('stroke-width', 0.1)
        .attr('d', geoPath)
        .on("mouseover", getShowTooltipFunction(MapOptions, FieldDetails))
        .on("mouseout",  hideTooltipFunction);

    drawLegend(MapOptions.currentField, settings, svg);
}

function updateMap() {
    let settings = getCurrentSettings();
    let svg = d3.select('.map-svg');
    svg.selectAll('path')
        .transition()
        .duration(750)
        .attr('fill', getColorMapFunction(MapOptions.currentField, settings));
    drawLegend(MapOptions.currentField, settings, svg);
}

function initializeMap() {
    initializeControls();

    d3.json('data/metadata.json', function (metadata) {
        updateMetadata(metadata);
        d3.json('data/' + MapOptions.lastUpdateDate + '-cases-healthcare-history.geojson', function (geojson) {
            drawMap(geojson);
        });
    });
}

