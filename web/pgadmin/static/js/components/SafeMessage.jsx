/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import PropTypes from 'prop-types';

// SafeMessage renders externally-derived text without interpreting any
// HTML. Newlines are preserved via white-space: pre-wrap so a multi-line
// PostgreSQL error stays readable. Use this for any string whose source is
// a database server, driver, OS process, remote API, or other untrusted
// channel.
export function SafeMessage({text, ...rest}) {
  return (
    <span
      style={{whiteSpace: 'pre-wrap', wordBreak: 'break-word',
        overflowWrap: 'anywhere'}}
      {...rest}>
      {text ?? ''}
    </span>
  );
}

SafeMessage.propTypes = {
  text: PropTypes.node,
};
