
function initializeControls() {

    /*d3.select('#field-selector-options')
        .selectAll('a')
        .data(MapOptions.fieldOptions)
        .enter()
        .append('a')
        .classed('dropdown-item', true)
        .classed('field-selector-item', true)
        .attr('id', function(d) { return 'field-selector-' + d; })
        .text(function(d) { return FieldDetails[d].label })
        .on('click', function() {
            fieldSelected(this.id.substring('field-selector-'.length));
        });*/

    d3.select("#history-range")
        .on('change', function() {
            updateTimelineLabel();
            updateMap();
        });
}

function fieldSelected(field) {
    let settings = FieldDetails[field];
    if (settings != null) {
    // Update the dropdown button
        $('#field-selector-dropdown').text(settings.label);
        MapOptions.currentField = field;
        updateMap();
    }
}

function getCurrentSettings() {
    return FieldDetails[MapOptions.currentField];
}
