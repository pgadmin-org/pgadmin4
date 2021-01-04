/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import PropTypes from 'prop-types';

export function ChartContainer(props) {
  return (
    <div className="card dashboard-graph" role="object-document" tabIndex="0" aria-labelledby={props.id}>
      <div className="card-header">
        <div className="d-flex">
          <div id={props.id}>{props.title}</div>
          <div className="ml-auto my-auto legend" ref={props.legendRef}></div>
        </div>
      </div>
      <div className="card-body dashboard-graph-body">
        <div className={'chart-wrapper ' + (props.errorMsg ? 'd-none': '')}>
          {props.children}
        </div>
        <ChartError message={props.errorMsg} />
      </div>
    </div>
  );
}

ChartContainer.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  legendRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.any }),
  ]).isRequired,
  children: PropTypes.node.isRequired,
  errorMsg: PropTypes.string,
};

export function ChartError(props) {
  if(props.message === null) {
    return  <></>;
  }
  return (
    <div className="pg-panel-error pg-panel-message" role="alert">{props.message}</div>
  );
}

ChartError.propTypes = {
  message: PropTypes.string,
};

export function DashboardRow({children}) {
  return (
    <div className="row dashboard-row">{children}</div>
  );
}
DashboardRow.propTypes = {
  children: PropTypes.node.isRequired,
};

export function DashboardRowCol({breakpoint, parts, children}) {
  return (
    <div className={`col-${breakpoint}-${parts}`}>{children}</div>
  );
}

DashboardRowCol.propTypes = {
  breakpoint: PropTypes.oneOf(['xs', 'sm', 'md', 'lg', 'xl']).isRequired,
  parts: PropTypes.number.isRequired,
  children: PropTypes.node.isRequired,
};
