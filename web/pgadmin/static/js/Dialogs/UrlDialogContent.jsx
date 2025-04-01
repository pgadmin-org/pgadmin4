/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';

import { Box } from '@mui/material';
import CloseIcon from '@mui/icons-material/CloseRounded';
import HelpIcon from '@mui/icons-material/Help';

import { DefaultButton, PgIconButton } from '../components/Buttons';
import { ModalContent, ModalFooter }from '../../../static/js/components/ModalContent';

export default function UrlDialogContent({ url, helpFile, onClose }) {
  return (
    <ModalContent>
      <Box flexGrow="1">
        <iframe src={url} title=" " width="100%" height="100%" onLoad={(e)=>{
          e.target?.contentWindow?.focus();
        }}/>
      </Box>
      <ModalFooter>
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
      </ModalFooter>
    </ModalContent>
  );
}

UrlDialogContent.propTypes = {
  url: PropTypes.string,
  helpFile: PropTypes.string,
  onClose: PropTypes.func,
};
