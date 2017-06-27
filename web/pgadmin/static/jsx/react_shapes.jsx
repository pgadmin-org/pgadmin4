//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import React from 'react';

let historyDetail =
    React.PropTypes.shape({
      query: React.PropTypes.string,
      start_time: React.PropTypes.instanceOf(Date),
      status: React.PropTypes.bool,
      total_time: React.PropTypes.string,
      row_affected: React.PropTypes.int,
      message: React.PropTypes.string,
    });

let historyCollectionClass =
  React.PropTypes.shape({
    historyList: React.PropTypes.array.isRequired,
    onChange: React.PropTypes.func.isRequired,
  });

export default {
  historyDetail,
  historyCollectionClass,
};