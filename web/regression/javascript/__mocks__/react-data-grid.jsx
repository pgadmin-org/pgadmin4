import React, { useRef } from 'react';
import PropTypes from 'prop-types';
export * from 'react-data-grid';

 
const ReactDataGrid = React.forwardRef((props, _ref)=>{
  const ele = useRef();
  return <div id={props.id} ref={ele} data-test="react-data-grid"/>;
});

ReactDataGrid.displayName = 'ReactDataGrid';
ReactDataGrid.propTypes = {
  id: PropTypes.any
};

export default ReactDataGrid;
