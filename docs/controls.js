
function initializeControls() {
    var fieldSelector = d3
        .selectAll(".layer-selection-label")
        .selectAll('input')
        .on('change', function(d) {
            const selection = this.value;
            Map.disableAutoUpdates = true;
            let newField = this.value;
            loadSettings(FieldDetails[newField]);
            MapOptions.currentField = newField;
            MapOptions.disableAutoUpdates = false;
            updateMap();
        });
    d3.select("#history-range")
        .on('change', function() {
            updateTimelineLabel();
            updateMap();
        });
}

function getCurrentSettings() {
    return FieldDetails[MapOptions.currentField];
}

function loadSettings(settings) {
    d3.select("#scheme-" + settings.colorScheme).property('selected', true);
}

