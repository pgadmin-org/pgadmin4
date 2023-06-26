/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import PropTypes from 'prop-types';

// Allow us to render IFrame using React
// Here we will add the event listener on Iframe load event
export default function HiddenIframe({id, srcURL, onLoad}) {
  return (
    <iframe
      id={id}
      src={srcURL}
      onLoad={onLoad}
      width={'20'}
      height={'20'}
      style={{
        border: '0',
        display: 'block',
        position:'absolute',
        opacity:'0',
      }}
    />
  );
}

HiddenIframe.propTypes = {
  id: PropTypes.string.isRequired,
  srcURL: PropTypes.string.isRequired,
  onLoad: PropTypes.func.isRequired,
};
