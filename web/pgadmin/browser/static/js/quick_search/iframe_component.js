/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, {Component} from 'react';
import PropTypes from 'prop-types';

// Allow us to render IFrame using React
// Here we will add the event listener on Iframe load event
export class Iframe extends Component {
  static get propTypes() {
    return {
      id: PropTypes.string.isRequired,
      srcURL: PropTypes.string.isRequired,
      onLoad: PropTypes.func.isRequired,
    };
  }

  render () {
    const iframeStyle = {
      border: '0',
      display: 'block',
      position:'absolute',
      opacity:'0',
    };
    const {id, srcURL, onLoad} = this.props;

    return (
      <iframe
        id={id}
        src={srcURL}
        onLoad={onLoad}
        width={'20'}
        height={'20'}
        style={iframeStyle}
      />
    );
  }
}
