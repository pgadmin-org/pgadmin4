//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import PropTypes from 'prop-types';

let historyDetail =
    PropTypes.shape({
      query: PropTypes.string,
      start_time: PropTypes.instanceOf(Date),
      status: PropTypes.bool,
      total_time: PropTypes.string,
      row_affected: PropTypes.int,
      message: PropTypes.string,
    });

let historyCollectionClass =
  PropTypes.shape({
    historyList: PropTypes.array.isRequired,
    onChange: PropTypes.func.isRequired,
  });

let sqlEditorPrefObj =
  PropTypes.shape({
    sql_font_size: PropTypes.string.isRequired,
  });

export default {
  historyDetail,
  historyCollectionClass,
  sqlEditorPrefObj,
};
