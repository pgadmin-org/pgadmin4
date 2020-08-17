/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

function handleDependencies() {
  event.stopPropagation();
  let isChecked = event.target.checked || (event.target.checked === undefined &&
   event.target.className && event.target.className.indexOf('unchecked') == -1);

  let isHeaderSelected = false;
  if (event.target.id !== undefined) isHeaderSelected = event.target.id.includes('header-selector');

  if (this.gridContext && this.gridContext.rowIndex && _.isUndefined(this.gridContext.row.rows)) {
    // Single Row Selection
    let rowData = this.grid.getData().getItem(this.gridContext.rowIndex);
    this.gridContext = {};
    if (rowData.status) {
      let depRows = this.selectDependencies(rowData, isChecked);
      this.selectedRowCount = this.grid.getSelectedRows().length;
      if (isChecked && depRows.length > 0)
        this.grid.setSelectedRows(depRows);
      else if (!isChecked)
        this.grid.setSelectedRows(this.grid.getSelectedRows().filter(x => !depRows.includes(x)));

      this.ddlCompare(rowData);
    }
  } else if((this.gridContext && this.gridContext.row && !_.isUndefined(this.gridContext.row.rows)) ||
   this.selectedRowCount != this.grid.getSelectedRows().length) {

    // Group / All Rows Selection
    this.selectedRowCount = this.grid.getSelectedRows().length;

    if (this.gridContext.row && this.gridContext.row.__group) {
      let context = this.gridContext;
      this.gridContext = {};
      this.selectDependenciesForGroup(isChecked, context);
    } else {
      this.gridContext = {};
      this.selectDependenciesForAll(isChecked, isHeaderSelected);
    }
  }

  if (this.grid.getSelectedRows().length > 0) {
    this.header.$el.find('button#generate-script').removeAttr('disabled');
  } else {
    this.header.$el.find('button#generate-script').attr('disabled', true);
  }
}

function selectDependenciesForGroup(isChecked, context) {
  let self = this,
    finalRows = [];

  if (!isChecked) {
    _.each(context.row.rows, function(row) {
      if (row && row.status && row.status.toLowerCase() != 'identical' ) {
        let d = self.selectDependencies(row, isChecked);
        finalRows = finalRows.concat(d);
      }
    });
  }
  else {
    _.each(self.grid.getSelectedRows(), function(row) {
      let data = self.grid.getData().getItem(row);
      if (data.status && data.status.toLowerCase() != 'identical') {
        finalRows = finalRows.concat(self.selectDependencies(data, isChecked));
      }
    });
  }

  finalRows = [...new Set(finalRows)];

  if (isChecked)
    self.grid.setSelectedRows(finalRows);
  else {
    let filterRows = [];
    filterRows = self.grid.getSelectedRows().filter(x => !finalRows.includes(x));

    self.selectedRowCount = filterRows.length;
    self.grid.setSelectedRows(filterRows);
  }
}

function selectDependenciesForAll(isChecked, isHeaderSelected) {
  let self = this,
    finalRows = [];

  if(!isChecked && isHeaderSelected) {
    self.dataView.getItems().map(function(el) {
      el.dependentCount = [];
      el.dependLevel = 1;
    });
    self.selectedRowCount = 0;
    return;
  }

  _.each(self.grid.getSelectedRows(), function(row) {
    let data = self.grid.getData().getItem(row);
    if (data.status) {
      finalRows = finalRows.concat(self.selectDependencies(data, isChecked));
    }
  });

  finalRows = [...new Set(finalRows)];

  if (isChecked && finalRows.length > 0)
    self.grid.setSelectedRows(finalRows);
  else if (!isChecked) {
    let filterRows = [];
    filterRows = self.grid.getSelectedRows().filter(x => !finalRows.includes(x));

    self.selectedRowCount = filterRows.length;
    self.grid.setSelectedRows(filterRows);
  }
}


