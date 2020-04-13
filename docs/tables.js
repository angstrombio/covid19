function enableTables() {
    MapOptions.showTables = true;

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
        // TODO class
        .text(function(field) { return FieldDetails[field].label});

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

function getTopTableData() {
    let field = MapOptions.currentField;
    let numRows = Number.parseInt(d3.select("#county-table-max").property('value'));
    if (Number.isNaN(numRows)) {
        numRows = 10;
    }
    let ascending = FieldDetails[field].sortAscending;
    if (ascending == null) {
        ascending = true;
    }
    let filtered = MapOptions.allData;
    if (!ascending) {
        filtered = filtered.filter(function (a) {
            return (a.properties[field] != null);
        });
    }
    let sortedData = filtered.sort(function (a, b) {
        let aValue = a.properties[field];
        let bValue = b.properties[field];
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

function updateTable() {
    let tableData = MapOptions.tablesShowSelections ? getSelectedTableData() : getTopTableData();
    updateTableData(tableData);
}

function tableCellsFunction(row) {
    return MapOptions.tableFields.map(function(col) {
        let fieldFormat = FieldDetails[col].format;
        let value = row.properties[col];
        if (value == null) {
            value = '';
        } else if (fieldFormat != null) {
            value = d3.format(fieldFormat)(value);
        }
        let colorFunction = getColorMapFunction(col, FieldDetails[col]);
        let color = null;
        if (colorFunction != null) {
            color = colorFunction(row);
        }
        let align = (col === 'area' ? 'left' : 'right');
        return {value: value, color: color, align: align};
    });
}

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
