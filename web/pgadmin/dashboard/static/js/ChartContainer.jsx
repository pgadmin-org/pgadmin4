/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import PropTypes from 'prop-types';
import { Box, Card, CardContent, CardHeader, makeStyles } from '@material-ui/core';

import EmptyPanelMessage from '../../../static/js/components/EmptyPanelMessage';


const useStyles = makeStyles((theme) => ({
  chartCard: {
    border: '1px solid '+theme.otherVars.borderColor,
  },
  chartCardContent: {
    padding: '0.25rem 0.5rem',
    height: '165px',
    display: 'flex',
  },
  chartLegend: {
    marginLeft: 'auto',
    '& > div': {
      display: 'flex',
      fontWeight: 'normal',

      '& .legend-value': {
        marginLeft: '4px',
        '& .legend-label': {
          marginLeft: '4px',
        }
      }
    }
  }
}));

export default function ChartContainer(props) {
  const classes = useStyles();

  return (
    <Card className={classes.chartCard} elevation={0} data-testid="chart-container">
      <CardHeader title={<Box display="flex" justifyContent="space-between">
        <div id={props.id}>{props.title}</div>
        <div className={classes.chartLegend}>
          <div className="d-flex">
            {props.datasets?.map((datum)=>(
              <div className="legend-value" key={datum.label}>
                <span style={{backgroundColor: datum.borderColor}}>&nbsp;&nbsp;&nbsp;&nbsp;</span>
                <span className="legend-label">{datum.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Box>} />
      <CardContent className={classes.chartCardContent}>
        {!props.errorMsg && !props.isTest && props.children}
        {props.errorMsg && <EmptyPanelMessage text={props.errorMsg}/>}
      </CardContent>
    </Card>
  );
}

ChartContainer.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  datasets: PropTypes.array.isRequired,
  children: PropTypes.node.isRequired,
  errorMsg: PropTypes.string,
  isTest: PropTypes.bool
};
