import { useRef } from 'react';
import PropTypes from 'prop-types';
export * from 'react-data-grid';

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
