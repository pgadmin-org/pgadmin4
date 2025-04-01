/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React from 'react';
import { styled } from '@mui/material/styles';
import PropTypes from 'prop-types';
import { Box, Card, CardContent, CardHeader } from '@mui/material';

import EmptyPanelMessage from '../../../../static/js/components/EmptyPanelMessage';

const StyledCard = styled(Card)(({theme}) => ({
  border: '1px solid '+theme.otherVars.borderColor,
  height: '100%',
  '& .ChartContainer-chartLegend': {
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
  },
  '& .ChartContainer-cardContent': {
    padding: '0.25rem 0.5rem',
    height: '165px',
    display: 'flex',
  }
}));

export default function ChartContainer(props) {


  return (
    <StyledCard elevation={0} data-testid="chart-container">
      <CardHeader title={<Box display="flex" justifyContent="space-between">
        <div id={props.id}>{props.title}</div>
        <div className='ChartContainer-chartLegend'>
          <div style={{display: 'flex', flexWrap: 'wrap'}}>
            {props.datasets?.map((datum)=>(
              <div className="legend-value" key={datum.label}>
                <span style={{backgroundColor: datum.borderColor}}>&nbsp;&nbsp;&nbsp;&nbsp;</span>
                <span className="legend-label">{datum.label}</span>
              </div>
            ))}
          </div>
        </div>
      </Box>} />
      <CardContent className='ChartContainer-cardContent'>
        {!props.errorMsg && !props.isTest && props.children}
        {props.errorMsg && <EmptyPanelMessage text={props.errorMsg}/>}
      </CardContent>
    </StyledCard>
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
