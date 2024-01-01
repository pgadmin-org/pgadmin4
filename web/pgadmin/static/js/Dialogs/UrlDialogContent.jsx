/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';

import { Box } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/CloseRounded';
import HelpIcon from '@material-ui/icons/Help';

import { DefaultButton, PgIconButton } from '../components/Buttons';
import { useModalStyles } from '../helpers/ModalProvider';

export default function UrlDialogContent({ url, helpFile, onClose }) {
  const classes = useModalStyles();

  return (
    <Box display="flex" flexDirection="column" height="100%" className={classes.container}>
      <Box flexGrow="1">
        <iframe src={url} width="100%" height="100%" onLoad={(e)=>{
          e.target?.contentWindow?.focus();
        }}/>
      </Box>
      <Box className={classes.footer}>
        <Box style={{ marginRight: 'auto' }}>
          <PgIconButton data-test={'help-'+helpFile} title={gettext('Help')} icon={<HelpIcon />} onClick={() => {
            let _url = url_for('help.static', {
              'filename': helpFile,
            });
            window.open(_url, 'pgadmin_help');
          }} >
          </PgIconButton>
        </Box>
        <DefaultButton data-test="close" startIcon={<CloseIcon />} onClick={() => {
          onClose();
        }} >{gettext('Close')}</DefaultButton>
      </Box>
    </Box>
  );
}

UrlDialogContent.propTypes = {
  url: PropTypes.string,
  helpFile: PropTypes.string,
  onClose: PropTypes.func,
};
