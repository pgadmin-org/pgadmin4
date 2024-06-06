/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import { styled } from '@mui/material/styles';
import url_for from 'sources/url_for';
import React, { useEffect, useState, useRef } from 'react';
import { Box, Grid, InputLabel } from '@mui/material';
import { DefaultButton } from '../../../static/js/components/Buttons';
import { InputText } from '../../../static/js/components/FormComponents';
import getApiInstance from '../../../static/js/api_instance';
import { copyToClipboard } from '../../../static/js/clipboard';
import { useDelayedCaller } from '../../../static/js/custom_hooks';
import { usePgAdmin } from '../../../static/js/BrowserComponent';

const StyledDefaultButton = styled(DefaultButton)(({theme}) => ({
  '&.AboutComponent-copyBtn': {
    marginRight: '1px',
    float: 'right',
    borderColor: theme.otherVars.borderColor,
    fontSize: '13px',
  }
}));

export default function AboutComponent() {
  const containerRef = useRef();
  const [aboutData, setAboutData] = useState([]);
  const [copyText, setCopyText] = useState(gettext('Copy'));
  const revertCopiedText = useDelayedCaller(()=>{
    setCopyText(gettext('Copy'));
  });
  const pgAdmin = usePgAdmin();

  useEffect(() => {
    const about_url = url_for('about.index');
    const api = getApiInstance();

    api.get(about_url).then((res)=>{
      setAboutData(res.data.data);
    }).catch((err)=>{
      pgAdmin.Browser.notifier.error(err);
    });
  }, []);

  return (
    <Box sx={{ padding: '16px', height: '100%', display: 'flex',flexDirection: 'column'}} ref={containerRef}>
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
      { aboutData.os_details &&
        <Grid container spacing={0} style={{marginBottom: '8px'}}>
          <Grid item lg={3} md={3} sm={3} xs={12}>
            <InputLabel style={{fontWeight: 'bold'}}>{gettext('Operating System')}</InputLabel>
          </Grid>
          <Grid item lg={9} md={9} sm={9} xs={12}>
            <InputLabel>{aboutData.os_details}</InputLabel>
          </Grid>
        </Grid>
      }
      { aboutData.config_db &&
        <Grid container spacing={0} style={{marginBottom: '8px'}}>
          <Grid item lg={3} md={3} sm={3} xs={12}>
            <InputLabel style={{fontWeight: 'bold'}}>{gettext('pgAdmin Database File')}</InputLabel>
          </Grid>
          <Grid item lg={9} md={9} sm={9} xs={12}>
            <InputLabel>{aboutData.config_db}</InputLabel>
          </Grid>
        </Grid>
      }
      { aboutData.log_file &&
        <Grid container spacing={0} style={{marginBottom: '8px'}}>
          <Grid item lg={3} md={3} sm={3} xs={12}>
            <InputLabel style={{fontWeight: 'bold'}}>{gettext('Log File')}</InputLabel>
          </Grid>
          <Grid item lg={9} md={9} sm={9} xs={12}>
            <InputLabel>{aboutData.log_file}</InputLabel>
          </Grid>
        </Grid>
      }
      { aboutData.settings &&
        <Box flexGrow="1" display="flex" flexDirection="column">
          <Box>
            <span style={{fontWeight: 'bold'}}>{gettext('Server Configuration')}</span>
            <StyledDefaultButton className='AboutComponent-copyBtn' onClick={()=>{
              copyToClipboard(aboutData.settings);
              setCopyText(gettext('Copied!'));
              revertCopiedText(1500);
            }}>{copyText}</StyledDefaultButton>
          </Box>
          <Box flexGrow="1" paddingTop="1px">
            <InputText style={{height: '100%'}} controlProps={{multiline: true, rows: 8}} inputStyle={{resize: 'none'}}
              value={aboutData.settings}/>
          </Box>
        </Box>
      }
    </Box>
  );
}
