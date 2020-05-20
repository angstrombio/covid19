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
            fieldSelected('cases_per_icu_bed', false, false);
        } else {
            fieldSelected(state.field, false, false);
        }
        if (state != null) {
            let compare = state.compare;
            let selected = state.selections;
            if (compare != null && compare === 'top') {
                MapOptions.showTables = true;
                MapOptions.tablesShowSelections = false;
                MapOptions.selectedAreaIds = [];
            } else if (compare != null && compare === 'selected') {
                MapOptions.showTables = true;
                MapOptions.tablesShowSelections = true;
                MapOptions.selectedAreaIds = state.selections;
            } else {
                MapOptions.showTables = false;
                MapOptions.tablesShowSelections = false;
                MapOptions.selectedAreaIds = [];
            }
        }
        updateMap();
        if (MapOptions.showTables) {
            updateTable();
        }

    };

    const urlParams = new URLSearchParams(window.location.search);
    let fieldId = urlParams.get('field');
    if (FieldDetails[fieldId] != null) {
        fieldSelected(fieldId, false, false);
    } else {
        fieldSelected(MapOptions.currentField.getFieldId(), false, false);
    }
    let showTables = urlParams.get('compare');
    MapOptions.showTables = false;
    if (showTables != null) {
        if (showTables === 'true' || showTables === 'top') {
            MapOptions.showTables = true;
            MapOptions.tablesShowSelections = false;
        } else if (showTables === 'selected') {
            MapOptions.showTables = true;
            MapOptions.tablesShowSelections = true;
        }
    }
    let selectedRegions = urlParams.get('selections');
    if (selectedRegions != null && selectedRegions.length > 1) {
        let selections = selectedRegions.split(',');
        // Verify that these appear to be valid IDs
        let valid = true;
        for (i = 0; i < selections.length; i++) {
            if (isNaN(selections[i]) || parseInt(selections[i]) > 99999 || parseInt(selections[i]) <= 0) {
                valid = false;
                break;
            }
        }
        if (valid) {
            MapOptions.selectedAreaIds = selections;
        }
    }
    updateUrlState();
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
            updateUrlState(fieldId);
        }
        d3.select('#field-button-' + MapOptions.currentField.getFieldId())
            .classed("btn-primary", false)
            .classed("btn-secondary", true);
        d3.select('#field-button-' + fieldId)
            .classed("btn-primary", true)
            .classed("btn-secondary", false);
        let dropdownLabel = $('#field-selector-' + field.getFieldId()).text();
        $('#field-selector-dropdown').text(dropdownLabel);
        MapOptions.currentField = field;
        if (shouldUpdateMap) {
            updateMap();
            if (MapOptions.showTables) {
                updateTable();
                d3.select('.table-header-link-selected').classed('table-header-link-selected', false);
                d3.select('#table-header-' + fieldId).classed('table-header-link-selected', true);
            }
        }
    }
}

/**
 * Updates the URL state to reflect controls used on the map/tables.
 *
 * @param forceFieldId If non-null, this field ID will be saved.  Otherwise, the current field ID is saved.
 */
function updateUrlState(forceFieldId = null) {
    if (forceFieldId == null) {
        forceFieldId = MapOptions.currentField.getFieldId();
    }
    let url = '?field=' + forceFieldId;
    let data = { field: forceFieldId, compare: null, selections: [] };
    if (MapOptions.showTables) {
        if (MapOptions.tablesShowSelections) {
            url += '&compare=selected';
            data.compare = 'selected';
            if (MapOptions.selectedAreaIds != null && MapOptions.selectedAreaIds.length > 0) {
                url += '&selections=' + MapOptions.selectedAreaIds.join(',');
                data.selections = MapOptions.selectedAreaIds;
            }
        } else {
            url += '&compare=top';
            data.compare = 'top';
        }
    }
    window.history.pushState(data, document.title, url);
}