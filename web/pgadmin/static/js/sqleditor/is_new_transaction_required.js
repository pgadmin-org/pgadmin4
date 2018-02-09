//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

export function is_new_transaction_required(xhr) {
  return xhr.status === 404 && xhr.responseJSON &&
    xhr.responseJSON.info &&
    xhr.responseJSON.info === 'DATAGRID_TRANSACTION_REQUIRED';
}
