/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import gettext from 'sources/gettext';
import CachedOutlinedIcon from '@material-ui/icons/CachedOutlined';
import { PgIconButton } from '../../../../static/js/components/Buttons';
import { makeStyles } from '@material-ui/core';
import PropTypes from 'prop-types';

const useStyles = makeStyles((theme) => ({
  refreshButton: {
    marginLeft: 'auto',
    height:  '1.9rem',
    width:  '2.2rem',
    ...theme.mixins.panelBorder,
  },
}));


export default function RefreshButton({onClick}) {
  const classes = useStyles();

  return(
    <PgIconButton
      size="xs"
      noBorder
      className={classes.refreshButton}
      icon={<CachedOutlinedIcon />}
      onClick={onClick}
      color="default"
      aria-label="Refresh"
      title={gettext('Refresh')}
    ></PgIconButton>
  );
}

RefreshButton.propTypes = {
  onClick: PropTypes.func
};
