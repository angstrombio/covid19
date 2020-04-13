
function initializeControls() {
    d3.select("#history-range")
        .on('change', function() {
            updateTimelineLabel();
            updateMap();
        });

    window.onpopstate = function(event) {
        let state = event.state;
        if (state == null || state.field == null || FieldDetails[state.field] == null) {
            fieldSelected('cases_per_icu_bed', false);
        } else {
            fieldSelected(state.field, false);
        }
    };

    const urlParams = new URLSearchParams(window.location.search);
    let field = urlParams.get('field');
    if (FieldDetails[field] != null) {
        fieldSelected(field, true, false);
    }
}

function fieldSelected(field, shouldChangeState = true, shouldUpdateMap = true) {
    let settings = FieldDetails[field];
    if (settings != null) {
        if (shouldChangeState) {
            window.history.pushState({field: field}, document.title, "?field=" + field);
        }
        d3.select('#field-button-' + MapOptions.currentField)
            .classed("btn-primary", false)
            .classed("btn-secondary", true);
        d3.select('#field-button-' + field)
            .classed("btn-primary", true)
            .classed("btn-secondary", false);
        MapOptions.currentField = field;
        if (shouldUpdateMap) {
            updateMap();
            if (MapOptions.showTables) {
                updateTable();
            }
        }
    }
}

function getCurrentSettings() {
    return FieldDetails[MapOptions.currentField];
}
