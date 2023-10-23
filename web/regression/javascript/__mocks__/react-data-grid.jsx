import React, { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
export * from 'react-data-grid';

// eslint-disable-next-line no-unused-vars
const ReactDataGrid = React.forwardRef((props, ref)=>{
  const ele = useRef();

  useEffect(()=>{
    ref = {
      selectCell: jest.fn(),
      element: ele.current,
    };
  }, [ele.current]);

  return <div id={props.id} ref={ele} data-test="react-data-grid"/>;
});

ReactDataGrid.displayName = 'ReactDataGrid';
ReactDataGrid.propTypes = {
  id: PropTypes.any
};

export default ReactDataGrid;
