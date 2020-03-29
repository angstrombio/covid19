
function initializeControls() {
    var fieldSelector = d3.select("#data-field");
    fieldSelector.selectAll("option")
        .data(MapOptions.fieldOptions)
        .enter()
        .append("option")
        .text(function(d) {
            return FieldDetails[d]['label'];
        })
        .attr('value', function(d) {
            return d;
        });
    fieldSelector.on('change', function() {
        MapOptions.disableAutoUpdates = true;

        let newField = d3.select("#data-field").property('value');
        getCurrentSettings();
        loadSettings(FieldDetails[newField]);
        MapOptions.currentField = newField;
        MapOptions.disableAutoUpdates = false;
        updateMap();
    });
    let colorSelector = d3.select("#data-color-scheme");
    colorSelector.selectAll("option")
        .data(MapOptions.colorSchemes)
        .enter()
        .append("option")
        .attr('id', function(d) { return 'scheme-' + d })
        .text(function(d) { return d; })
        .attr('value', function(d) { return d; });
    colorSelector.on('change', function() {
        updateMap();
    });
    d3.select("#field-min")
        .on('change', function() {
            updateMap();
        });
    d3.select("#field-max")
        .on('change', function() {
            updateMap();
        });
    d3.select("#data-scheme-range-type")
        .on('change', function() {
            updateMap();
        });
    d3.select("#msa-only")
        .on('change', function() {
            MapOptions.includeCounties = !d3.select(this).property("checked");
            updateMap();
        });
    d3.select("#history-range")
        .on('change', function() {
            updateTimelineLabel();
            updateMap();
        });
}

function getCurrentSettings() {
    let settings = FieldDetails[MapOptions.currentField];
    settings.colorScheme = d3.select("#data-color-scheme").property('value');
    settings.min = d3.select("#field-min").property('value');
    settings.max = d3.select("#field-max").property('value');
    settings.logScaleColors = d3.select("#data-scheme-range-type").property('value');
    return settings;
}

function loadSettings(settings) {
    d3.select("#scheme-" + settings.colorScheme).property('selected', true);
    d3.select("#field-min").property('value', settings.min);
    d3.select("#field-max").property('value', settings.max);
    d3.select("#data-scheme-range-type").property('value', settings.logScaleColors);
}

