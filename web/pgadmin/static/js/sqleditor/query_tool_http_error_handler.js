//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////
import gettext from 'sources/gettext';

export function httpResponseRequiresNewTransaction(xhr) {
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

// Allow us to redirect to login dialog and if required then re-initiate the transaction
export function handleLoginRequiredAndTransactionRequired(
  pgAdmin, handler, exception, stateToSave, stateParameters, checkTransaction
) {
  stateParameters = stateParameters && stateParameters.length > 0 ? stateParameters : [];
  if (pgAdmin.Browser.UserManagement.isPgaLoginRequired(exception)) {
    if (stateToSave) {
      handler.saveState(stateToSave, stateParameters);
    }
    return pgAdmin.Browser.UserManagement.pgaLogin();
  }

  if(checkTransaction && httpResponseRequiresNewTransaction(exception)) {
    if (stateToSave) {
      handler.saveState(stateToSave, stateParameters);
    }
    return handler.initTransaction();
  }
}

// Allow us to handle the AJAX error from Query tool
export function handleQueryToolAjaxError(
  pgAdmin, handler, exception, stateToSave, stateParameters, checkTransaction
) {
  if (exception.readyState === 0) {
    return gettext('Not connected to the server or the connection to the server has been closed.');
  }

  handleLoginRequiredAndTransactionRequired(
    pgAdmin, handler, exception, stateToSave, stateParameters, checkTransaction
  );

  let msg = exception.responseText;
  if (exception.responseJSON !== undefined) {
    if(exception.responseJSON.errormsg !== undefined) {
      msg = exception.responseJSON.errormsg;
    }

    if(exception.status === 503 && exception.responseJSON.info !== undefined &&
        exception.responseJSON.info == 'CONNECTION_LOST') {
      // We will display re-connect dialog, no need to display error message again
      msg = null;
      setTimeout(function() {
        if (stateToSave) {
          handler.saveState(stateToSave, stateParameters);
        }
        handler.handle_connection_lost(false, exception);
      });
    }
  }

  return msg;
}
