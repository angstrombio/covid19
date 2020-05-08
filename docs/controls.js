/**
 * Functions related to handling various interactive controls in the HTML
 * (field selector, timeline, URL parameters and state).
 */

/**
 * Initializes the events for controls in the HTML.
 */
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
    let fieldId = urlParams.get('field');
    if (FieldDetails[fieldId] != null) {
        fieldSelected(fieldId, true, false);
    } else {
        fieldSelected(MapOptions.currentField.getFieldId(), false, false);
    }
}

/**
 * Respond to a change in selected field.
 *
 * @param fieldId           The identified for the new field.
 * @param shouldChangeState Specifies whether we should update the window history state to reflect this change.
 * @param shouldUpdateMap   Specifies whether we should update the map on this change.
 */
function fieldSelected(fieldId, shouldChangeState = true, shouldUpdateMap = true) {
    let field = FieldDetails[fieldId];
    if (field != null) {
        if (shouldChangeState) {
            window.history.pushState({field: fieldId}, document.title, "?field=" + fieldId);
        }
        d3.select('#field-button-' + MapOptions.currentField.getFieldId())
            .classed("btn-primary", false)
            .classed("btn-secondary", true);
        d3.select('#field-button-' + fieldId)
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
