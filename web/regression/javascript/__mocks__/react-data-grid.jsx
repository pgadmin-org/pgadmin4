import { useRef } from 'react';
import PropTypes from 'prop-types';

// react-data-grid ships ESM-only; babel-jest can't transform it in
// place. jest.config.js routes the module to this mock via
// moduleNameMapper. Re-exporting from the real module here would
// defeat the alias (it would resolve back to this file). Instead,
// provide named-export stubs for the few symbols schema-ui files
// import at module load time. Tests that need richer behaviour can
// jest.doMock and replace these.
export const Row = () => null;
export const Cell = () => null;
export const TextEditor = () => null;
export const SelectColumn = {};
export const headerRenderer = () => null;
export const valueFormatter = (v) => (v == null ? '' : String(v));

export const DataGrid = (
  {
    ref: _ref,
    ...props
  }
) => {
  const ele = useRef();
  return <div id={props.id} ref={ele} data-test="react-data-grid"/>;
};

DataGrid.displayName = 'DataGrid';
DataGrid.propTypes = {
  id: PropTypes.any
};
