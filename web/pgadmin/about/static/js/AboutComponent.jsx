/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import React, { useEffect, useState, useRef } from 'react';
import { Box, Grid, InputLabel } from '@mui/material';
import { InputSQL } from '../../../static/js/components/FormComponents';
import getApiInstance from '../../../static/js/api_instance';
import { usePgAdmin } from '../../../static/js/PgAdminProvider';

export default function AboutComponent() {
  const containerRef = useRef();
  const [aboutData, setAboutData] = useState([]);
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
          <InputLabel style={{fontWeight: 'bold'}}>{gettext('Commit')}</InputLabel>
        </Grid>
        <Grid item lg={9} md={9} sm={9} xs={12}>
          <InputLabel>{aboutData.commit_hash}</InputLabel>
        </Grid>
      </Grid>
      <Grid container spacing={0} style={{marginBottom: '8px'}}>
        <Grid item lg={3} md={3} sm={3} xs={12}>
          <InputLabel style={{fontWeight: 'bold'}}>{gettext('Python Version')}</InputLabel>
        </Grid>
        <Grid item lg={9} md={9} sm={9} xs={12}>
          <InputLabel>{aboutData.python_version}</InputLabel>
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
      { aboutData.electron &&
        <Grid container spacing={0} style={{marginBottom: '8px'}}>
          <Grid item lg={3} md={3} sm={3} xs={12}>
            <InputLabel style={{fontWeight: 'bold'}}>{gettext('Electron Version')}</InputLabel>
          </Grid>
          <Grid item lg={9} md={9} sm={9} xs={12}>
            <InputLabel>{aboutData.electron}</InputLabel>
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
        <Box flexGrow="1" display="flex" flexDirection="column" minHeight="0">
          <Box>
            <InputLabel style={{fontWeight: 'bold'}}>{gettext('pgAdmin Server Configuration')}</InputLabel>
          </Box>
          <Box flexGrow="1" paddingTop="1px" minHeight="0">
            <InputSQL value={aboutData.settings}
              controlProps={{
                readonly: true,
                showCopyBtn: true,
              }}
              options={{
                lineNumbers: false,
                foldGutter: false
              }} />
          </Box>
        </Box>
      }
    </Box>
  );
}
