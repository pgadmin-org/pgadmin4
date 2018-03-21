//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

export function is_new_transaction_required(xhr) {
  /* If responseJSON is undefined then it could be object of
   * axios(Promise HTTP) response, so we should check accordingly.
   */
  if (xhr.responseJSON === undefined && xhr.data !== undefined) {
    return xhr.status === 404 && xhr.data &&
              xhr.data.info &&
              xhr.data.info === 'DATAGRID_TRANSACTION_REQUIRED';
  }

  return xhr.status === 404 && xhr.responseJSON &&
    xhr.responseJSON.info &&
    xhr.responseJSON.info === 'DATAGRID_TRANSACTION_REQUIRED';
}