function selectDependencies(data, isChecked) {
  let self = this,
    rows = [],
    setDependencies = undefined,
    setOrigDependencies = undefined,
    finalRows = [];

  if (!data.dependLevel || !isChecked) data.dependLevel = 1;
  if (!data.dependentCount || !isChecked) data.dependentCount = [];

  if (data.status && data.status.toLowerCase() == 'identical') {
    self.selectedRowCount = self.grid.getSelectedRows().length;
    return [];
  }

  setDependencies = function(rowData, dependencies, isChecked) {
    // Special handling for extension, if extension is present in the
    // dependency list then iterate and select only extension node.
    let extensions = dependencies.filter(item => item.type  == 'extension');
    if (extensions.length > 0) dependencies = extensions;

    _.each(dependencies, function(dependency) {
      if (dependency.length == 0) return;
      let dependencyData = [];

      dependencyData = self.dataView.getItems().filter(item => item.type  == dependency.type && item.oid == dependency.oid);

      if (dependencyData.length > 0) {
        dependencyData = dependencyData[0];
        if (!dependencyData.dependentCount) dependencyData.dependentCount = [];

        let groupData = [];

        if (dependencyData.status && dependencyData.status.toLowerCase() != 'identical') {
          groupData = self.dataView.getGroups().find(
            (item) => { if (dependencyData.group_name == item.groupingKey) return item.groups; }
          );

          if (groupData && groupData.groups) {
            groupData = groupData.groups.find(
              (item) => { return item.groupingKey == dependencyData.group_name + ':|:' + dependencyData.type; }
            );

            if (groupData && groupData.collapsed == 1)
              self.dataView.expandGroup(dependencyData.group_name + ':|:' + dependencyData.type);
          }

          if (isChecked || _.isUndefined(isChecked)) {
            dependencyData.dependLevel = rowData.dependLevel + 1;
            if (dependencyData.dependentCount.indexOf(rowData.oid) === -1)
              dependencyData.dependentCount.push(rowData.oid);
            rows[rows.length] = dependencyData;
          } else {
            dependencyData.dependentCount.splice(dependencyData.dependentCount.indexOf(rowData.oid), 1);
            if (dependencyData.dependentCount.length == 0) {
              rows[rows.length] = dependencyData;
              dependencyData.dependLevel = 1;
            }
          }
        }
        if (Object.keys(dependencyData.dependencies).length > 0) {
          if (dependencyData.dependentCount.indexOf(rowData.oid) !== -1 ) {
            let depCirRows = dependencyData.dependencies.filter(x => x.oid !== rowData.oid);
            if (!dependencyData.orig_dependencies)
              dependencyData.orig_dependencies = Object.assign([], dependencyData.dependencies);
            dependencyData.dependencies = depCirRows;
          }
          setDependencies(dependencyData, dependencyData.dependencies, isChecked);
        }
      }
    });
  };

  setDependencies(data, data.dependencies, isChecked);

  setOrigDependencies = function(dependencies) {
    _.each(dependencies, function(dependency) {
      if (dependency.length == 0) return;
      let dependencyData = [];

      dependencyData = self.dataView.getItems().filter(item => item.type  == dependency.type && item.oid == dependency.oid);

      if (dependencyData.length > 0) {
        dependencyData = dependencyData[0];

        if (dependencyData.orig_dependencies && Object.keys(dependencyData.orig_dependencies).length > 0) {
          if (!dependencyData.dependentCount) dependencyData.dependentCount = [];

          if (dependencyData.status && dependencyData.status.toLowerCase() != 'identical') {
            dependencyData.dependencies = dependencyData.orig_dependencies;
            dependencyData.orig_dependencies = [];
          }
          if (dependencyData.dependencies.length > 0) {
            setOrigDependencies(dependencyData.dependencies);
          }
        }
      }
    });
  };

  setOrigDependencies(data.dependencies);

  if (isChecked) finalRows = self.grid.getSelectedRows();

  _.each(rows, function(row) {
    let r = self.grid.getData().getRowByItem(row);
    if(!_.isUndefined(r) && finalRows.indexOf(r) === -1 ) {
      finalRows.push(self.grid.getData().getRowByItem(row));
    }
  });

  self.selectedRowCount = finalRows.length;
  return finalRows;
}

export {
  handleDependencies,
  selectDependenciesForGroup,
  selectDependenciesForAll,
  selectDependencies,
};
