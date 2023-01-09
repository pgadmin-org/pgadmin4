/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import { ToggleButton, ToggleButtonGroup } from '@material-ui/lab';
import CheckRoundedIcon from '@material-ui/icons/CheckRounded';
import { DefaultButton, PrimaryButton } from '../../../../static/js/components/Buttons';
import { makeStyles } from '@material-ui/core/styles';
import PropTypes from 'prop-types';
import { getAWSSummary } from './aws';
import  {getAzureSummary} from './azure';
import { getBigAnimalSummary } from './biganimal';
import { commonTableStyles } from '../../../../static/js/Theme';
import { Table, TableBody, TableCell, TableHead, TableRow } from '@material-ui/core';
import clsx from 'clsx';
import gettext from 'sources/gettext';


const useStyles = makeStyles(() =>
  ({
    toggleButton: {
      height: '100px',
    },
  }),
);


export function ToggleButtons(props) {
  const classes = useStyles();

  const handleCloudProvider = (event, provider) => {
    if (provider) props.setCloudProvider(provider);
  };

  return (
    <ToggleButtonGroup
      color="primary"
      value={props.cloudProvider}
      onChange={handleCloudProvider}
      className={classes.toggleButton}
      exclusive>
      {
        (props.options||[]).map((option)=>{
          return (<ToggleButton value={option.value} key={option.label} aria-label={option.label} component={props.cloudProvider == option.value ? PrimaryButton : DefaultButton}>
            <CheckRoundedIcon style={{visibility: props.cloudProvider == option.value  ? 'visible': 'hidden'}}/>&nbsp;
            {option.icon}&nbsp;&nbsp;{option.label}
          </ToggleButton>);
        })
      }
    </ToggleButtonGroup>
  );
}
ToggleButtons.propTypes = {
  setCloudProvider: PropTypes.func,
  cloudProvider: PropTypes.string,
  options: PropTypes.array,
};


export function FinalSummary(props) {
  const tableClasses = commonTableStyles();
  let summary = [],
    summaryHeader = ['Cloud Details', 'Version and Instance Details', 'Storage Details', 'Database Details'];

  if (props.cloudProvider == 'biganimal') {
    summary = getBigAnimalSummary(props.cloudProvider, props.clusterTypeData, props.instanceData, props.databaseData);
    summaryHeader = ['Cloud Details',  'Cluster Details' ,'Version Details', 'Storage Details', 'Database Details'];
  } else if(props.cloudProvider == 'azure') {
    summaryHeader.push('Network Connectivity','Availability');
    summary = getAzureSummary(props.cloudProvider, props.instanceData, props.databaseData);
  }else {
    summaryHeader.push('Availability');
    summary = getAWSSummary(props.cloudProvider, props.instanceData, props.databaseData);
  }

  const displayTableRows = (rows) => {
    return rows.map((row) => (
      <TableRow key={row.name} >
        <TableCell scope="row">{row.name}</TableCell>
        <TableCell align="right">{row.value}</TableCell>
      </TableRow>
    ));
  };

  return summary.map((item, index) => {
    return (
      <Table key={index} className={clsx(tableClasses.table)}>
        <TableHead>
          <TableRow>
            <TableCell colSpan={2}>{gettext(summaryHeader[index])}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {displayTableRows(item)}
        </TableBody>
      </Table>
    );
  });
}
FinalSummary.propTypes = {
  cloudProvider: PropTypes.string,
  instanceData: PropTypes.object,
  databaseData: PropTypes.object,
  clusterTypeData: PropTypes.object,
};
