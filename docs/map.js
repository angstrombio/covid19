FieldDetails = {
    area: {label: "Area/County", hasHistory: false},
    area_type: {label: "Type", hasHistory: false},
    cases: {label: "Total Cases", colorScheme: "Greys", format: ',d', logScaleColors: true, hasHistory: true},
    deaths: {label: "Deaths", colorScheme: "Blues", format: ',d', logScaleColors: true, hasHistory: true},
    increase: {label: "New Cases Today", colorScheme: "RdPu", format: ',d', logScaleColors: true, hasHistory: true},
    population: {label: "Population", colorScheme: "Greens", format: ',d', logScaleColors: true, forceColorMin: 50000, hasHistory: false},
    cases_per_10k_people: {label: "Cases per 10,000 People", colorScheme: "Oranges", format: '.2f', logScaleColors: true, hasHistory: true},
    increase_per_10k_people: {label: "New Cases per 10,000", colorScheme: "RdPu", format: '.2f', logScaleColors: true, hasHistory: true},
    cases_per_bed: {label: "Cases per Hospital Bed", colorScheme: "Reds", format: '.2f', logScaleColors: true, hasHistory: true},
    cases_per_icu_bed: {label: "Cases per ICU Bed", colorScheme: "Reds", format: '.2f', logScaleColors: true, hasHistory: true},
    hospitals: {label: "# of Hospitals", format: ',d', logScaleColors: true, hasHistory: false},
    hospital_beds: {label: "# of Hospital Beds", format: ',d', logScaleColors: true, hasHistory: false},
    icu_beds: {label: "# of ICU Beds", format: ',d', logScaleColors: true, hasHistory: false},
    doubling: {label: "Doubling Time (days)", format: '.1f', logScaleColors: false, colorScheme: "custom-doubling", forceColorMax: 10, sortAscending: false, hasHistory: true},
    deaths_increase: {label: "New Deaths", colorScheme: "Blues", format: ',d', logScaleColors: true, hasHistory: true},
    deaths_per_10k_people: {label: "Deaths per 10,000", colorScheme: "Blues", format: '.2f', logScaleColors:true, hasHistory: true},
    providers: {label: "Healthcare Providers", colorScheme: 'YlGn', format: ',d', logScaleColors:true, hasHistory: false},
    all_healthcare_at_risk: {label: "Healthare Providers and Others at Risk", colorScheme: 'YlGn', format: ',d', logScaleColors:true, hasHistory: false},
    deaths_per_case: {label: "Deaths / Case", colorScheme: "Blues", format: '.4f', logScaleColors: true, hasHistory: true}
};
MapOptions = {
    colorSchemes: ['Blues', 'Greens', 'Greys', 'Oranges', 'Purples', 'Reds', 'Turbo', 'Viridis', 'Inferno', 'Magma', 'Cividis', 'Warm', 'Cool', 'CubehelixDefault', 'BuGn', 'BuPu', 'GnBu','OrRd', 'PuBuGn','PuBu','PuRd','RdPu','YlGnBu','YlGn','YlOrBr','YlOrRd','Rainbow','Sinebow'],
    fieldOptions: ['cases_per_icu_bed', 'cases_per_10k_people', 'increase', 'increase_per_10k_people', 'deaths', 'deaths_increase', 'deaths_per_10k_people', 'population', 'cases','providers','all_healthcare_at_risk'],
    tooltipFields: ['cases', 'increase', 'cases_per_10k_people', 'increase_per_10k_people', 'cases_per_icu_bed', 'cases_per_bed', 'deaths', 'deaths_increase', 'deaths_per_10k_people', 'hospitals', 'hospital_beds', 'icu_beds', 'population', 'doubling','providers','all_healthcare_at_risk','deaths_per_case'],
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
    if (MapOptions.historyIndex >= 0 && FieldDetails[field].hasHistory) {
        let history = d.properties[field + "_history"];
        if (history == null) {
            return null;
        }
        if (MapOptions.historyIndex >= history.length) {
            return null;
        }
        return history[MapOptions.historyIndex];
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
    let baseGroup = svg.append('g').classed('map-zoom-items', true);
    let g = baseGroup.append('g')
        .classed('map-areas', true);

    svg.select('#loading-text').remove();

    let albersProjection = d3.geoAlbersUsa()
        .scale(1200)
        .translate([MapOptions.targetWidth/2, MapOptions.targetHeight/2]);

    let geoPath = d3.geoPath().projection(albersProjection);

    let settings = getCurrentSettings();

    g.selectAll('path')
        .data(geojson.features)
        .enter()
        .append('path')
        .attr('fill', getColorMapFunction(MapOptions.currentField, settings))
        .attr('stroke', '#bbb')
        .attr('stroke-width', 0.1)
        .attr('d', geoPath)
        .on("mouseover", getShowTooltipFunction())
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
    drawLegend(MapOptions.currentField, settings, baseGroup);
}

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

