/**
 * Functions for handling optional data tables displayed below the map.
 */

/**
 * Enables the display of our data tables.
 */
function enableTables() {
    MapOptions.showTables = true;
    MapOptions.tableFields = [
        FieldDetails.area, FieldDetails.cases, FieldDetails.cases_per_10k_people, FieldDetails.increase,
        FieldDetails.increase_per_10k_people, FieldDetails.doubling, FieldDetails.deaths, FieldDetails.deaths_increase,
        FieldDetails.deaths_per_10k_people, FieldDetails.deaths_per_case, FieldDetails.cases_per_icu_bed,
        FieldDetails.cases_per_bed, FieldDetails.hospitals, FieldDetails.hospital_beds, FieldDetails.icu_beds,
        FieldDetails.population, FieldDetails.providers, FieldDetails.all_healthcare_at_risk, ];

    let table = d3.select("#county-tables")
        .append('small')
        .classed('table-responsive-xl', true)
        .append('table')
        .classed('table', true)
        .classed('table-bordered', true);

    table.append('thead').append('tr')
        .selectAll('th')
        .data(MapOptions.tableFields)
        .enter()
        .append('th')
        .text(function(field) { return field.getLabel()});

    table.append('tbody').attr('id','county-table-body');

    d3.select('#county-table-max').on('change',function() {
        updateTable();
    });
    $("input[name=table-type]:radio").change(function() {
        useSelections =  d3.select("#table-type-selected").property('checked');
        MapOptions.tablesShowSelections = useSelections;
        d3.select("#top-table-controls").style('visibility', useSelections ? 'hidden' : 'visible');
        d3.select("#selected-table-controls").style('visibility', useSelections ? 'visible' : 'hidden');
        updateTable();
    });
    $("#reset-selections").click(function() {
        console.log('reset');
        MapOptions.selectedAreaIds = [];
        updateTable();
    });
}

/**
 * Retrieves the "Top X rows" of data for display in the table, based on the controls on
 * the page and currents elected data field.
 */
function getTopTableData() {
    let field = MapOptions.currentField;
    let numRows = Number.parseInt(d3.select("#county-table-max").property('value'));
    if (Number.isNaN(numRows)) {
        numRows = 25;
    }
    let ascending = field.getSortAscending();
    if (ascending == null) {
        ascending = true;
    }
    let filtered = MapOptions.allData;
    if (!ascending) {
        filtered = filtered.filter(function (a) {
            return (field.getFieldValue(a) != null);
        });
    }
    let sortedData = filtered.sort(function (a, b) {
        let aValue = field.getFieldValue(a);
        let bValue = field.getFieldValue(b);
        if (aValue == null || aValue === '') {
            return bValue == null  || bValue === '' ? 0 : (ascending ? 1 : -1);
        } else if (bValue == null || bValue === '') {
            return ascending ? -1 : 1;
        }
        if (aValue === bValue) {
            return 0;
        } else if (aValue < bValue) {
            return ascending ? 1 : -1;
        } else {
            return ascending ? -1 : 1;
        }
    });
    return sortedData.slice(0, numRows);
}

/**
 * Retrieves data for the selected regions for display in the table.
 */
function getSelectedTableData() {
    let filtered = MapOptions.allData.filter(function(d) {
        return MapOptions.selectedAreaIds.includes(d.properties.id);
    });
    return filtered.sort(function(a, b) {
        let aPos = MapOptions.selectedAreaIds.indexOf(a);
        let bPos = MapOptions.selectedAreaIds.indexOf(b);
        if (aPos === bPos) {
            return 0;
        } else {
            return aPos > bPos ? -1 : 1;
        }
    });
}

/**
 * Refreshes the table, e.g. when table or map settings have been updated.
 */
function updateTable() {
    let tableData = MapOptions.tablesShowSelections ? getSelectedTableData() : getTopTableData();
    updateTableData(tableData);
}

/**
 * Generates a function that will get the individual cell data and format information for a row in the table.
 *
 * @param row   The data row.
 * @returns Set of cells, each containing a value, color, and alignment.
 */
function tableCellsFunction(row) {
    return MapOptions.tableFields.map(function(field) {
        let value = field.getFormattedFieldValue(row);
        let colorFunction = field.getColorMapFunction();
        let color = (colorFunction == null) ? null : colorFunction(row);
        let align = (field.isText() ? 'left' : 'right');
        return {value: value, color: color, align: align};
    });
}

/**
 * Updates the table with specified data.
 */
function updateTableData(data) {
    let rows = d3.select("#county-table-body")
        .selectAll('tr').data(data);
    let cells = rows.enter()
        .append('tr')
        .merge(rows)
        .selectAll('td');
    cells.data(tableCellsFunction)
        .enter()
        .append('td')
        .merge(cells)
        .html(function(d) { return d.value; })
        .style('background-color', function(d) { return d.color; })
        .style('color', function(d) { return isDarkColor(d.color) ? '#fff' : '#000'})
        .style('text-align', function(d) { return d.align });
    rows.exit().remove();
}
