import React, { useRef } from 'react';
import PropTypes from 'prop-types';
export * from 'react-data-grid';

const DataGrid = React.forwardRef((props, _ref)=>{
  const ele = useRef();
  return <div id={props.id} ref={ele} data-test="react-data-grid"/>;
});

DataGrid.displayName = 'DataGrid';
DataGrid.propTypes = {
  id: PropTypes.any
};

export {DataGrid};
