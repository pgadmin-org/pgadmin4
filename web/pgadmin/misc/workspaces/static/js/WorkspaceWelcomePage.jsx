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
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';
import AdHocConnection from './AdHocConnection';
import WelcomeBG from '../img/welcome_background.svg?svgr';
import { QueryToolIcon } from '../../../../static/js/components/ExternalIcon';
import TerminalRoundedIcon from '@mui/icons-material/TerminalRounded';
import { renderToStaticMarkup } from 'react-dom/server';
import { WORKSPACES } from '../../../../browser/static/js/constants';

const welcomeBackgroundString = encodeURIComponent(renderToStaticMarkup(<WelcomeBG />));
const welcomeBackgroundURI = `url("data:image/svg+xml,${welcomeBackgroundString}")`;

const Root = styled('div')(({theme}) => ({
  height: '100%',
  display: 'flex',
  backgroundColor: theme.otherVars.emptySpaceBg,
  '& .WorkspaceWelcomePage-content': {
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexGrow: 1,
    maxWidth: '900px',
    margin:'auto',
    zIndex: 1,
    maxHeight: '80%',
    height: '100%',
    '& .AdHocConnection-container.FormView-nonTabPanel': {backgroundColor: theme.palette.background.default}
  },

  '& .LeftContainer': {
    maxWidth: '30%',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: theme.palette.grey[200],
    opacity: '0.9'
  },

  '& .RightContainer': {
    width: '100%',
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.default
  },

  '& .ToolIcon': {
    color: theme.palette.primary['main']
  },

  '& .TitleStyle': {
    fontSize: 'medium',
    fontWeight: 'bold',
    paddingTop: '16px'
  },

  '& .TopLabelStyle': {
    fontSize: 'medium',
    fontWeight: 'bold',
    padding: '16px 0px 16px 12px'
  }
}));

const BackgroundSVG = styled(Box)(() => ({
  position: 'absolute',
  top: 0,
  bottom: 0,
  margin: 'auto',
  right: 0,
  background: welcomeBackgroundURI,
  width: '100%',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'center'
}));

export default function WorkspaceWelcomePage({ mode }) {
  let welcomeIcon = <QueryToolIcon style={{height: '1.5rem'}} />;
  let welcomeTitle = gettext('Welcome to the Query Tool Workspace!');
  let welcomeFirst = gettext('The Query Tool is a robust and versatile environment designed for executing SQL commands and reviewing result sets efficiently.');
  let welcomeSecond = gettext('In this workspace, you can seamlessly open and manage multiple query tabs, making it easier to organize your work. You can select the existing servers or create a completely new ad-hoc connection to any database server as needed.');

  if (mode == WORKSPACES.PSQL_TOOL) {
    welcomeIcon = <TerminalRoundedIcon style={{height: '2rem', width: 'unset'}} />;
    welcomeTitle = gettext('Welcome to the PSQL Workspace!');
    welcomeFirst = gettext('The PSQL tool allows users to connect to PostgreSQL or EDB Advanced server using the psql command line interface.');
    welcomeSecond = gettext('In this workspace, you can seamlessly open and manage multiple PSQL tabs, making it easier to organize your work. You can select the existing servers or create a completely new ad-hoc connection to any database server as needed.');
  }

  return (
    <Root>
      <BackgroundSVG />
      <Box className='WorkspaceWelcomePage-content'>
        <Box className='LeftContainer'>
          <div className='ToolIcon'>{welcomeIcon}</div>
          <Box className='TitleStyle'>
            {welcomeTitle}
          </Box>
          <Box style={{paddingTop: '16px'}}>
            {welcomeFirst}
          </Box>
          <Box style={{paddingTop: '16px'}}>
            {welcomeSecond}
          </Box>
        </Box>
        <Box className='RightContainer'>
          <Box className='TopLabelStyle'>
            {gettext('Let\'s connect to the server')}
          </Box>
          <AdHocConnection mode={mode}/>
        </Box>
      </Box>
    </Root>
  );
}

WorkspaceWelcomePage.propTypes = {
  mode: PropTypes.string
};
