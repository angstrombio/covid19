MapOptions = {
    colorSchemes: ['Blues', 'Greens', 'Greys', 'Oranges', 'Purples', 'Reds', 'Turbo', 'Viridis', 'Inferno', 'Magma', 'Cividis', 'Warm', 'Cool', 'CubehelixDefault', 'BuGn', 'BuPu', 'GnBu','OrRd', 'PuBuGn','PuBu','PuRd','RdPu','YlGnBu','YlGn','YlOrBr','YlOrRd','Rainbow','Sinebow'],
    fieldOptions: ['cases', 'deaths', 'increase', 'population', 'cases_per_10k_people', 'cases_per_bed', 'cases_per_icu_bed'],
    tooltipFields: ['cases', 'deaths', 'increase', 'population', 'hospitals', 'hospital_beds', 'icu_beds', 'cases_per_10k_people', 'cases_per_bed', 'cases_per_icu_bed'],

    targetWidth: 700,
    targetHeight: 425,

    includeCounties: true,
    currentField: "cases",
    disableAutoUpdates: true,
    lastUpdateDate: null,
    dateHistory: [],

    historyIndex: -1,

};
FieldDetails = {
    cases: {label: "Cases", colorScheme: "Blues", min: 0, max: 2500, format: ',d'},
    deaths: {label: "Deaths", colorScheme: "Reds", min: 0, max: 500, format: ',d'},
    increase: {label: "Increase in Cases Today", colorScheme: "Reds", min: 0, max: 1000, format: ',d'},
    population: {label: "Population", colorScheme: "Blues", min: 0, max: 1000000, format: ',d'},
    cases_per_10k_people: {label: "Cases per 10,000 People", colorScheme: "Reds", min: 0, max: 15, format: '.2f'},
    cases_per_bed: {label: "Cases per Hospital Bed", colorScheme: "Reds", min: 0, max: 2, format: '.2f'},
    cases_per_icu_bed: {label: "Cases per ICU Bed", colorScheme: "Reds", min: 0, max: 5, format: '.2f'},
    hospitals: {label: "# of Hospitals", format: ',d'},
    hospital_beds: {label: "# of Hospital Beds", format: ',d'},
    icu_beds: {label: "# of ICU Beds", format: ',d'}
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

    d3.select("#map-text").append('span').html('Last Updated: ' + MapOptions.last_update_date);
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
        .attr('preserveAspectRatio', 'xMinYMin meet')
        .attr('viewBox', '0 0 ' + MapOptions.targetWidth + ' ' + MapOptions.targetHeight)
        .classed('svg-content-responsive', true);

    var g = svg.append('g');

    var albersProjection = d3.geoAlbersUsa()
        .scale(950)
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
}

function updateMap() {
    if (!MapOptions.disableAutoUpdates) {
        let settings = getCurrentSettings();
        d3.selectAll('path')
            .transition()
            .duration(1000)
            .attr('fill', getColorMapFunction(MapOptions.currentField, settings));
        drawLegend(settings);
    }
}

function initializeMap() {
    initializeControls();
    loadSettings(FieldDetails[MapOptions.currentField]);
    MapOptions.disableAutoUpdates = false;

    d3.json('2020-03-28-metadata.json', function (metadata) {
        updateMetadata(metadata);
        d3.json('2020-03-28-cases-healthcare-history.geojson', function (geojson) {
            drawMap(geojson);
            drawLegend(getCurrentSettings());
        });
    });
}

