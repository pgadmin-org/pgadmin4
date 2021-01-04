//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import {
  httpResponseRequiresNewTransaction,
  handleQueryToolAjaxError,
} from '../../../pgadmin/static/js/sqleditor/query_tool_http_error_handler';

describe('#httpResponseRequiresNewTransaction', () => {
  describe('when status is not 404', () => {
    it('should return false', () => {
      expect(httpResponseRequiresNewTransaction({
        status: 300,
      })).toEqual(false);
    });
  });

  describe('when status is 404', () => {
    describe('when data is not present', () => {
      it('should return false', () => {
        expect(httpResponseRequiresNewTransaction({
          status: 404,
        })).toBeFalsy();
      });
    });

    describe('when data is present', () => {
      describe('when info is not present inside data', () => {
        it('should return false', () => {
          expect(httpResponseRequiresNewTransaction({
            status: 404,
            data: {},
          })).toBeFalsy();
        });
      });

      describe('when info is present inside data', () => {
        describe('when info value is not "DATAGRID_TRANSACTION_REQUIRED"', () => {
          it('should return false', () => {
            expect(httpResponseRequiresNewTransaction({
              status: 404,
              data: {
                info: 'some information',
              },
            })).toEqual(false);
          });
        });

        describe('when info value is "DATAGRID_TRANSACTION_REQUIRED"', () => {
          it('should return false', () => {
            expect(httpResponseRequiresNewTransaction({
              status: 404,
              data: {
                info: 'DATAGRID_TRANSACTION_REQUIRED',
              },
            })).toEqual(true);
          });
        });
      });
    });
  });
});


describe('#handleQueryToolAjaxError', () => {
  let sqlEditorHandler,
    exceptionSpy, stateToSave,
    stateParameters, checkTransaction,
    pgBrowserMock;

  beforeEach(() => {
    stateToSave = 'testState';
    stateParameters = [];
    checkTransaction = false;
    sqlEditorHandler = jasmine.createSpyObj(
      'handler', ['initTransaction', 'saveState', 'handle_connection_lost']
    );
    exceptionSpy = {
      readyState: 0,
      status: 404,
      data: {
        info: 'CONNECTION_LOST',
      },
    };
    pgBrowserMock = {
      'Browser': {
        'UserManagement': jasmine.createSpyObj('UserManagement', ['isPgaLoginRequired', 'pgaLogin']),
      },
    };
  });

  describe('when ready state is 0', () => {
    it('should return connection', () => {
      expect(
        handleQueryToolAjaxError(
          pgBrowserMock, sqlEditorHandler, exceptionSpy, stateToSave,
          stateParameters, checkTransaction
        )
      ).toEqual('Not connected to the server or the connection to the server has been closed.');
    });
  });

  describe('when there is an ajax error due to login is required', () => {
    beforeEach(() => {
      exceptionSpy.readyState = 1;
      exceptionSpy.status = 401;
      exceptionSpy.data.info = 'PGADMIN_LOGIN_REQUIRED';
      pgBrowserMock.Browser.UserManagement.isPgaLoginRequired.and.returnValue(true);
    });

    it('should save the current state and call login handler', () => {
      handleQueryToolAjaxError(
        pgBrowserMock, sqlEditorHandler, exceptionSpy, stateToSave,
        stateParameters, checkTransaction
      );
      expect(sqlEditorHandler.saveState).toHaveBeenCalledWith(stateToSave, stateParameters);
      expect(pgBrowserMock.Browser.UserManagement.pgaLogin).toHaveBeenCalled();
    });
  });

  describe('when there is an ajax error and new transaction initialization required', () => {
    beforeEach(() => {
      exceptionSpy.readyState = 1;
      exceptionSpy.status = 404;
      exceptionSpy.data.info = 'DATAGRID_TRANSACTION_REQUIRED';
      pgBrowserMock.Browser.UserManagement.isPgaLoginRequired.and.returnValue(false);
      checkTransaction = true;
    });

    it('should save the current state and call login handler', () => {
      handleQueryToolAjaxError(
        pgBrowserMock, sqlEditorHandler, exceptionSpy, stateToSave,
        stateParameters, checkTransaction
      );
      expect(pgBrowserMock.Browser.UserManagement.pgaLogin).not.toHaveBeenCalled();
      expect(sqlEditorHandler.saveState).toHaveBeenCalledWith(stateToSave, stateParameters);
      expect(sqlEditorHandler.initTransaction).toHaveBeenCalled();
    });
  });

  describe('when there is an ajax error due to database connection has been lost', () => {
    beforeEach(() => {
      exceptionSpy.readyState = 1;
      exceptionSpy.status = 503;
      exceptionSpy.responseJSON = {
        'info': 'CONNECTION_LOST',
      };
      pgBrowserMock.Browser.UserManagement.isPgaLoginRequired.and.returnValue(false);
      checkTransaction = false;
    });

    it('should save the current state and call connection lost handler', (done) => {
      handleQueryToolAjaxError(
        pgBrowserMock, sqlEditorHandler, exceptionSpy, stateToSave,
        stateParameters, checkTransaction
      );
      expect(pgBrowserMock.Browser.UserManagement.pgaLogin).not.toHaveBeenCalled();
      setTimeout(() => {
        expect(sqlEditorHandler.saveState).toHaveBeenCalledWith(stateToSave, stateParameters);
        expect(sqlEditorHandler.handle_connection_lost).toHaveBeenCalledWith(false, exceptionSpy);
        done();
      }, 0);
    });
  });

  describe('when there is an ajax error due to unknown reason', () => {
    beforeEach(() => {
      exceptionSpy.readyState = 1;
      exceptionSpy.status = 803;
      exceptionSpy.responseText = 'ajax failed with unknown reason';
      pgBrowserMock.Browser.UserManagement.isPgaLoginRequired.and.returnValue(false);
      checkTransaction = false;
    });

    it('should return proper error message from ajax exception', () => {
      expect(
        handleQueryToolAjaxError(
          pgBrowserMock, sqlEditorHandler, exceptionSpy, stateToSave,
          stateParameters, checkTransaction
        )
      ).toEqual('ajax failed with unknown reason');
    });
  });

});
