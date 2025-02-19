/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import { Box } from '@mui/material';
import { LAYOUT_EVENTS, LayoutDockerContext } from './Layout';
import { PgIconButton } from '../components/Buttons';
import gettext from 'sources/gettext';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { BROWSER_PANELS } from '../../../browser/static/js/constants';
import PropTypes from 'prop-types';

export default function MainMoreToolbar({tabsData}) {
  const layoutDocker = React.useContext(LayoutDockerContext);
  return (
    <Box display="flex" alignItems="center">
      <PgIconButton title={gettext('More')} icon={<MoreVertIcon />} size="xs" noBorder onClick={(e)=>{
        e.preventDefault();
        const box = e.target.getBoundingClientRect();

        layoutDocker.eventBus.fireEvent(LAYOUT_EVENTS.CONTEXT, {clientX: box.right, clientY: box.bottom}, BROWSER_PANELS.MAIN, [
          {
            label: 'Open',
            getMenuItems: ()=>{
              const ret = [];
              tabsData.forEach((t)=>{
                if(!layoutDocker.isTabOpen(t.id)) {
                  ret.push({
                    label: t.title,
                    callback: ()=>layoutDocker.openTab(t, BROWSER_PANELS.MAIN),
                  });
                }
              });
              if(ret.length == 0)  {
                ret.push({
                  label: gettext('Nothing to open'),
                  isDisabled: true,
                });
              }
              return ret;
            },
          }
        ]);
      }} />
    </Box>
  );
}
MainMoreToolbar.propTypes = {
  tabsData: PropTypes.array
};