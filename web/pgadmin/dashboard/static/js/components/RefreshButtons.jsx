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
import CachedOutlinedIcon from '@mui/icons-material/CachedOutlined';
import { PgIconButton } from '../../../../static/js/components/Buttons';
import PropTypes from 'prop-types';

const StyledPgIconButton = styled(PgIconButton)(({theme}) => ({
  '&.RefreshButtons': {
    marginLeft: 'auto',
    height: '1.9rem !important',
    width: '2.2rem !important',
    ...theme.mixins.panelBorder,
  }
}));

export default function RefreshButton({onClick, noBorder=true}) {
  return (
    <StyledPgIconButton
      size="xs"
      noBorder={noBorder}
      className='RefreshButtons'
      icon={<CachedOutlinedIcon />}
      onClick={onClick}
      color="default"
      aria-label="Refresh"
      title={gettext('Refresh')}
    ></StyledPgIconButton>
  );
}

RefreshButton.propTypes = {
  onClick: PropTypes.func,
  noBorder: PropTypes.bool
};
