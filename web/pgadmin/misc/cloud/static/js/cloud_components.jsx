/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import { ToggleButton, ToggleButtonGroup, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import { DefaultButton, PrimaryButton } from '../../../../static/js/components/Buttons';
import PropTypes from 'prop-types';
import { getAWSSummary } from './aws';
import  {getAzureSummary} from './azure';
import { getBigAnimalSummary } from './biganimal';
import gettext from 'sources/gettext';
import { getGoogleSummary } from './google';
import { CLOUD_PROVIDERS_LABELS } from './cloud_constants';
import Table from '../../../../static/js/components/Table';


export function ToggleButtons(props) {

  const handleCloudProvider = (event, provider) => {
    if (provider) props.setCloudProvider(provider);
  };

  return (
    <ToggleButtonGroup
      color="primary"
      value={props.cloudProvider}
      onChange={handleCloudProvider}
      sx={{ height: '100px', flexGrow: '1'}}
      orientation="vertical"
      exclusive>
      {
        (props.options||[]).map((option)=>{
          return (<ToggleButton value={option.value} key={option.label} aria-label={option.label} sx={{marginTop: '0px !important',padding: '12px'}} className={( option.label==gettext(CLOUD_PROVIDERS_LABELS.GOOGLE) ? 'paddingLeft: 1.5rem' : null )} component={props.cloudProvider == option.value ? PrimaryButton : DefaultButton}>
            <CheckRoundedIcon style={{visibility: props.cloudProvider == option.value  ? 'visible': 'hidden'}}/>&nbsp;
            {option.icon}&nbsp;&nbsp;&nbsp;&nbsp;{option.label}
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
  let summary = [],
    summaryHeader = ['Cloud Details', 'Version and Instance Details', 'Storage Details', 'Database Details'];

  if (props.cloudProvider == 'biganimal') {
    summary = getBigAnimalSummary(props.cloudProvider, props.clusterTypeData, props.instanceData, props.databaseData);
    summaryHeader = ['Cloud Details',  'Cluster Details' ,'Version Details', 'Storage Details', 'Database Details'];
  } else if(props.cloudProvider == 'azure') {
    summaryHeader.push('Network Connectivity','Availability');
    summary = getAzureSummary(props.cloudProvider, props.instanceData, props.databaseData);
  }else if(props.cloudProvider == 'google') {
    summaryHeader.push('Network Connectivity','Availability');
    summary = getGoogleSummary(props.cloudProvider, props.instanceData, props.databaseData);
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
      <Table key={summaryHeader[index]}>
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
