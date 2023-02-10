/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import React, { useEffect, useState, useRef } from 'react';
import { Box, Grid, InputLabel } from '@material-ui/core';
import PropTypes from 'prop-types';
import { DefaultButton } from '../../../static/js/components/Buttons';
import { makeStyles } from '@material-ui/styles';
import { InputText } from '../../../static/js/components/FormComponents';
import getApiInstance from '../../../static/js/api_instance';
import { copyToClipboard } from '../../../static/js/clipboard';
import Notify from '../../../static/js/helpers/Notifier';
import { useDelayedCaller } from '../../../static/js/custom_hooks';


const useStyles = makeStyles((theme)=>({
  container: {
    padding: '16px',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
  },
  copyBtn: {
    marginRight: '1px',
    float: 'right',
    borderColor: theme.otherVars.borderColor,
    fontSize: '13px',
  },
}));

export default function AboutComponent() {
  const classes = useStyles();
  const containerRef = useRef();
  const [aboutData, setAboutData] = useState([]);
  const [copyText, setCopyText] = useState(gettext('Copy'));
  const revertCopiedText = useDelayedCaller(()=>{
    setCopyText(gettext('Copy'));
  });

  useEffect(() => {
    const about_url = url_for('about.index');
    const api = getApiInstance();

    api.get(about_url).then((res)=>{
      setAboutData(res.data.data);
    }).catch((err)=>{
      Notify.error(err);
    });
  }, []);

  return (
    <Box className={classes.container} ref={containerRef}>
      <Grid container spacing={0} style={{marginBottom: '8px'}}>
        <Grid item lg={3} md={3} sm={3} xs={12}>
          <InputLabel style={{fontWeight: 'bold'}}>{gettext('Version')}</InputLabel>
        </Grid>
        <Grid item lg={9} md={9} sm={9} xs={12}>
          <InputLabel>{aboutData.version}</InputLabel>
        </Grid>
      </Grid>
      <Grid container spacing={0} style={{marginBottom: '8px'}}>
        <Grid item lg={3} md={3} sm={3} xs={12}>
          <InputLabel style={{fontWeight: 'bold'}}>{gettext('Application Mode')}</InputLabel>
        </Grid>
        <Grid item lg={9} md={9} sm={9} xs={12}>
          <InputLabel>{aboutData.app_mode}</InputLabel>
        </Grid>
      </Grid>
      <Grid container spacing={0} style={{marginBottom: '8px'}}>
        <Grid item lg={3} md={3} sm={3} xs={12}>
          <InputLabel style={{fontWeight: 'bold'}}>{gettext('Current User')}</InputLabel>
        </Grid>
        <Grid item lg={9} md={9} sm={9} xs={12}>
          <InputLabel>{aboutData.current_user}</InputLabel>
        </Grid>
      </Grid>
      { aboutData.nwjs &&
        <Grid container spacing={0} style={{marginBottom: '8px'}}>
          <Grid item lg={3} md={3} sm={3} xs={12}>
            <InputLabel style={{fontWeight: 'bold'}}>{gettext('NW.js Version')}</InputLabel>
          </Grid>
          <Grid item lg={9} md={9} sm={9} xs={12}>
            <InputLabel>{aboutData.nwjs}</InputLabel>
          </Grid>
        </Grid>
      }
      <Grid container spacing={0} style={{marginBottom: '8px'}}>
        <Grid item lg={3} md={3} sm={3} xs={12}>
          <InputLabel style={{fontWeight: 'bold'}}>{gettext('Browser')}</InputLabel>
        </Grid>
        <Grid item lg={9} md={9} sm={9} xs={12}>
          <InputLabel>{aboutData.browser_details}</InputLabel>
        </Grid>
      </Grid>
      <Grid container spacing={0} style={{marginBottom: '8px'}}>
        <Grid item lg={3} md={3} sm={3} xs={12}>
          <InputLabel style={{fontWeight: 'bold'}}>{gettext('Operating System')}</InputLabel>
        </Grid>
        <Grid item lg={9} md={9} sm={9} xs={12}>
          <InputLabel>{aboutData.os_details}</InputLabel>
        </Grid>
      </Grid>
      <Grid container spacing={0} style={{marginBottom: '8px'}}>
        <Grid item lg={3} md={3} sm={3} xs={12}>
          <InputLabel style={{fontWeight: 'bold'}}>{gettext('pgAdmin Database File')}</InputLabel>
        </Grid>
        <Grid item lg={9} md={9} sm={9} xs={12}>
          <InputLabel>{aboutData.config_db}</InputLabel>
        </Grid>
      </Grid>
      <Grid container spacing={0} style={{marginBottom: '8px'}}>
        <Grid item lg={3} md={3} sm={3} xs={12}>
          <InputLabel style={{fontWeight: 'bold'}}>{gettext('Log File')}</InputLabel>
        </Grid>
        <Grid item lg={9} md={9} sm={9} xs={12}>
          <InputLabel>{aboutData.log_file}</InputLabel>
        </Grid>
      </Grid>
      { (aboutData.app_mode == 'Desktop' || (aboutData.app_mode == 'Server' && aboutData.admin)) &&
      <>
        <Box flexGrow="1" display="flex" flexDirection="column">
          <Box>
            <span style={{fontWeight: 'bold'}}>{gettext('Server Configuration')}</span>
            <DefaultButton className={classes.copyBtn} onClick={()=>{
              copyToClipboard(aboutData.settings);
              setCopyText(gettext('Copied!'));
              revertCopiedText(1500);
            }}>{copyText}</DefaultButton>
          </Box>
          <Box flexGrow="1" paddingTop="1px">
            <InputText style={{height: '100%'}} controlProps={{multiline: true}} inputStyle={{resize: 'none'}}
              value={aboutData.settings}/>
          </Box>
        </Box>
      </>
      }
    </Box>
  );
}

AboutComponent.propTypes = {
  closeModal: PropTypes.func
};
