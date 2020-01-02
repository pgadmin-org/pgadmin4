/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import url_for from 'sources/url_for';
import $ from 'jquery';

// Send a request to get transaction id
export function getTransId(configs) {
  return $.ajax({
    data: configs,
    type: 'POST',
    async: false,
    url: url_for('file_manager.get_trans_id'),
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
  });
}

// Function to remove trans id from session
export function removeTransId(trans_id) {
  return $.ajax({
    type: 'GET',
    async: false,
    url: url_for('file_manager.delete_trans_id', {
      'trans_id': trans_id,
    }),
    dataType: 'json',
    contentType: 'application/json; charset=utf-8',
  });
}

export function set_last_traversed_dir(path, trans_id) {
  return $.ajax({
    url: url_for('file_manager.save_last_dir', {
      'trans_id': trans_id,
    }),
    type: 'POST',
    data: JSON.stringify(path),
    contentType: 'application/json',
  });
}
