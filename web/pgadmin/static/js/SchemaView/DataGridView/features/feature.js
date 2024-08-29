/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Feature class

// Let's not expose the features directory.
let _featureClasses = [];

export default class Feature {
  static priority = 1;

  constructor() {
    this.accessPath = this.field = this.schema = this.table = this.cols =
      this.viewHelperProps = null;
  }

  setContext({
    accessPath, field, schema, viewHelperProps, dataDispatch, schemaState
  }) {
    this.accessPath = accessPath;
    this.field = field;
    this.schema = schema;
    this.dataDispatch = dataDispatch;
    this.viewHelperProps = viewHelperProps;
    this.schemaState = schemaState;
  }

  generateColumns(/* { pgAdmin, columns, columnVisibility, options } */) {}
  onTable(/* { table, options, classList } */) {}
  onRow(/* {
    index, row, rowRef, classList, attributes,
    expandedRowContents, rowOptions, tableOptions
  } */) {}
}

function isValidFeatureClass(cls) {
  // Check if provided class is direct decendent of the Feature class
  try {
    if (Reflect.getPrototypeOf(cls) != Feature) {
      console.error(cls, 'Not a valid Feature class:');
      console.trace();
      return false;
    }
  } catch(err) {
    console.trace();
    console.error('Error while checking type:\n', err);
    return false;
  }

  return true;
}

function addToSortedList(_list, _item, _comparator = (a, b) => (a < b)) {
  // Insert the given feature class in sorted list based on the priority.
  let idx = 0;

  for (; idx < _list.length; idx++) {
    if (_comparator(_item, _list[idx])) {
      _list.splice(idx, 0, _item);
      return;
    }
  }

  _list.splice(idx, 0, _item);
}

const featurePriorityCompare = (f1, f2) => (f1.priorty < f2.priority);

export function register(cls) {

  if (!isValidFeatureClass(cls)) return;

  addToSortedList(_featureClasses, cls, featurePriorityCompare);
}

export class FeatureSet {
  constructor() {
    this.id = Date.now();
    this.features = _featureClasses.map((cls) => new cls());
  }

  addFeatures(features) {
    features.forEach((feature) => {
      if (!(feature instanceof Feature)) {
        console.error(feature, 'is not a valid feature!\n');
        console.trace();
        return;
      }
      addToSortedList(
        this.features, feature, featurePriorityCompare
      );
    });
  }

  setContext({
    accessPath, field, schema, viewHelperProps, dataDispatch, schemaState
  }) {
    this.features.forEach((feature) => {
      feature.setContext({
        accessPath, field, schema, viewHelperProps, dataDispatch, schemaState
      });
    });
  }

  generateColumns({pgAdmin, columns, columnVisibility, options}) {
    this.features.forEach((feature) => {
      feature.generateColumns({pgAdmin, columns, columnVisibility, options});
    });
  }

  onTable({table, options, classList}) {
    this.features.forEach((feature) => {
      feature.onTable({table, options, classList});
    });
  }

  onRow({
    index, row, rowRef, classList, attributes, expandedRowContents,
    rowOptions, tableOptions
  }) {
    this.features.forEach((feature) => {
      feature.onRow({
        index, row, rowRef, classList, attributes, expandedRowContents,
        rowOptions, tableOptions
      });
    });
  }
}
