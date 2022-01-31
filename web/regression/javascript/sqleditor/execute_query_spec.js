//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import * as subject from 'sources/sqleditor/execute_query';
import * as httpErrorHandler from 'sources/sqleditor/query_tool_http_error_handler';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import $ from 'jquery';

const context = describe;

describe('ExecuteQuery', () => {
  let sqlEditorMock;
  let networkMock;
  let executeQuery;
  let userManagementMock;
  let isNewTransactionRequiredMock;

  const startTime = new Date(2018, 1, 29, 12, 15, 52);
  beforeEach(() => {
    networkMock = new MockAdapter(axios);
    userManagementMock = jasmine.createSpyObj('UserManagement', [
      'isPgaLoginRequired',
      'pgaLogin',
    ]);

    sqlEditorMock = jasmine.createSpyObj('SqlEditor', [
      'call_render_after_poll',
      'disable_tool_buttons',
      'resetQueryHistoryObject',
      'setIsQueryRunning',
      'trigger',
      'update_msg_history',
      '_highlight_error',
      '_init_polling_flags',
      'saveState',
      'initTransaction',
      'handle_connection_lost',
      'update_notifications',
      'disable_transaction_buttons',
      'enable_disable_download_btn',
    ]);
    sqlEditorMock.transId = 123;
    sqlEditorMock.rows_affected = 1000;
    executeQuery = new subject.ExecuteQuery(sqlEditorMock, userManagementMock);
    isNewTransactionRequiredMock = spyOn(httpErrorHandler, 'httpResponseRequiresNewTransaction');
  });

  afterEach(() => {
    networkMock.restore();
  });

  let updateHistoryNotCalled = (done)=> {
    setTimeout(() => {
      expect(sqlEditorMock.update_msg_history).not.toHaveBeenCalled();
      done();
    }, 0);
  };

  let pgaLoginNotCalled = (done)=> {
    setTimeout(() => {
      expect(userManagementMock.pgaLogin).not.toHaveBeenCalled();
      done();
    }, 0);
  };

  let disableToolButtonsNotCalled = (done)=> {
    setTimeout(() => {
      expect(sqlEditorMock.disable_tool_buttons).not.toHaveBeenCalled();
      done();
    }, 0);
  };

  let cancelButtonNotCalled = (done)=> {
    let cancelButtonSpy = spyOn($.fn, 'prop');
    setTimeout(() => {
      expect(cancelButtonSpy).not.toHaveBeenCalled();
      done();
    }, 0);
  };

  let beforeEachNotConnected = ()=> {
    let response = {
      data: {
        status: 'NotConnected',
        result: 'Some interesting result',
      },
    };
    networkMock.onGet('/sqleditor/query_tool/poll/123').reply(200, response);

    executeQuery.poll();
  };

  let beforeEachPythonServer = ()=> {
    networkMock.onGet('/sqleditor/query_tool/poll/123').reply(404, undefined);
    executeQuery.poll();
  };

  let setFlagQueryIsRunningTestCase = ()=> {
    it('should set the flag to inform SQLEditor a query is running', (done) => {
      setTimeout(() => {
        expect(sqlEditorMock.setIsQueryRunning)
          .toHaveBeenCalledWith(true);
        done();
      }, 0);
    });
  };

  let updateHistoryMessageTestCase = ()=> {
    it('should update history message', (done) => {
      setTimeout(() => {
        expect(sqlEditorMock.update_msg_history)
          .toHaveBeenCalledWith('Busy', 'Some important result', false);
        done();
      }, 0);
    });
  };

  let callPoolingTestCase = ()=> {
    it('should recursively call polling', (done) => {
      setTimeout(() => {
        expect(executeQuery.delayedPoll)
          .toHaveBeenCalled();
        done();
      }, 0);
    });
  };

  let shouldNotUpdateHistoryMessageTestCase = ()=> {
    it('should does not update history', (done) => {
      updateHistoryNotCalled(done);
    });
  };

  let shouldHideLoadingIconTestCase = ()=> {
    it('should hide the loading icon', (done) => {
      setTimeout(() => {
        expect(sqlEditorMock.trigger)
          .toHaveBeenCalledWith('pgadmin-sqleditor:loading-icon:hide');
        done();
      }, 0);
    });
  };

  let shouldUpdateLoadingIconMessageTestCase = ()=>{
    it('should update the loading icon message', (done) => {
      setTimeout(() => {
        expect(sqlEditorMock.trigger)
          .toHaveBeenCalledWith(
            'pgadmin-sqleditor:loading-icon:message',
            'Loading data from the database server and rendering...'
          );
        done();
      }, 0);
    });
  };

  let addNewEntryToHistoryTestCase = ()=>{
    it('should add new entry to history and update the Messages tab and clear the result grid', (done) => {
      setTimeout(() => {
        expect(sqlEditorMock.update_msg_history)
          .toHaveBeenCalledWith(
            false,
            'Some interesting result',
            true
          );
        done();
      }, 0);
    });
  };

  let shouldEnableToolsButtonTestCase = ()=>{
    it('should enable the tool buttons', (done) => {
      setTimeout(
        () => {
          expect(sqlEditorMock.disable_tool_buttons).toHaveBeenCalledWith(false);
          done();
        }, 0);
    });
  };

  let addNewEntryToHistoryExecutionCancelTestCase = ()=> {
    it('should add new entry to history, add cancellation message to Messages tab and clear the result grid', (done) => {
      setTimeout(() => {
        expect(sqlEditorMock.update_msg_history)
          .toHaveBeenCalledWith(
            false,
            'Execution Cancelled!',
            true
          );
        done();
      }, 0);
    });
  };

  let shouldResetLastQueryInformationTestCase = ()=> {
    it('should reset last query information', (done) => {
      setTimeout(
        () => {
          expect(sqlEditorMock.resetQueryHistoryObject)
            .toHaveBeenCalledWith(sqlEditorMock);
          done();
        }, 0);
    });
  };

  let shouldNotAddNewEntryTestCase = ()=> {
    it('should not add new entry to history and update the Messages tab', (done) => {
      updateHistoryNotCalled(done);
    });
  };

  let shouldNotHighlightErrorTestCase = ()=>{
    it('should not highlight the error in the SQL panel', (done) => {
      setTimeout(
        () => {
          expect(sqlEditorMock._highlight_error).not
            .toHaveBeenCalled();
          done();
        }, 0);
    });
  };

  let shouldHighlightErrorTestCase = (msg)=>{
    it('should highlight the error in the SQL panel', (done) => {
      setTimeout(
        () => {
          expect(sqlEditorMock._highlight_error)
            .toHaveBeenCalledWith(msg);
          done();
        }, 0);
    });
  };

  let shouldLoginNotDisplayedTestCase = ()=>{
    it('should login is not displayed', (done) => {
      pgaLoginNotCalled(done);
    });
  };

  let shouldNotDisplayPGALoginTestCase = ()=>{
    it('should not display pga login', (done) => {
      pgaLoginNotCalled(done);
    });
  };

  let shouldLoginDisplayedTestCase = ()=>{
    it('should login is displayed', (done) => {
      setTimeout(
        () => {
          expect(userManagementMock.pgaLogin)
            .toHaveBeenCalled();
          done();
        }, 0);
    });
  };

  let addNewEntryToHistoryUpdateMsgTestCase = (msg)=> {
    it('should add new entry to history and update the Messages tab', (done) => {
      setTimeout(
        () => {
          expect(sqlEditorMock.update_msg_history)
            .toHaveBeenCalledWith(false, msg);
          done();
        }, 0);
    });
  };

  let shouldNotSaveStateTestCase = ()=>{
    it('should not save the state', (done) => {
      setTimeout(() => {
        expect(sqlEditorMock.saveState).not.toHaveBeenCalled();
        done();
      }, 0);
    });
  };

  let shouldSaveStateTestCase = ()=> {
    it('should save the state', (done) => {
      setTimeout(() => {
        expect(sqlEditorMock.saveState).toHaveBeenCalledWith(
          'check_data_changes_to_execute_query',
          ['']
        );
        done();
      }, 0);
    });
  };

  let shouldDisableCancelButtonTestCase = ()=> {
    it('should disable the cancel button', (done) => {
      cancelButtonNotCalled(done);
    });
  };

  let whenQueryIsStillRunningTestCases = ()=> {
    describe('when query is still running', () => {
      context('when no additional information is returned', () => {
        beforeEach(() => {
          let response = {
            data: {status: 'Busy'},
          };

          networkMock.onGet('/sqleditor/query_tool/poll/123').reply(200, response);
          executeQuery.poll();
        });

        setFlagQueryIsRunningTestCase();
        shouldNotUpdateHistoryMessageTestCase();
        callPoolingTestCase();
      });

      context('when additional information is returned', () => {
        beforeEach(() => {
          let response = {
            data: {
              status: 'Busy',
              result: 'Some important result',
            },
          };

          networkMock.onGet('/sqleditor/query_tool/poll/123').reply(200, response);
          executeQuery.poll();
        });

        setFlagQueryIsRunningTestCase();
        updateHistoryMessageTestCase();
        callPoolingTestCase();
      });
    });
  };

  let whenQueryWasCancelledTestCases = ()=> {
    describe('when query was cancelled', () => {
      beforeEach(() => {
        let response = {
          data: {status: 'Cancel'},
        };
        networkMock.onGet('/sqleditor/query_tool/poll/123').reply(200, response);

        executeQuery.poll();
      });

      shouldHideLoadingIconTestCase();
      addNewEntryToHistoryExecutionCancelTestCase();
    });
  };

  describe('#poll', () => {
    let response;

    beforeEach(() => {
      sqlEditorMock.POLL_FALLBACK_TIME = () => {
        return 0;
      };

      executeQuery.delayedPoll = jasmine.createSpy('ExecuteQuery.delayedPoll');
    });

    context('when SQLEditor is the query tool', () => {
      beforeEach(() => {
        sqlEditorMock.is_query_tool = true;
      });

      describe('when server answer with success', () => {
        describe('when query was successful', () => {
          beforeEach(() => {
            response = {
              data: {status: 'Success', notifies: [{'pid': 100}]},
            };
            networkMock.onGet('/sqleditor/query_tool/poll/123').reply(200, response);

            executeQuery.poll();
          });

          shouldUpdateLoadingIconMessageTestCase();

          it('should render the results', (done) => {
            setTimeout(() => {
              expect(sqlEditorMock.call_render_after_poll)
                .toHaveBeenCalledWith({status: 'Success', notifies: [{'pid': 100}]});
              done();
            }, 0);
          });

          it('should update the notification panel', (done) => {
            setTimeout(() => {
              expect(sqlEditorMock.update_notifications)
                .toHaveBeenCalledWith([{'pid': 100}]);
              done();
            }, 0);
          });
        });

        describe('when query was successful but in transaction block', () => {
          beforeEach(() => {
            response = {
              data: {status: 'Success', notifies: [{'pid': 100}], transaction_status: 2},
            };
            networkMock.onGet('/sqleditor/query_tool/poll/123').reply(200, response);

            executeQuery.poll();
          });

          it('enable the transaction buttons', (done) => {
            setTimeout(
              () => {
                expect(sqlEditorMock.disable_transaction_buttons)
                  .toHaveBeenCalledWith(false);
                done();
              }, 0);
          });
        });

        describe('when query was successful but not in transaction block', () => {
          beforeEach(() => {
            response = {
              data: {status: 'Success', notifies: [{'pid': 100}], transaction_status: 0},
            };
            networkMock.onGet('/sqleditor/query_tool/poll/123').reply(200, response);

            executeQuery.poll();
          });

          it('disable the transaction buttons', (done) => {
            setTimeout(
              () => {
                expect(sqlEditorMock.disable_transaction_buttons)
                  .toHaveBeenCalledWith(true);
                done();
              }, 0);
          });
        });

        whenQueryIsStillRunningTestCases();

        describe('when the application lost connection with the database', () => {
          beforeEach(beforeEachNotConnected);

          shouldHideLoadingIconTestCase();
          addNewEntryToHistoryTestCase();
          shouldEnableToolsButtonTestCase();
        });

        whenQueryWasCancelledTestCases();
      });

      describe('when an error occur', () => {
        let errorMessageJson = {
          errormsg: 'Some error in JSON',
        };
        let errorMessageText = 'Some plain text error';

        describe('when the connection to the server was lost', () => {
          describe('when JSON response is available', () => {
            describe('when login is not required', () => {
              beforeEach(() => {
                userManagementMock.isPgaLoginRequired.and.returnValue(false);
                response = {responseJSON: errorMessageJson};
                networkMock.onGet('/sqleditor/query_tool/poll/123').reply(401, response);

                executeQuery.poll();
              });

              shouldHideLoadingIconTestCase();
              shouldResetLastQueryInformationTestCase();
              shouldHighlightErrorTestCase('Some error in JSON');
              addNewEntryToHistoryUpdateMsgTestCase('Some error in JSON');
              shouldEnableToolsButtonTestCase();
              shouldLoginNotDisplayedTestCase();
            });

            describe('when login is required', () => {
              beforeEach(() => {
                userManagementMock.isPgaLoginRequired.and.returnValue(true);
                response = {responseJSON: errorMessageJson};
                networkMock.onGet('/sqleditor/query_tool/poll/123').reply(401, response);

                executeQuery.poll();
              });

              shouldHideLoadingIconTestCase();
              shouldResetLastQueryInformationTestCase();
              shouldNotHighlightErrorTestCase();
              shouldNotAddNewEntryTestCase();
              shouldEnableToolsButtonTestCase();
              shouldLoginDisplayedTestCase();
            });
          });

          describe('when no JSON response is available', () => {
            describe('when login is not required', () => {
              beforeEach(() => {
                userManagementMock.isPgaLoginRequired.and.returnValue(false);
                response = {
                  errormsg: errorMessageText,
                };
                networkMock.onGet('/sqleditor/query_tool/poll/123').reply(401, response);

                executeQuery.poll();
              });

              shouldHideLoadingIconTestCase();
              shouldResetLastQueryInformationTestCase();
              shouldHighlightErrorTestCase('Some plain text error');
              addNewEntryToHistoryUpdateMsgTestCase('Some plain text error');
              shouldEnableToolsButtonTestCase();
              shouldLoginNotDisplayedTestCase();
            });

            describe('when login is required', () => {
              beforeEach(() => {
                userManagementMock.isPgaLoginRequired.and.returnValue(true);
                response = {
                  errormsg: errorMessageText,
                };
                networkMock.onGet('/sqleditor/query_tool/poll/123').reply(401, response);

                executeQuery.poll();
              });

              shouldHideLoadingIconTestCase();
              shouldResetLastQueryInformationTestCase();
              shouldNotHighlightErrorTestCase();
              shouldNotAddNewEntryTestCase();
              shouldEnableToolsButtonTestCase();
              shouldLoginDisplayedTestCase();

            });
          });

          describe('when cannot reach the Python Server', () => {
            beforeEach(beforeEachPythonServer);

            shouldHideLoadingIconTestCase();
            shouldResetLastQueryInformationTestCase();
            shouldNotHighlightErrorTestCase();
            addNewEntryToHistoryUpdateMsgTestCase('Not connected to the server or the connection to the server has been closed.');
            shouldEnableToolsButtonTestCase();
            shouldLoginNotDisplayedTestCase();
          });
        });
      });
    });

    context('when SQLEditor is NOT the query tool', () => {
      beforeEach(() => {
        sqlEditorMock.is_query_tool = false;
      });

      describe('when server answer with success', () => {
        describe('when query was successful', () => {
          beforeEach(() => {
            response = {
              data: {status: 'Success'},
            };
            networkMock.onGet('/sqleditor/query_tool/poll/123').reply(200, response);

            executeQuery.poll();
          });

          shouldUpdateLoadingIconMessageTestCase();

          it('should render the results', (done) => {
            setTimeout(() => {
              expect(sqlEditorMock.call_render_after_poll)
                .toHaveBeenCalledWith({status: 'Success'});
              done();
            }, 0);
          });
        });

        whenQueryIsStillRunningTestCases();

        describe('when the application lost connection with the database', () => {
          beforeEach(beforeEachNotConnected);

          shouldHideLoadingIconTestCase();
          addNewEntryToHistoryTestCase();

          it('should NOT enable the tool buttons', (done) => {
            disableToolButtonsNotCalled(done);
          });

          it('should NOT disable the cancel button', (done) => {
            cancelButtonNotCalled(done);
          });
        });

        whenQueryWasCancelledTestCases();
      });

      describe('when an error occur', () => {
        let errorMessageJson = {
          errormsg: 'Some error in JSON',
        };
        let errorMessageText = 'Some plain text error';
        let res;

        describe('when the connection to the server was lost', () => {
          describe('when JSON response is available', () => {
            beforeEach(() => {
              res = {responseJSON: errorMessageJson};
              networkMock.onGet('/sqleditor/query_tool/poll/123').reply(401, res);

              executeQuery.poll();
            });

            shouldHideLoadingIconTestCase();
            shouldResetLastQueryInformationTestCase();
            shouldHighlightErrorTestCase('Some error in JSON');
            addNewEntryToHistoryUpdateMsgTestCase('Some error in JSON');

            it('should enable the tool buttons', (done) => {
              disableToolButtonsNotCalled(done);
            });

            shouldDisableCancelButtonTestCase();
          });
          describe('when no JSON response is available', () => {
            beforeEach(() => {
              res = {errormsg: errorMessageText};
              networkMock.onGet('/sqleditor/query_tool/poll/123').reply(401, res);

              executeQuery.poll();
            });

            shouldHideLoadingIconTestCase();
            shouldResetLastQueryInformationTestCase();
            shouldHighlightErrorTestCase('Some plain text error');
            addNewEntryToHistoryUpdateMsgTestCase('Some plain text error');

            it('should not enable the tool buttons', (done) => {
              disableToolButtonsNotCalled(done);
            });

          });

          describe('when cannot reach the Python Server', () => {
            beforeEach(beforeEachPythonServer);

            shouldHideLoadingIconTestCase();
            shouldResetLastQueryInformationTestCase();
            shouldNotHighlightErrorTestCase();
            addNewEntryToHistoryUpdateMsgTestCase('Not connected to the server or the connection to the server has been closed.');

            it('should enable the tool buttons', (done) => {
              disableToolButtonsNotCalled(done);
            });

            shouldDisableCancelButtonTestCase();
          });
        });
      });
    });
  });

  describe('#execute', () => {
    let response;

    beforeEach(() => {
      response = {
        'info': '',
        'errormsg': '',
        'data': {
          'status': true,
          'can_edit': false,
          'info_notifier_timeout': 5,
          'result': '2',
          'can_filter': false,
        },
        'result': null,
        'success': 1,
      };
    });

    context('when the SQL statement is empty', () => {
      it('should return without executing', (done) => {
        let wasNetworkCalled = false;
        networkMock.onAny('/sqleditor/query_tool/start/123').reply(() => {
          wasNetworkCalled = true;
        });

        executeQuery.execute('', {});

        setTimeout(() => {
          expect(wasNetworkCalled).toEqual(false);
          done();
        }, 0);
      });
    });

    context('when the SQL statement is not empty', () => {
      let pollSpy;

      beforeEach(() => {
        sqlEditorMock.gridView = {};
        sqlEditorMock.gridView.query_tool_obj = jasmine.createSpyObj(
          'QueryToolObject',
          ['removeLineClass']
        );

        $('body').append(
          '<div id="test-id">' +
          '<button id="btn-flash" disabled></button>' +
          '<button id="btn-cancel-query"></button>' +
          '</div>'
        );
      });

      afterEach(function () {
        $('body').remove('#test-id');
      });

      describe('before the backend request', () => {
        beforeEach(() => {
          jasmine.clock().install();
          jasmine.clock().mockDate(startTime);
          jasmine.clock().tick(50);
          networkMock.onAny('/sqleditor/query_tool/start/123').reply(200, response);
          pollSpy = spyOn(executeQuery, 'poll');
          executeQuery.execute('some sql query', '');
        });

        afterEach(function () {
          jasmine.clock().uninstall();
        });

        it('should update loading text to "Running query"', () => {
          expect(sqlEditorMock.trigger)
            .toHaveBeenCalledWith(
              'pgadmin-sqleditor:loading-icon:show',
              'Running query...'
            );
        });

        it('disables the run query button', () => {
          let buttonFlash = $('#btn-flash');

          expect(buttonFlash.prop('disabled')).toEqual(true);
        });

        it('enable the cancel query button', () => {
          let buttonFlash = $('#btn-cancel-query');

          expect(buttonFlash.prop('disabled')).toEqual(false);
        });

        it('disable the query tool buttons', () => {
          expect(sqlEditorMock.disable_tool_buttons).toHaveBeenCalledWith(true);
        });

        it('initializes the polling flags', () => {
          expect(sqlEditorMock._init_polling_flags).toHaveBeenCalled();
        });

        it('save the query', () => {
          expect(sqlEditorMock.query).toEqual('some sql query');
        });

        it('reset the number of rows that were affected', () => {
          expect(sqlEditorMock.rows_affected).toEqual(0);
        });

        it('reset query start time', () => {
          expect(sqlEditorMock.query_start_time.getTime()).toEqual(startTime.getTime() + 50);
        });
      });

      describe('when HTTP return 200', () => {
        describe('when backend informs that query started successfully', () => {
          beforeEach(() => {
            networkMock.onPost('/sqleditor/query_tool/start/123?connect=1').reply(200, response);
            pollSpy = spyOn(executeQuery, 'delayedPoll');
            executeQuery.execute('some sql query', '', true);
          });

          it('should changes the loading message to "Waiting for the query to complete"', (done) => {
            setTimeout(() => {
              expect(sqlEditorMock.trigger).toHaveBeenCalledWith(
                'pgadmin-sqleditor:loading-icon:message',
                'Waiting for the query to complete...'
              );
              done();
            }, 0);
          });

          it('should update the can edit flag', (done) => {
            setTimeout(() => {
              expect(sqlEditorMock.can_edit).toEqual(false);
              done();
            }, 0);
          });

          it('should update the can filter flag', (done) => {
            setTimeout(() => {
              expect(sqlEditorMock.can_filter).toEqual(false);
              done();
            }, 0);
          });

          it('should update information notifier timeout', (done) => {
            setTimeout(() => {
              expect(sqlEditorMock.info_notifier_timeout).toEqual(5);
              done();
            }, 0);
          });

          it('should start polling', (done) => {
            setTimeout(() => {
              expect(pollSpy).toHaveBeenCalled();
              done();
            }, 0);
          });
        });

        describe('when explain plan is not empty', () => {
          it('should send the explain plan informatioon through the wire', (done) => {
            networkMock.onAny('/sqleditor/query_tool/start/123').reply((config) => {
              setTimeout(() => {
                expect(config.data).toEqual(JSON.stringify({
                  sql: 'some sql query',
                  explain_plan: {
                    buffers: true,
                    analyze: false,
                    timing: true,
                    summary: false,
                  },
                }));

                done();
              }, 0);
              return [200, ''];
            });
            pollSpy = spyOn(executeQuery, 'delayedPoll');
            executeQuery.execute('some sql query', {
              buffers: true,
              analyze: false,
              timing: true,
              summary: false,
            });
          });


        });

        describe('when backend informs that there was a problem with the query', () => {
          beforeEach(() => {
            response.data.status = false;
            response.data.result = 'something went wrong';
            networkMock.onAny('/sqleditor/query_tool/start/123').reply(200, response);
            pollSpy = spyOn(executeQuery, 'poll');
            executeQuery.execute('some sql query', '');
          });

          shouldHideLoadingIconTestCase();
          shouldEnableToolsButtonTestCase();

          it('update the history tab with the result message', (done) => {
            setTimeout(() => {
              expect(sqlEditorMock.update_msg_history).toHaveBeenCalledWith(false, 'something went wrong');
              done();
            }, 0);
          });

          it('highlight the error in the editor', (done) => {
            setTimeout(() => {
              expect(sqlEditorMock._highlight_error).toHaveBeenCalledWith('something went wrong');
              done();
            }, 0);
          });

          it('should not start polling', (done) => {
            setTimeout(() => {
              expect(pollSpy).not.toHaveBeenCalled();
              done();
            }, 0);
          });
        });

        describe('when there is a marker set in the grid', () => {
          let markerClearSpy;
          beforeEach(() => {
            sqlEditorMock.gridView.marker = jasmine.createSpyObj(
              'GridViewMarker',
              ['clear']
            );
            markerClearSpy = sqlEditorMock.gridView.marker.clear;
            networkMock.onAny('/sqleditor/query_tool/start/123').reply(200, response);
            pollSpy = spyOn(executeQuery, 'poll');
            executeQuery.execute('some sql query', '');
          });

          it('should call clear function on marker', (done) => {
            setTimeout(() => {
              expect(markerClearSpy).toHaveBeenCalled();
              done();
            }, 0);
          });

          it('should removes the marker', (done) => {
            setTimeout(() => {
              expect(sqlEditorMock.gridView.marker).toEqual(null);
              done();
            }, 0);
          });

          it('should remove CSS classes from the editor', (done) => {
            setTimeout(() => {
              expect(sqlEditorMock.gridView.query_tool_obj.removeLineClass)
                .toHaveBeenCalledWith(sqlEditorMock.marked_line_no, 'wrap', 'CodeMirror-activeline-background');
              done();
            }, 0);
          });
        });
      });

      describe('when cannot reach the Python Server', () => {
        beforeEach(() => {
          networkMock.onAny('/sqleditor/query_tool/start/123').reply(500, undefined);


          executeQuery.execute('some sql query', '');
        });

        shouldHideLoadingIconTestCase();
        shouldNotHighlightErrorTestCase();
        addNewEntryToHistoryUpdateMsgTestCase('Not connected to the server or the connection to the server has been closed.');
        shouldEnableToolsButtonTestCase();
      });

      describe('when error is returned by the server', () => {
        describe('when login is not required', () => {
          beforeEach(() => {
            userManagementMock.isPgaLoginRequired.and.returnValue(false);
            response.errormsg = 'some error message';
            networkMock.onAny('/sqleditor/query_tool/start/123').reply(500, response);


            executeQuery.execute('some sql query', '');
          });

          shouldHideLoadingIconTestCase();
          shouldNotHighlightErrorTestCase();
          addNewEntryToHistoryUpdateMsgTestCase('some error message');
          shouldEnableToolsButtonTestCase();
          shouldNotSaveStateTestCase();
          shouldNotDisplayPGALoginTestCase();
        });
        describe('when login is required', () => {
          beforeEach(() => {
            userManagementMock.isPgaLoginRequired.and.returnValue(true);
            response.errormsg = 'some error message';
            networkMock.onAny('/sqleditor/query_tool/start/123').reply(500, response);


            executeQuery.execute('some sql query', '');
          });

          shouldHideLoadingIconTestCase();
          shouldNotHighlightErrorTestCase();
          addNewEntryToHistoryUpdateMsgTestCase('some error message');
          shouldEnableToolsButtonTestCase();
          shouldSaveStateTestCase();
          shouldLoginDisplayedTestCase();
        });
        describe('when a new transaction is not required', () => {
          beforeEach(() => {
            isNewTransactionRequiredMock.and.returnValue(false);
            response.errormsg = 'some error message';
            networkMock.onAny('/sqleditor/query_tool/start/123').reply(500, response);


            executeQuery.execute('some sql query', '');
          });

          shouldHideLoadingIconTestCase();
          shouldNotHighlightErrorTestCase();
          addNewEntryToHistoryUpdateMsgTestCase('some error message');
          shouldEnableToolsButtonTestCase();
          shouldNotSaveStateTestCase();
          shouldNotDisplayPGALoginTestCase();

          it('should not initialize a new transaction', (done) => {
            setTimeout(() => {
              expect(sqlEditorMock.initTransaction).not.toHaveBeenCalled();
              done();
            }, 0);
          });
        });

        describe('when a new transaction is required', () => {
          beforeEach(() => {
            isNewTransactionRequiredMock.and.returnValue(true);
            response.errormsg = 'some error message';
            networkMock.onAny('/sqleditor/query_tool/start/123').reply(500, response);

            executeQuery.execute('some sql query', '');
          });

          shouldHideLoadingIconTestCase();
          shouldNotHighlightErrorTestCase();
          addNewEntryToHistoryUpdateMsgTestCase('some error message');
          shouldEnableToolsButtonTestCase();
          shouldSaveStateTestCase();
          shouldNotDisplayPGALoginTestCase();

          it('should initialize a new transaction', (done) => {
            setTimeout(() => {
              expect(sqlEditorMock.initTransaction).toHaveBeenCalled();
              done();
            }, 0);
          });
        });
        describe('when connection to database is lost', () => {
          beforeEach(() => {
            isNewTransactionRequiredMock.and.returnValue(false);
            response.info = 'CONNECTION_LOST';
            networkMock.onAny('/sqleditor/query_tool/start/123').reply(503, response);

            executeQuery.execute('some sql query', '');
          });

          shouldSaveStateTestCase();

          it('calls handle_connection_lost', (done) => {
            setTimeout(() => {
              expect(sqlEditorMock.handle_connection_lost).toHaveBeenCalled();
              done();
            }, 0);
          });
        });
      });

    });
  });
});

