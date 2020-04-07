FieldDetails = {
    area: {label: "Area/County"},
    area_type: {label: "Type"},
    cases: {label: "Total Cases", colorScheme: "Greys", format: ',d', logScaleColors: true},
    deaths: {label: "Deaths", colorScheme: "Blues", format: ',d', logScaleColors: true},
    increase: {label: "New Cases Today", colorScheme: "RdPu", format: ',d', logScaleColors: true},
    population: {label: "Population", colorScheme: "Greens", format: ',d', logScaleColors: true, forceColorMin: 50000},
    cases_per_10k_people: {label: "Cases per 10,000 People", colorScheme: "Oranges", format: '.2f', logScaleColors: true},
    increase_per_10k_people: {label: "New Cases per 10,000", colorScheme: "RdPu", format: '.2f', logScaleColors: true},
    cases_per_bed: {label: "Cases per Hospital Bed", colorScheme: "Reds", format: '.2f', logScaleColors: true},
    cases_per_icu_bed: {label: "Cases per ICU Bed", colorScheme: "Reds", format: '.2f', logScaleColors: true},
    hospitals: {label: "# of Hospitals", format: ',d', logScaleColors: true},
    hospital_beds: {label: "# of Hospital Beds", format: ',d', logScaleColors: true},
    icu_beds: {label: "# of ICU Beds", format: ',d', logScaleColors: true},
    doubling: {label: "Doubling Time (days)", format: '.1f', logScaleColors: false, colorScheme: "custom-doubling", forceColorMax: 10, sortAscending: false },
    deaths_increase: {label: "New Deaths", colorScheme: "Blues", format: ',d', logScaleColors: true},
    deaths_per_10k_people: {label: "Deaths per 10,000", colorScheme: "Blues", format: '.2f', logScaleColors:true},
    providers: {label: "Healthcare Providers", colorScheme: 'YlGn', format: ',d', logScaleColors:true},
    all_healthcare_at_risk: {label: "Healthare Providers and Others at Risk", colorScheme: 'YlGn', format: ',d', logScaleColors:true}
};
MapOptions = {
    colorSchemes: ['Blues', 'Greens', 'Greys', 'Oranges', 'Purples', 'Reds', 'Turbo', 'Viridis', 'Inferno', 'Magma', 'Cividis', 'Warm', 'Cool', 'CubehelixDefault', 'BuGn', 'BuPu', 'GnBu','OrRd', 'PuBuGn','PuBu','PuRd','RdPu','YlGnBu','YlGn','YlOrBr','YlOrRd','Rainbow','Sinebow'],
    fieldOptions: ['cases_per_icu_bed', 'cases_per_10k_people', 'increase', 'increase_per_10k_people', 'deaths', 'deaths_increase', 'deaths_per_10k_people', 'population', 'cases','providers','all_healthcare_at_risk'],
    tooltipFields: ['cases', 'increase', 'cases_per_10k_people', 'increase_per_10k_people', 'cases_per_icu_bed', 'cases_per_bed', 'deaths', 'deaths_increase', 'deaths_per_10k_people', 'hospitals', 'hospital_beds', 'icu_beds', 'population', 'doubling','providers','all_healthcare_at_risk'],
    tableFields: ['area', 'cases', 'cases_per_10k_people', 'increase', 'increase_per_10k_people', 'doubling', 'deaths', 'deaths_increase', 'deaths_per_10k_people', 'cases_per_icu_bed', 'cases_per_bed','hospitals','hospital_beds','icu_beds','population','providers','all_healthcare_at_risk'],

    targetWidth: 1000,
    targetHeight: 600,

    includeCounties: true,
    currentField: 'cases_per_icu_bed',
    lastUpdateDate: null,
    dateHistory: [],

    historyIndex: -1,

    allData: null,
    showTables: false,
    loadProviderData: false,
    tablesShowSelections: false,
    selectedAreaIds: []
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

    d3.select("#map-text").append('span').html(MapOptions.lastUpdateDate);
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

function drawMap(svg, geojson, states) {
    var g = svg.append('g')
        .classed('map-areas', true);

    svg.select('#loading-text').remove();

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
        .on("mouseout",  hideTooltipFunction)
        .on("click", regionClicked);

    var gs = svg.append('g')
        .classed('map-states', true);
    gs.selectAll('path')
        .data(states.features)
        .enter()
        .append('path')
        .attr('stroke','#000')
        .attr('stroke-width', 0.1)
        .attr('d', geoPath)
        .attr('fill', 'none');

    drawLegend(MapOptions.currentField, settings, svg);
}

function updateMap() {
    let settings = getCurrentSettings();
    let svg = d3.select('.map-svg');
    svg.select('.map-areas').selectAll('path')
        .transition()
        .duration(750)
        .attr('fill', getColorMapFunction(MapOptions.currentField, settings));
    drawLegend(MapOptions.currentField, settings, svg);
}

function storeProviderData(providers) {
    MapOptions.allData.forEach(function(feature) {
        providerData = providers[feature.properties.id];
        if (providerData) {
            feature.properties.providers = providerData.providers;
            feature.properties.all_healthcare_at_risk = providerData.all_healthcare_at_risk
        }
    });
}

function initializeMap(shouldDrawTables = false, loadProviderData = false) {
    MapOptions.showTables = shouldDrawTables;
    MapOptions.loadProviderData = loadProviderData;
    initializeControls();
    let svg = drawEmptyMapPlaceholder();
    const urlParams = new URLSearchParams(window.location.search);
    let metadataUrl = 'data/metadata.json';
    if (urlParams.get('test') != null && urlParams.get('test') === 'true') {
        metadataUrl = 'data/metadata-test.json'
    }

    d3.json(metadataUrl, function (metadata) {
        updateMetadata(metadata);
        d3.json('data/' + MapOptions.lastUpdateDate + '-cases-healthcare-history.geojson', function (geojson) {
            MapOptions.allData = geojson.features;
            d3.json('data/states.geojson', function(states) {
                if (loadProviderData) {
                    d3.json('data/providers.json', function(providers) {
                        storeProviderData(providers);
                        drawMap(svg, geojson, states);
                        if (MapOptions.showTables) {
                            enableTables();
                            updateTable();
                        }
                    })
                } else {
                    drawMap(svg, geojson, states);
                }
            });
        });
    });
}

