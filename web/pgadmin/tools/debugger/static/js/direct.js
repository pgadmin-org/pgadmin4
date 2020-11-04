/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore',
  'pgadmin.alertifyjs', 'sources/pgadmin', 'pgadmin.browser', 'backbone',
  'pgadmin.backgrid', 'pgadmin.backform', 'sources/../bundle/codemirror',
  'pgadmin.tools.debugger.ui', 'sources/keyboard_shortcuts',
  'pgadmin.tools.debugger.utils', 'sources/window', 'wcdocker',
], function(
  gettext, url_for, $, _, Alertify, pgAdmin, pgBrowser, Backbone, Backgrid,
  Backform, codemirror, debug_function_again, keyboardShortcuts, debuggerUtils,
  pgWindow
) {

  var CodeMirror = codemirror.default,
    wcDocker = window.wcDocker;

  if (pgAdmin.Browser.tree != null) {
    pgAdmin = pgAdmin || window.pgAdmin || {};
  }

  var pgTools = pgAdmin.Tools = pgAdmin.Tools || {};

  if (pgTools.DirectDebug)
    return pgTools.DirectDebug;

  var controller = new(function() {});

  _.extend(
    controller, Backbone.Events, {
      enable: function(btn, enable) {
        // trigger the event and change the button view to enable/disable the buttons for debugging
        this.trigger('pgDebugger:button:state:' + btn, enable);
      },

      enable_toolbar_buttons: function() {
        var self = this;
        self.enable('stop', true);
        self.enable('step_over', true);
        self.enable('step_into', true);
        self.enable('toggle_breakpoint', true);
        self.enable('clear_all_breakpoints', true);
        self.enable('continue', true);
      },

      disable_toolbar_buttons: function() {
        var self = this;
        self.enable('stop', false);
        self.enable('step_over', false);
        self.enable('step_into', false);
        self.enable('toggle_breakpoint', false);
        self.enable('clear_all_breakpoints', false);
        self.enable('continue', false);
      },

      /*
        Function to set the breakpoint and send the line no. which is set to server
        trans_id :- Unique Transaction ID, line_no - line no. to set the breakpoint,
        set_type = 0 - clear , 1 - set
      */
      set_breakpoint: function(trans_id, line_no, set_type) {
        // Make ajax call to set/clear the break point by user
        var baseUrl = url_for('debugger.set_breakpoint', {
          'trans_id': trans_id,
          'line_no': line_no,
          'set_type': set_type,
        });
        $.ajax({
          url: baseUrl,
          method: 'GET',
        })
          .done(function(res) {
            if (res.data.status) {
            // Breakpoint has been set by the user
            }
          })
          .fail(function() {
            Alertify.alert(
              gettext('Debugger Error'),
              gettext('Error while setting debugging breakpoint.')
            );
          });
      },

      // Function to get the latest breakpoint information and update the
      // gutters of codemirror
      UpdateBreakpoint: function(trans_id) {
        var self = this;

        var br_list = self.GetBreakpointInformation(trans_id);

        // If there is no break point to clear then we should return from here.
        if ((br_list.length == 1) && (br_list[0].linenumber == -1))
          return;

        var breakpoint_list = new Array();

        for (var i = 0; i < br_list.length; i++) {
          if (br_list[i].linenumber != -1) {
            breakpoint_list.push(br_list[i].linenumber);
          }
        }

        for (i = 0; i < breakpoint_list.length; i++) {
          var info = pgTools.DirectDebug.editor.lineInfo((breakpoint_list[i] - 1));

          if (info.gutterMarkers != undefined) {
            pgTools.DirectDebug.editor.setGutterMarker((breakpoint_list[i] - 1), 'breakpoints', null);
          } else {
            pgTools.DirectDebug.editor.setGutterMarker((breakpoint_list[i] - 1), 'breakpoints', function() {
              var marker = document.createElement('div');
              marker.style.color = '#822';
              marker.innerHTML = '●';
              return marker;
            }());
          }
        }
      },

      // Function to get the breakpoint information from the server
      GetBreakpointInformation: function(trans_id) {
        var result = '';

        // Make ajax call to listen the database message
        var baseUrl = url_for('debugger.execute_query', {
          'trans_id': trans_id,
          'query_type': 'get_breakpoints',
        });
        $.ajax({
          url: baseUrl,
          method: 'GET',
          async: false,
        })
          .done(function(res) {
            if (res.data.status === 'Success') {
              result = res.data.result;
            } else if (res.data.status === 'NotConnected') {
              Alertify.alert(
                gettext('Debugger Error'),
                gettext('Error while fetching breakpoint information.')
              );
            }
          })
          .fail(function() {
            Alertify.alert(
              gettext('Debugger Error'),
              gettext('Error while fetching breakpoint information.')
            );
          });

        return result;
      },

      setActiveLine: function(lineNo) {
        var self = this;
        let editor = pgTools.DirectDebug.editor;

        /* If lineNo sent, remove active line */
        if(lineNo && self.active_line_no) {
          editor.removeLineClass(
            self.active_line_no, 'wrap', 'CodeMirror-activeline-background'
          );
        }

        /* If lineNo not sent, set it to active line */
        if(!lineNo && self.active_line_no) {
          lineNo = self.active_line_no;
        }

        /* Set new active line only if positive */
        if(lineNo > 0) {
          self.active_line_no = lineNo;
          editor.addLineClass(
            self.active_line_no, 'wrap', 'CodeMirror-activeline-background'
          );

          /* centerOnLine is codemirror extension in bundle/codemirror.js */
          editor.centerOnLine(self.active_line_no);
        }
      },

      // Function to start the executer and execute the user requested option for debugging
      start_execution: function(trans_id, port_num) {
        var self = this;
        // Make ajax call to listen the database message
        var baseUrl = url_for(
          'debugger.start_execution', {
            'trans_id': trans_id,
            'port_num': port_num,
          });
        $.ajax({
          url: baseUrl,
          method: 'GET',
        })
          .done(function(res) {
            if (res.data.status === 'Success') {
            // If status is Success then find the port number to attach the executer.
              self.execute_query(trans_id);
            } else if (res.data.status === 'NotConnected') {
              Alertify.alert(
                gettext('Debugger Error'),
                gettext('Error while starting debugging session.')
              );
            }
          })
          .fail(function() {
            Alertify.alert(
              gettext('Debugger Error'),
              gettext('Error while starting debugging session.')
            );
          });
      },

      // Execute the query and get the first functions debug information from the server
      execute_query: function(trans_id) {
        var self = this;
        // Make ajax call to listen the database message
        var baseUrl = url_for(
          'debugger.execute_query', {
            'trans_id': trans_id,
            'query_type': 'wait_for_breakpoint',
          });
        $.ajax({
          url: baseUrl,
          method: 'GET',
        })
          .done(function(res) {
            if (res.data.status === 'Success') {
            // set the return code to the code editor text area
              if (
                res.data.result[0].src != null &&
              res.data.result[0].linenumber != null
              ) {
                pgTools.DirectDebug.editor.setValue(res.data.result[0].src);

                self.setActiveLine(res.data.result[0].linenumber - 2);
              }
              // Call function to create and update local variables ....
              self.GetStackInformation(trans_id);
              if (pgTools.DirectDebug.debug_type) {
                self.poll_end_execution_result(trans_id);
              }
            } else if (res.data.status === 'NotConnected') {
              Alertify.alert(
                gettext('Debugger Error'),
                gettext('Error while executing requested debugging information.')
              );
            }
          })
          .fail(function() {
            Alertify.alert(
              gettext('Debugger Error'),
              gettext('Error while executing requested debugging information.')
            );
          });
      },

      // Get the local variable information of the functions and update the grid
      GetLocalVariables: function(trans_id) {
        var self = this;

        // Make ajax call to listen the database message
        var baseUrl = url_for(
          'debugger.execute_query', {
            'trans_id': trans_id,
            'query_type': 'get_variables',
          });
        $.ajax({
          url: baseUrl,
          method: 'GET',
        })
          .done(function(res) {
            if (res.data.status === 'Success') {
            // Call function to create and update local variables
              self.AddLocalVariables(res.data.result);
              self.AddParameters(res.data.result);
              // If debug function is restarted then again start listener to
              // read the updated messages.
              if (pgTools.DirectDebug.debug_restarted) {
                if (pgTools.DirectDebug.debug_type) {
                  self.poll_end_execution_result(trans_id);
                }
                pgTools.DirectDebug.debug_restarted = false;
              }
            } else if (res.data.status === 'NotConnected') {
              Alertify.alert(
                gettext('Debugger Error'),
                gettext('Error while fetching variable information.')
              );
            }
          })
          .fail(function() {
            Alertify.alert(
              gettext('Debugger Error'),
              gettext('Error while fetching variable information.')
            );
          });
      },

      // Get the stack information of the functions and update the grid
      GetStackInformation: function(trans_id) {
        var self = this;

        // Make ajax call to listen the database message
        var baseUrl = url_for(
          'debugger.execute_query', {
            'trans_id': trans_id,
            'query_type': 'get_stack_info',
          });
        $.ajax({
          url: baseUrl,
          method: 'GET',
        })
          .done(function(res) {
            if (res.data.status === 'Success') {
            // Call function to create and update stack information
              self.AddStackInformation(res.data.result);
              self.GetLocalVariables(pgTools.DirectDebug.trans_id);
            } else if (res.data.status === 'NotConnected') {
              Alertify.alert(
                gettext('Debugger Error'),
                gettext('Error while fetching stack information.')
              );
            }
          })
          .fail(function() {
            Alertify.alert(
              gettext('Debugger Error'),
              gettext('Error while fetching stack information.')
            );
          });
      },

      /*
        poll the actual result after user has executed the "continue", "step-into",
        "step-over" actions and get the other updated information from the server.
      */
      poll_result: function(trans_id) {
        var self = this;

        // Do we need to poll?
        if (!pgTools.DirectDebug.is_polling_required) {
          return;
        }

        // Make ajax call to listen the database message
        var baseUrl = url_for('debugger.poll_result', {
            'trans_id': trans_id,
          }),
          poll_timeout;

        /*
          During the execution we should poll the result in minimum seconds but
          once the execution is completed and wait for the another debugging
          session then we should decrease the polling frequency.
        */
        if (pgTools.DirectDebug.polling_timeout_idle) {
          // Poll the result after 1 second
          poll_timeout = 1000;
        } else {
          // Poll the result after 200 ms
          poll_timeout = 200;
        }

        setTimeout(
          function() {
            $.ajax({
              url: baseUrl,
              method: 'GET',
              beforeSend: function(xhr) {
                xhr.setRequestHeader(
                  pgAdmin.csrf_token_header, pgAdmin.csrf_token
                );
                // set cursor to progress before every poll.
                $('.debugger-container').addClass('show_progress');
              },
            })
              .done(function(res) {
              // remove progress cursor
                $('.debugger-container').removeClass('show_progress');

                if (res.data.status === 'Success') {
                // If no result then poll again to wait for results.
                  if (res.data.result == null || res.data.result.length == 0) {
                    self.poll_result(trans_id);
                  } else {
                    if (!pgTools.DirectDebug.debug_type && !pgTools.DirectDebug.first_time_indirect_debug) {
                      pgTools.DirectDebug.docker.finishLoading(50);
                      self.setActiveLine(-1);
                      self.clear_all_breakpoint(trans_id);
                      self.execute_query(trans_id);
                      pgTools.DirectDebug.first_time_indirect_debug = true;
                      pgTools.DirectDebug.polling_timeout_idle = false;
                    } else {
                      pgTools.DirectDebug.polling_timeout_idle = false;
                      pgTools.DirectDebug.docker.finishLoading(50);
                      // If the source is really changed then only update the breakpoint information
                      if (res.data.result[0].src != pgTools.DirectDebug.editor.getValue()) {
                        pgTools.DirectDebug.editor.setValue(res.data.result[0].src);
                        self.UpdateBreakpoint(trans_id);
                      }

                      self.setActiveLine(res.data.result[0].linenumber - 2);
                      // Update the stack, local variables and parameters information
                      self.GetStackInformation(trans_id);
                    }

                    // Enable all the buttons as we got the results
                    // TODO: Fix this properly so a timeout isn't required.
                    setTimeout(function() {
                      self.enable_toolbar_buttons();
                    }, 500);
                  }
                } else if (res.data.status === 'Busy') {
                  pgTools.DirectDebug.polling_timeout_idle = true;
                  // If status is Busy then poll the result by recursive call to the poll function
                  if (!pgTools.DirectDebug.debug_type) {
                    pgTools.DirectDebug.docker.startLoading(
                      gettext('Waiting for another session to invoke the target...')
                    );

                    // As we are waiting for another session to invoke the target,disable all the buttons
                    self.disable_toolbar_buttons();
                    pgTools.DirectDebug.first_time_indirect_debug = false;
                    self.poll_result(trans_id);
                  } else {
                    self.poll_result(trans_id);
                  }
                } else if (res.data.status === 'NotConnected') {
                  Alertify.alert(
                    gettext('Debugger Error'),
                    gettext('Error while polling result.')
                  );
                }
              })
              .fail(function() {
                Alertify.alert(
                  gettext('Debugger Error'),
                  gettext('Error while polling result.')
                );
              });
          }, poll_timeout);

      },

      // This function will update messages tab
      update_messages: function(msg) {
        // To prevent xss
        msg = _.escape(msg);

        var old_msgs = '',
          new_msgs = '';
        old_msgs = pgTools.DirectDebug.messages_panel.$container.find('.messages').html();
        if (old_msgs) {
          new_msgs = (old_msgs + '\n' + msg)
            .replace(/(?:\r\n|\r|\n)/g, '<br />') // Newlines with <br>
            .replace(/(<br\ ?\/?>)+/g, '<br />'); // multiple <br> with single <br>
        } else {
          new_msgs = msg;
        }
        pgTools.DirectDebug.messages_panel.$container.find('.messages').html(new_msgs);
      },

      /*
        For the direct debugging, we need to check weather the functions execution
        is completed or not. After completion of the debugging, we will stop polling
        the result  until new execution starts.
      */
      poll_end_execution_result: function(trans_id) {
        var self = this;

        // Do we need to poll?
        if (!pgTools.DirectDebug.is_polling_required) {
          return;
        }

        // Make ajax call to listen the database message
        var baseUrl = url_for('debugger.poll_end_execution_result', {
            'trans_id': trans_id,
          }),
          poll_end_timeout;

        /*
         * During the execution we should poll the result in minimum seconds
         * but once the execution is completed and wait for the another
         * debugging session then we should decrease the polling frequency.
         */
        if (pgTools.DirectDebug.polling_timeout_idle) {
          // Poll the result to check that execution is completed or not
          // after 1200 ms
          poll_end_timeout = 1200;
        } else {
          // Poll the result to check that execution is completed or not
          // after 350 ms
          poll_end_timeout = 250;
        }

        setTimeout(
          function() {
            $.ajax({
              url: baseUrl,
              method: 'GET',
            })
              .done(function(res) {
                if (res.data.status === 'Success') {
                  if (res.data.result == undefined) {
                  /*
                   "result" is undefined only in case of EDB procedure.
                   As Once the EDB procedure execution is completed then we are
                   not getting any result so we need ignore the result.
                  */
                    self.setActiveLine(-1);
                    pgTools.DirectDebug.direct_execution_completed = true;
                    pgTools.DirectDebug.polling_timeout_idle = true;

                    //Set the alertify message to inform the user that execution is completed.
                    Alertify.success(res.info, 3);

                    // Update the message tab of the debugger
                    if (res.data.status_message) {
                      self.update_messages(res.data.status_message);
                    }

                    // remove progress cursor
                    $('.debugger-container').removeClass('show_progress');

                    // Execution completed so disable the buttons other than
                    // "Continue/Start" button because user can still
                    // start the same execution again.
                    setTimeout(function() {
                      self.enable('stop', false);
                      self.enable('step_over', false);
                      self.enable('step_into', false);
                      self.enable('toggle_breakpoint', false);
                      self.enable('clear_all_breakpoints', false);
                      self.enable('continue', true);
                    }, 500);

                    // Stop further polling
                    pgTools.DirectDebug.is_polling_required = false;
                  } else {
                  // Call function to create and update local variables ....
                    if (res.data.result != null) {
                      self.setActiveLine(-1);
                      self.AddResults(res.data.col_info, res.data.result);
                      pgTools.DirectDebug.results_panel.focus();
                      pgTools.DirectDebug.direct_execution_completed = true;
                      pgTools.DirectDebug.polling_timeout_idle = true;

                      //Set the alertify message to inform the user that execution is completed.
                      Alertify.success(res.info, 3);

                      // Update the message tab of the debugger
                      if (res.data.status_message) {
                        self.update_messages(res.data.status_message);
                      }

                      // remove progress cursor
                      $('.debugger-container').removeClass('show_progress');

                      // Execution completed so disable the buttons other than
                      // "Continue/Start" button because user can still
                      // start the same execution again.
                      setTimeout(function() {
                        self.enable('stop', false);
                        self.enable('step_over', false);
                        self.enable('step_into', false);
                        self.enable('toggle_breakpoint', false);
                        self.enable('clear_all_breakpoints', false);
                        self.enable('continue', true);
                      }, 500);

                      // Stop further pooling
                      pgTools.DirectDebug.is_polling_required = false;
                    }
                  }
                } else if (res.data.status === 'Busy') {
                // If status is Busy then poll the result by recursive call to
                // the poll function
                  self.poll_end_execution_result(trans_id);
                  // Update the message tab of the debugger
                  if (res.data.status_message) {
                    self.update_messages(res.data.status_message);
                  }
                } else if (res.data.status === 'NotConnected') {
                  Alertify.alert(
                    gettext('Debugger poll end execution error'),
                    res.data.result
                  );
                } else if (res.data.status === 'ERROR') {
                  pgTools.DirectDebug.direct_execution_completed = true;
                  self.setActiveLine(-1);

                  //Set the Alertify message to inform the user that execution is
                  // completed with error.
                  if (!pgTools.DirectDebug.is_user_aborted_debugging) {
                    Alertify.error(res.info, 3);
                  }

                  // Update the message tab of the debugger
                  if (res.data.status_message) {
                    self.update_messages(res.data.status_message);
                  }

                  pgTools.DirectDebug.messages_panel.focus();

                  // remove progress cursor
                  $('.debugger-container').removeClass('show_progress');

                  // Execution completed so disable the buttons other than
                  // "Continue/Start" button because user can still start the
                  // same execution again.
                  self.enable('stop', false);
                  self.enable('step_over', false);
                  self.enable('step_into', false);
                  self.enable('toggle_breakpoint', false);
                  self.enable('clear_all_breakpoints', false);
                  // If debugging is stopped by user then do not enable
                  // continue/restart button
                  if (!pgTools.DirectDebug.is_user_aborted_debugging) {
                    self.enable('continue', true);
                    pgTools.DirectDebug.is_user_aborted_debugging = false;
                  }

                  // Stop further pooling
                  pgTools.DirectDebug.is_polling_required = false;
                }
              })
              .fail(function() {
                Alertify.alert(
                  gettext('Debugger Error'),
                  gettext('Error while polling result.')
                );
              });
          }, poll_end_timeout);

      },

      Restart: function(trans_id) {

        var self = this,
          baseUrl = url_for('debugger.restart', {'trans_id': trans_id});

        self.disable_toolbar_buttons();

        // Clear msg tab
        pgTools.DirectDebug
          .messages_panel
          .$container
          .find('.messages')
          .html('');

        $.ajax({
          url: baseUrl,
        })
          .done(function(res) {
          // Restart the same function debugging with previous arguments
            var restart_dbg = res.data.restart_debug ? 1 : 0;

            // Start pooling again
            pgTools.DirectDebug.polling_timeout_idle = false;
            pgTools.DirectDebug.is_polling_required = true;
            self.poll_result(trans_id);

            if (restart_dbg) {
              pgTools.DirectDebug.debug_restarted = true;
            }

            /*
           Need to check if restart debugging really require to open the input
           dialog? If yes then we will get the previous arguments from database
           and populate the input dialog, If no then we should directly start the
           listener.
          */
            if (res.data.result.require_input) {
              debug_function_again(res.data.result, restart_dbg);
            } else {
            // Debugging of void function is started again so we need to start
            // the listener again
              var base_url = url_for('debugger.start_listener', {
                'trans_id': trans_id,
              });

              $.ajax({
                url: base_url,
                method: 'GET',
              })
                .done(function() {
                  if (pgTools.DirectDebug.debug_type) {
                    self.poll_end_execution_result(trans_id);
                  }
                })
                .fail(function() {
                  Alertify.alert(
                    gettext('Debugger Error'),
                    gettext('Error while polling result.')
                  );
                });
            }
          })
          .fail(function(xhr) {
            try {
              var err = JSON.parse(xhr.responseText);
              if (err.success == 0) {
                Alertify.alert(gettext('Debugger Error'), err.errormsg);
              }
            } catch (e) {
              console.warn(e.stack || e);
            }
          });
      },

      // Continue the execution until the next breakpoint
      Continue: function(trans_id) {
        var self = this;
        self.disable_toolbar_buttons();

        //Check first if previous execution was completed or not
        if (pgTools.DirectDebug.direct_execution_completed &&
          pgTools.DirectDebug.direct_execution_completed == pgTools.DirectDebug.polling_timeout_idle) {
          self.Restart(trans_id);
        } else {
          // Make ajax call to listen the database message
          var baseUrl = url_for('debugger.execute_query', {
            'trans_id': trans_id,
            'query_type': 'continue',
          });
          $.ajax({
            url: baseUrl,
            method: 'GET',
          })
            .done(function(res) {
              if (res.data.status) {
                self.poll_result(trans_id);
              } else {
                Alertify.alert(
                  gettext('Debugger Error'),
                  gettext('Error while executing continue in debugging session.')
                );
              }
            })
            .fail(function() {
              Alertify.alert(
                gettext('Debugger Error'),
                gettext('Error while executing continue in debugging session.')
              );
            });
        }
      },

      Step_over: function(trans_id) {
        var self = this;
        self.disable_toolbar_buttons();

        // Make ajax call to listen the database message
        var baseUrl = url_for('debugger.execute_query', {
          'trans_id': trans_id,
          'query_type': 'step_over',
        });
        $.ajax({
          url: baseUrl,
          method: 'GET',
        })
          .done(function(res) {
            if (res.data.status) {
              self.poll_result(trans_id);
            } else {
              Alertify.alert(
                gettext('Debugger Error'),
                gettext('Error while executing step over in debugging session.')
              );
            }
          })
          .fail(function() {
            Alertify.alert(
              gettext('Debugger Error'),
              gettext('Error while executing step over in debugging session.')
            );
          });
      },

      Step_into: function(trans_id) {
        var self = this;
        self.disable_toolbar_buttons();

        // Make ajax call to listen the database message
        var baseUrl = url_for('debugger.execute_query', {
          'trans_id': trans_id,
          'query_type': 'step_into',
        });
        $.ajax({
          url: baseUrl,
          method: 'GET',
        })
          .done(function(res) {
            if (res.data.status) {
              self.poll_result(trans_id);
            } else {
              Alertify.alert(
                gettext('Debugger Error'),
                gettext('Error while executing step into in debugging session.')
              );
            }
          })
          .fail(function() {
            Alertify.alert(
              gettext('Debugger Error'),
              gettext('Error while executing step into in debugging session.')
            );
          });
      },

      Stop: function(trans_id) {
        var self = this;
        self.disable_toolbar_buttons();

        // Make ajax call to listen the database message
        var baseUrl = url_for(
          'debugger.execute_query', {
            'trans_id': trans_id,
            'query_type': 'abort_target',
          });
        $.ajax({
          url: baseUrl,
          method: 'GET',
        })
          .done(function(res) {
            if (res.data.status) {
            // Call function to create and update local variables ....
              self.setActiveLine(-1);
              pgTools.DirectDebug.direct_execution_completed = true;
              pgTools.DirectDebug.is_user_aborted_debugging = true;

              // Stop further pooling
              pgTools.DirectDebug.is_polling_required = false;

              // Restarting debugging in the same transaction do not work
              // We will give same behaviour as pgAdmin3 and disable all buttons
              self.enable('continue', false);

              // Set the Alertify message to inform the user that execution
              // is completed.
              Alertify.success(res.info, 3);
            } else if (res.data.status === 'NotConnected') {
              Alertify.alert(
                gettext('Debugger Error'),
                gettext('Error while executing stop in debugging session.')
              );
            }
          })
          .fail(function() {
            Alertify.alert(
              gettext('Debugger Error'),
              gettext('Error while executing stop in debugging session.')
            );
          });
      },

      toggle_breakpoint: function(trans_id) {
        var self = this;
        self.disable_toolbar_buttons();


        var info = pgTools.DirectDebug.editor.lineInfo(self.active_line_no);
        var baseUrl = '';

        // If gutterMarker is undefined that means there is no marker defined previously
        // So we need to set the breakpoint command here...
        if (info.gutterMarkers == undefined) {
          baseUrl = url_for('debugger.set_breakpoint', {
            'trans_id': trans_id,
            'line_no': self.active_line_no + 1,
            'set_type': '1',
          });
        } else {
          baseUrl = url_for('debugger.set_breakpoint', {
            'trans_id': trans_id,
            'line_no': self.active_line_no + 1,
            'set_type': '0',
          });
        }

        $.ajax({
          url: baseUrl,
          method: 'GET',
        })
          .done(function(res) {
            if (res.data.status) {
            // Call function to create and update local variables ....
              var info_local = pgTools.DirectDebug.editor.lineInfo(self.active_line_no);

              if (info_local.gutterMarkers != undefined) {
                pgTools.DirectDebug.editor.setGutterMarker(self.active_line_no, 'breakpoints', null);
              } else {
                pgTools.DirectDebug.editor.setGutterMarker(self.active_line_no, 'breakpoints', function() {
                  var marker = document.createElement('div');
                  marker.style.color = '#822';
                  marker.innerHTML = '●';
                  return marker;
                }());
              }

              self.enable_toolbar_buttons();
            } else if (res.data.status === 'NotConnected') {
              Alertify.alert(
                gettext('Debugger Error'),
                gettext('Error while toggling breakpoint.')
              );
            }
          })
          .fail(function() {
            Alertify.alert(
              gettext('Debugger Error'),
              gettext('Error while toggling breakpoint.')
            );
          });
      },

      clear_all_breakpoint: function(trans_id) {
        var self = this,
          br_list = self.GetBreakpointInformation(trans_id);

        // If there is no break point to clear then we should return from here.
        if ((br_list.length == 1) && (br_list[0].linenumber == -1))
          return;

        self.disable_toolbar_buttons();

        var breakpoint_list = new Array();

        for (var i = 0; i < br_list.length; i++) {
          if (br_list[i].linenumber != -1) {
            breakpoint_list.push(br_list[i].linenumber);
          }
        }

        // Make ajax call to listen the database message
        var baseUrl = url_for('debugger.clear_all_breakpoint', {
          'trans_id': trans_id,
        });

        $.ajax({
          url: baseUrl,
          method: 'POST',
          data: {
            'breakpoint_list': breakpoint_list.join(),
          },
        })
          .done(function(res) {
            if (res.data.status) {
              for (var j = 0; j < breakpoint_list.length; j++) {
                var info = pgTools.DirectDebug.editor.lineInfo((breakpoint_list[j] - 1));

                if (info) {
                  if (info.gutterMarkers != undefined) {
                    pgTools.DirectDebug.editor.setGutterMarker((breakpoint_list[j] - 1), 'breakpoints', null);
                  }
                }
              }
            }
            self.enable_toolbar_buttons();
          })
          .fail(function() {
            Alertify.alert(
              gettext('Debugger Error'),
              gettext('Error while clearing all breakpoint.')
            );
          });
      },

      AddStackInformation: function(result) {
        var self = this;

        // Remove the existing created grid and update the stack values
        if (self.stack_grid) {
          self.stack_grid.remove();
          self.stack_grid = null;
        }

        var DebuggerStackModel = Backbone.Model.extend({
          defaults: {
            frame_id: 0,
            name: undefined,
            value: undefined,
            line_no: undefined,
          },
        });

        // Collection which contains the model for function informations.
        var StackCollection = Backbone.Collection.extend({
          model: DebuggerStackModel,
        });

        var stackGridCols = [{
          name: 'name',
          label: gettext('Name'),
          type: 'text',
          editable: false,
          cell: 'string',
        },
        {
          name: 'value',
          label: gettext('Value'),
          type: 'text',
          editable: false,
          cell: 'string',
        },
        {
          name: 'line_no',
          label: gettext('Line No.'),
          type: 'text',
          editable: false,
          cell: 'string',
        },
        ];

        var my_obj = [];
        for (var i = 0; i < result.length; i++) {
          my_obj.push({
            'frame_id': i,
            'name': result[i].targetname,
            'value': result[i].args,
            'line_no': result[i].linenumber,
          });
        }

        var stackColl = this.stackColl = new StackCollection(my_obj);
        this.stackColl.on('backgrid:row:selected', self.select_frame, self);

        // Initialize a new Grid instance
        var stack_grid = this.stack_grid = new Backgrid.Grid({
          emptyText: gettext('No data found'),
          columns: stackGridCols,
          row: Backgrid.Row.extend({
            events: {
              click: 'rowClick',
            },
            rowClick: function() {
              //Find which row is selected and depending on that send the frame id
              self.frame_id = this.model.get('frame_id');
              this.model.trigger('backgrid:row:selected', this);
              self.stack_grid.$el.find('td').css(
                'background-color', this.disabledColor
              );
              this.$el.find('td').css('background-color', this.highlightColor);
            },
          }),
          collection: stackColl,
          className: 'backgrid table table-bordered table-noouter-border table-bottom-border',
        });

        stack_grid.render();

        // Render the stack grid into stack panel
        pgTools.DirectDebug.stack_pane_panel
          .$container
          .find('.stack_pane')
          .append(stack_grid.el);

      },

      AddResults: function(columns, result) {
        var self = this;

        // Remove the existing created grid and update the result values
        if (self.result_grid) {
          self.result_grid.remove();
          self.result_grid = null;
        }

        var DebuggerResultsModel = Backbone.Model.extend({
          defaults: {
            name: undefined,
          },
        });

        // Collection which contains the model for function informations.
        var ResultsCollection = Backbone.Collection.extend({
          model: DebuggerResultsModel,
        });

        var resultGridCols = [];
        if (_.size(columns)) {
          _.each(columns, function(c) {
            var column = {
              type: 'text',
              editable: false,
              cell: 'string',
            };
            column['name'] = column['label'] = c.name;
            resultGridCols.push(column);
          });
        }

        // Initialize a new Grid instance
        var result_grid = this.result_grid = new Backgrid.Grid({
          emptyText: gettext('No data found'),
          columns: resultGridCols,
          collection: new ResultsCollection(result),
          className: 'backgrid table table-bordered table-noouter-border table-bottom-border',
        });

        result_grid.render();

        // Render the result grid into result panel
        pgTools.DirectDebug.results_panel
          .$container
          .find('.debug_results')
          .append(result_grid.el);
      },

      AddLocalVariables: function(result) {
        var self = this;

        // Remove the existing created grid and update the variables values
        if (self.variable_grid) {
          self.variable_grid.remove();
          self.variable_grid = null;
        }

        var DebuggerVariablesModel = Backbone.Model.extend({
          defaults: {
            name: undefined,
            type: undefined,
            value: undefined,
          },
        });

        // Collection which contains the model for function information.
        var VariablesCollection = Backbone.Collection.extend({
          model: DebuggerVariablesModel,
        });

        VariablesCollection.prototype.on(
          'change', self.deposit_parameter_value, self
        );

        var gridCols = [{
          name: 'name',
          label: gettext('Name'),
          type: 'text',
          editable: false,
          cell: 'string',
        },
        {
          name: 'type',
          label: gettext('Type'),
          type: 'text',
          editable: false,
          cell: 'string',
        },
        {
          name: 'value',
          label: gettext('Value'),
          type: 'text',
          cell: 'string',
        },
        ];

        var my_obj = [];
        if (result.length != 0) {
          for (var i = 0; i < result.length; i++) {
            if (result[i].varclass == 'L') {
              my_obj.push({
                'name': result[i].name,
                'type': result[i].dtype,
                'value': result[i].value,
              });
            }
          }
        }

        // Initialize a new Grid instance
        var variable_grid = this.variable_grid = new Backgrid.Grid({
          emptyText: gettext('No data found'),
          columns: gridCols,
          collection: new VariablesCollection(my_obj),
          className: 'backgrid table table-bordered table-noouter-border table-bottom-border',
        });

        variable_grid.collection.on(
          'backgrid:edited', (ch1, ch2, command) => {
            debuggerUtils.setFocusToDebuggerEditor(
              pgTools.DirectDebug.editor, command
            );
          }
        );

        variable_grid.render();

        // Render the variables grid into local variables panel
        pgTools.DirectDebug.local_variables_panel
          .$container
          .find('.local_variables')
          .append(variable_grid.el);
      },

      AddParameters: function(result) {
        var self = this;

        // Remove the existing created grid and update the parameter values
        if (self.param_grid) {
          self.param_grid.remove();
          self.param_grid = null;
        }

        var DebuggerParametersModel = Backbone.Model.extend({
          defaults: {
            name: undefined,
            type: undefined,
            value: undefined,
          },
        });

        // Collection which contains the model for function informations.
        var ParametersCollection = self.ParametersCollection = Backbone.Collection.extend({
          model: DebuggerParametersModel,
        });

        ParametersCollection.prototype.on(
          'change', self.deposit_parameter_value, self
        );

        var paramGridCols = [{
          name: 'name',
          label: gettext('Name'),
          type: 'text',
          editable: false,
          cell: 'string',
        },
        {
          name: 'type',
          label: gettext('Type'),
          type: 'text',
          editable: false,
          cell: 'string',
        },
        {
          name: 'value',
          label: gettext('Value'),
          type: 'text',
          cell: 'string',
        },
        ];

        var param_obj = [];
        if (result.length != 0) {
          for (var i = 0; i < result.length; i++) {
            if (result[i].varclass == 'A') {
              param_obj.push({
                'name': result[i].name,
                'type': result[i].dtype,
                'value': result[i].value,
              });
            }
          }
        }

        // Initialize a new Grid instance
        var param_grid = this.param_grid = new Backgrid.Grid({
          emptyText: gettext('No data found'),
          columns: paramGridCols,
          collection: new ParametersCollection(param_obj),
          className: 'backgrid table table-bordered table-noouter-border table-bottom-border',
        });

        param_grid.collection.on(
          'backgrid:edited', (ch1, ch2, command) => {
            debuggerUtils.setFocusToDebuggerEditor(
              pgTools.DirectDebug.editor, command
            );
          }
        );

        param_grid.render();

        // Render the parameters grid into parameter panel
        pgTools.DirectDebug.parameters_panel
          .$container
          .find('.parameters')
          .append(param_grid.el);
      },
      deposit_parameter_value: function(model) {
        var self = this;

        // variable name and value list that is changed by user
        var name_value_list = [];

        name_value_list.push({
          'name': model.get('name'),
          'type': model.get('type'),
          'value': model.get('value'),
        });

        // Make ajax call to listen the database message
        var baseUrl = url_for('debugger.deposit_value', {
          'trans_id': pgTools.DirectDebug.trans_id,
        });
        $.ajax({
          url: baseUrl,
          method: 'POST',
          data: {
            'data': JSON.stringify(name_value_list),
          },
        })
          .done(function(res) {
            if (res.data.status) {
            // Get the updated variables value
              self.GetLocalVariables(pgTools.DirectDebug.trans_id);
              // Show the message to the user that deposit value is success or failure
              if (res.data.result) {
                Alertify.success(res.data.info, 3);
              } else {
                Alertify.error(res.data.info, 3);
              }
            }
          })
          .fail(function() {
            Alertify.alert(
              gettext('Debugger Error'),
              gettext('Error while depositing variable value.')
            );
          });
      },

      select_frame: function() {
        var self = this;

        // Make ajax call to listen the database message
        var baseUrl = url_for('debugger.select_frame', {
          'trans_id': pgTools.DirectDebug.trans_id,
          'frame_id': self.frame_id,
        });
        $.ajax({
          url: baseUrl,
          method: 'GET',
        })
          .done(function(res) {
            if (res.data.status) {
              pgTools.DirectDebug.editor.setValue(res.data.result[0].src);
              self.UpdateBreakpoint(pgTools.DirectDebug.trans_id);
              self.setActiveLine(res.data.result[0].linenumber - 2);
              // Call function to create and update local variables ....
              self.GetLocalVariables(pgTools.DirectDebug.trans_id);
            }
          })
          .fail(function() {
            Alertify.alert(
              gettext('Debugger Error'),
              gettext('Error while selecting frame.')
            );
          });
      },
    }
  );

  /*
    Debugger tool var view to create the button toolbar and listen to the button click event and inform the
    controller about the click and controller will take the action for the specified button click.
  */
  var DebuggerToolbarView = Backbone.View.extend({
    el: '.debugger_main_container',
    initialize: function() {
      controller.on('pgDebugger:button:state:stop', this.enable_stop, this);
      controller.on('pgDebugger:button:state:step_over', this.enable_step_over, this);
      controller.on('pgDebugger:button:state:step_into', this.enable_step_into, this);
      controller.on('pgDebugger:button:state:continue', this.enable_continue, this);
      controller.on('pgDebugger:button:state:toggle_breakpoint', this.enable_toggle_breakpoint, this);
      controller.on('pgDebugger:button:state:clear_all_breakpoints', this.enable_clear_all_breakpoints, this);
    },
    events: {
      'click .btn-stop': 'on_stop',
      'click .btn-clear-breakpoint': 'on_clear_all_breakpoint',
      'click .btn-toggle-breakpoint': 'on_toggle_breakpoint',
      'click .btn-continue': 'on_continue',
      'click .btn-step-over': 'on_step_over',
      'click .btn-step-into': 'on_step_into',
      'keydown': 'keyAction',
    },
    enable_stop: function(enable) {
      var $btn = this.$el.find('.btn-stop');

      if (enable) {
        $btn.prop('disabled', false);
        $btn.removeAttr('disabled');
      } else {
        $btn.prop('disabled', true);
        $btn.attr('disabled', 'disabled');
      }
    },
    enable_step_over: function(enable) {
      var $btn = this.$el.find('.btn-step-over');

      if (enable) {
        $btn.prop('disabled', false);
        $btn.removeAttr('disabled');
      } else {
        $btn.prop('disabled', true);
        $btn.attr('disabled', 'disabled');
      }
    },
    enable_step_into: function(enable) {
      var $btn = this.$el.find('.btn-step-into');

      if (enable) {
        $btn.prop('disabled', false);
        $btn.removeAttr('disabled');
      } else {
        $btn.prop('disabled', true);
        $btn.attr('disabled', 'disabled');
      }
    },
    enable_continue: function(enable) {
      var $btn = this.$el.find('.btn-continue');

      if (enable) {
        $btn.prop('disabled', false);
        $btn.removeAttr('disabled');
      } else {
        $btn.prop('disabled', true);
        $btn.attr('disabled', 'disabled');
      }
    },
    enable_toggle_breakpoint: function(enable) {
      var $btn = this.$el.find('.btn-toggle-breakpoint');

      if (enable) {
        $btn.prop('disabled', false);
        $btn.removeAttr('disabled');
      } else {
        $btn.prop('disabled', true);
        $btn.attr('disabled', 'disabled');
      }
    },
    enable_clear_all_breakpoints: function(enable) {
      var $btn = this.$el.find('.btn-clear-breakpoint');

      if (enable) {
        $btn.prop('disabled', false);
        $btn.removeAttr('disabled');
      } else {
        $btn.prop('disabled', true);
        $btn.attr('disabled', 'disabled');
      }
    },
    on_stop: function() {
      controller.Stop(pgTools.DirectDebug.trans_id);
    },
    on_clear_all_breakpoint: function() {
      controller.clear_all_breakpoint(pgTools.DirectDebug.trans_id);
    },
    on_toggle_breakpoint: function() {
      controller.toggle_breakpoint(pgTools.DirectDebug.trans_id);
    },
    on_continue: function() {
      controller.Continue(pgTools.DirectDebug.trans_id);
    },
    on_step_over: function() {
      controller.Step_over(pgTools.DirectDebug.trans_id);
    },
    on_step_into: function() {
      controller.Step_into(pgTools.DirectDebug.trans_id);
    },
    keyAction: function (event) {
      let panel_type='';

      panel_type = keyboardShortcuts.processEventDebugger(
        this.$el, event, this.preferences, pgTools.DirectDebug.docker
      );


      if(!_.isNull(panel_type) && !_.isUndefined(panel_type) && panel_type != '') {
        setTimeout(function() {
          pgBrowser.Events.trigger(`pgadmin:debugger:${panel_type}:focus`);
        }, 100);
      }
    },
  });


  /*
    Function is responsible to create the new wcDocker instance for debugger and
    initialize the debugger panel inside the docker instance.
  */
  var DirectDebug = function() {};

  _.extend(DirectDebug.prototype, {
    /* We should get the transaction id from the server during initialization here */
    load: function(trans_id, debug_type, function_name_with_arguments, layout) {
      // We do not want to initialize the module multiple times.
      var self = this;
      _.bindAll(pgTools.DirectDebug, 'messages');

      if (this.initialized)
        return;

      var baseUrl;

      this.initialized = true;
      this.trans_id = trans_id;
      this.debug_type = debug_type;
      this.first_time_indirect_debug = false;
      this.direct_execution_completed = false;
      this.polling_timeout_idle = false;
      this.debug_restarted = false;
      this.is_user_aborted_debugging = false;
      this.is_polling_required = true; // Flag to stop unwanted ajax calls
      this.function_name_with_arguments = function_name_with_arguments;
      this.layout = layout;

      let browser = pgWindow.default.pgAdmin.Browser;
      this.preferences = browser.get_preferences_for_module('debugger');

      this.docker = new wcDocker(
        '#container', {
          allowContextMenu: false,
          allowCollapse: false,
          loadingClass: 'pg-sp-icon',
          themePath: url_for('static', {
            'filename': 'css',
          }),
          theme: 'webcabin.overrides.css',
        });
      this.panels = [];

      // Below code will be executed for indirect debugging
      // indirect debugging - 0  and for direct debugging - 1
      if (trans_id != undefined && !debug_type) {
        // Make ajax call to execute the and start the target for execution
        baseUrl = url_for('debugger.start_listener', {
          'trans_id': trans_id,
        });

        $.ajax({
          url: baseUrl,
          method: 'GET',
        })
          .done(function(res) {
            if (res.data.status) {
              self.intializePanels();
              controller.enable_toolbar_buttons();
              controller.poll_result(trans_id);
            }
          })
          .fail(function(xhr) {
            try {
              var err = JSON.parse(xhr.responseText);
              if (err.success == 0) {
                Alertify.alert(gettext('Debugger Error'), err.errormsg);
              }
            } catch (e) {
              Alertify.alert(
                gettext('Debugger Error'),
                gettext('Error while starting debugging listener.')
              );
            }
          });
      } else if (trans_id != undefined) {
        // Make ajax call to execute the and start the target for execution
        baseUrl = url_for('debugger.start_listener', {
          'trans_id': trans_id,
        });

        $.ajax({
          url: baseUrl,
          method: 'GET',
        })
          .done(function(res) {
            if (res.data.status) {
              self.messages(trans_id);
            }
          })
          .fail(function(xhr) {
            try {
              var err = JSON.parse(xhr.responseText);
              if (err.success == 0) {
                Alertify.alert(gettext('Debugger Error'), err.errormsg);
              }
            } catch (e) {
              Alertify.alert(
                gettext('Debugger Error'),
                gettext('Error while starting debugging listener.')
              );
            }
          });
      } else {
        this.intializePanels();
      }
    },

    // Read the messages of the database server and get the port ID and attach
    // the executer to that port.
    messages: function(trans_id) {
      var self = this;
      // Make ajax call to listen the database message
      var baseUrl = url_for('debugger.messages', {
        'trans_id': trans_id,
      });

      $.ajax({
        url: baseUrl,
        method: 'GET',
      })
        .done(function(res) {
          if (res.data.status === 'Success') {
            self.intializePanels();
            controller.enable_toolbar_buttons();
            // If status is Success then find the port number to attach the executer.
            controller.start_execution(trans_id, res.data.result);
          } else if (res.data.status === 'Busy') {
          // If status is Busy then poll the result by recursive call to the poll function
            self.messages(trans_id);
          } else if (res.data.status === 'NotConnected') {
            Alertify.alert(
              gettext('Not connected to server or connection with the server has been closed.'),
              res.data.result
            );
          }
        })
        .fail(function() {
          Alertify.alert(
            gettext('Debugger Error'),
            gettext('Error while fetching messages information.')
          );
        });

    },

    // Callback function when user click on gutters of codemirror to set/clear the breakpoint
    onBreakPoint: function(cm, m, gutter) {
      var self = this;

      // If breakpoint gutter is clicked and execution is not completed then only set the breakpoint
      if (gutter == 'breakpoints' && !pgTools.DirectDebug.polling_timeout_idle) {
        // We may want to check, if break-point is allowed at this moment or not
        var info = cm.lineInfo(m);

        // If gutterMarker is undefined that means there is no marker defined previously
        // So we need to set the breakpoint command here...
        if (info.gutterMarkers == undefined) {
          controller.set_breakpoint(self.trans_id, m + 1, 1); //set the breakpoint
        } else {
          if (info.gutterMarkers.breakpoints == undefined) {
            controller.set_breakpoint(self.trans_id, m + 1, 1); //set the breakpoint
          } else {
            controller.set_breakpoint(self.trans_id, m + 1, 0); //clear the breakpoint
          }
        }

        // If line folding is defined then gutterMarker will be defined so
        // we need to find out 'breakpoints' information
        var markers = info.gutterMarkers;
        if (markers != undefined && info.gutterMarkers.breakpoints == undefined)
          markers = info.gutterMarkers.breakpoints;

        cm.setGutterMarker(
          m, 'breakpoints', markers ? null : function() {
            var marker = document.createElement('div');

            marker.style.color = '#822';
            marker.innerHTML = '●';

            return marker;
          }());
      }
    },

    buildDefaultLayout: function(docker) {
      let code_editor_panel = docker.addPanel('code', wcDocker.DOCK.TOP);

      let parameters_panel = docker.addPanel('parameters', wcDocker.DOCK.BOTTOM, code_editor_panel);
      docker.addPanel('local_variables',wcDocker.DOCK.STACKED, parameters_panel, {
        tabOrientation: wcDocker.TAB.TOP,
      });
      docker.addPanel('messages', wcDocker.DOCK.STACKED, parameters_panel);
      docker.addPanel('results', wcDocker.DOCK.STACKED, parameters_panel);
      docker.addPanel('stack_pane', wcDocker.DOCK.STACKED, parameters_panel);
    },

    // Create the debugger layout with splitter and display the appropriate data received from server.
    intializePanels: function() {
      var self = this;
      this.registerPanel(
        'code', self.function_name_with_arguments, '100%', '50%',
        function() {

          // Create the parameters panel to display the arguments of the functions
          var parameters = new pgAdmin.Browser.Panel({
            name: 'parameters',
            title: gettext('Parameters'),
            width: '100%',
            height: '100%',
            isCloseable: false,
            isPrivate: true,
            content: '<div id ="parameters" class="parameters" tabindex="0"></div>',
          });

          // Create the Local variables panel to display the local variables of the function.
          var local_variables = new pgAdmin.Browser.Panel({
            name: 'local_variables',
            title: gettext('Local variables'),
            width: '100%',
            height: '100%',
            isCloseable: false,
            isPrivate: true,
            content: '<div id ="local_variables" class="local_variables" tabindex="0"></div>',
          });

          // Create the messages panel to display the message returned from the database server
          var messages = new pgAdmin.Browser.Panel({
            name: 'messages',
            title:
            gettext('Messages'),
            width: '100%',
            height: '100%',
            isCloseable: false,
            isPrivate: true,
            content: '<div role="status" id="messages" class="messages" tabindex="0"></div>',
          });

          // Create the result panel to display the result after debugging the function
          var results = new pgAdmin.Browser.Panel({
            name: 'results',
            title: gettext('Results'),
            width: '100%',
            height: '100%',
            isCloseable: false,
            isPrivate: true,
            content: '<div id="debug_results" class="debug_results" tabindex="0"></div>',
          });

          // Create the stack pane panel to display the debugging stack information.
          var stack_pane = new pgAdmin.Browser.Panel({
            name: 'stack_pane',
            title: gettext('Stack'),
            width: '100%',
            height: '100%',
            isCloseable: false,
            isPrivate: true,
            content: '<div id="stack_pane" class="stack_pane" tabindex="0"></div>',
          });

          // Load all the created panels
          parameters.load(self.docker);
          local_variables.load(self.docker);
          messages.load(self.docker);
          results.load(self.docker);
          stack_pane.load(self.docker);
        });

      // restore the layout if present else fallback to buildDefaultLayout
      pgBrowser.restore_layout(self.docker, self.layout, this.buildDefaultLayout.bind(this));

      self.docker.on(wcDocker.EVENT.LAYOUT_CHANGED, function() {
        pgBrowser.save_current_layout('Debugger/Layout', self.docker);
      });

      self.code_editor_panel = self.docker.findPanels('code')[0];
      self.parameters_panel = self.docker.findPanels('parameters')[0];
      self.local_variables_panel = self.docker.findPanels('local_variables')[0];
      self.messages_panel = self.docker.findPanels('messages')[0];
      self.results_panel = self.docker.findPanels('results')[0];
      self.stack_pane_panel = self.docker.findPanels('stack_pane')[0];

      var editor_pane = $('<div id="stack_editor_pane" ' +
        'class="pg-panel-content info"></div>');
      var code_editor_area = $('<textarea aria-label="Code editor area" id="debugger-editor-textarea">' +
        '</textarea>').appendTo(editor_pane);
      self.code_editor_panel.layout().addItem(editor_pane);

      // To show the line-number and set breakpoint marker details by user.
      self.editor = CodeMirror.fromTextArea(
        code_editor_area.get(0), {
          tabindex: -1,
          lineNumbers: true,
          foldOptions: {
            widget: '\u2026',
          },
          foldGutter: true,
          gutters: [
            'CodeMirror-linenumbers', 'CodeMirror-foldgutter', 'breakpoints',
          ],
          mode: 'text/x-pgsql',
          readOnly: true,
          extraKeys: pgAdmin.Browser.editor_shortcut_keys,
          indentWithTabs: pgAdmin.Browser.editor_options.indent_with_tabs,
          indentUnit: pgAdmin.Browser.editor_options.tabSize,
          tabSize: pgAdmin.Browser.editor_options.tabSize,
          lineWrapping: pgAdmin.Browser.editor_options.wrapCode,
          autoCloseBrackets: pgAdmin.Browser.editor_options.insert_pair_brackets,
          matchBrackets: pgAdmin.Browser.editor_options.brace_matching,
          screenReaderLabel: gettext('Debugger SQL editor'),
        });

      // Useful for keyboard navigation, when user presses escape key we will
      // defocus from the codemirror editor allow user to navigate further
      CodeMirror.on(self.editor, 'keydown', function(cm,event) {
        if(event.keyCode==27){
          document.activeElement.blur();
        }
      });

      pgBrowser.Events.on('pgadmin:debugger:code:focus', ()=>{
        self.editor.focus();
      });

      // On loading the docker, register the callbacks
      var onLoad = function() {
        self.docker.finishLoading(100);
        self.docker.off(wcDocker.EVENT.LOADED);
        // Register the callback when user set/clear the breakpoint on gutter area.
        self.editor.on('gutterClick', self.onBreakPoint.bind(self), self);
        /* Set focus to the debugger container
         * Focus does not work in firefox without tabindex attr
         * so, setting focus to parent of $container which is #container
         */
        if(self.docker.$container){
          self.docker.$container.parent().focus();
        }

        let cacheIntervalId = setInterval(function() {
          try {
            let browser = pgWindow.default.pgAdmin.Browser;
            if(browser.preference_version() > 0) {
              clearInterval(cacheIntervalId);
              self.reflectPreferences();

              /* If debugger is in a new tab, event fired is not available
               * instead, a poller is set up who will check
               */
              var browser_preferences = browser.get_preferences_for_module('browser');
              var open_new_tab = browser_preferences.new_browser_tab_open;
              if (open_new_tab && open_new_tab.includes('debugger')) {
                pgBrowser.bind_beforeunload();
                let pollIntervalId = setInterval(()=>{
                  if(pgWindow.default.pgAdmin) {
                    self.reflectPreferences();
                  }
                  else {
                    clearInterval(pollIntervalId);
                  }
                }, 1000);
              }
            }
          }
          catch(err) {
            clearInterval(cacheIntervalId);
            throw err;
          }
        },0);

      };

      self.docker.startLoading(gettext('Loading...'));
      self.docker.on(wcDocker.EVENT.LOADED, onLoad);

      // Create the toolbar view for debugging the function
      this.toolbarView = new DebuggerToolbarView();

      /* wcDocker focuses on window always, and all our shortcuts are
       * bind to editor-panel. So when we use wcDocker focus, editor-panel
       * loses focus and events don't work.
       */
      $(window).on('keydown', (e)=>{
        if(self.toolbarView.keyAction) {
          self.toolbarView.keyAction(e);
        }
      });

      /* Cache may take time to load for the first time
       * Keep trying till available
       */


      /* Register for preference changed event broadcasted in parent
       * to reload the shorcuts.
       */
      pgWindow.default.pgAdmin.Browser.onPreferencesChange('debugger', function() {
        self.reflectPreferences();
      });

      /* Register to log the activity */
      pgBrowser.register_to_activity_listener(document, ()=>{
        Alertify.alert(gettext('Timeout'), gettext('Your session has timed out due to inactivity. Please close the window and login again.'));
      });

      controller.poll_result = pgBrowser.override_activity_event_decorator(controller.poll_result).bind(controller);
      controller.poll_end_execution_result = pgBrowser.override_activity_event_decorator(controller.poll_end_execution_result).bind(controller);
    },
    reflectPreferences: function() {
      let self = this,
        browser = pgWindow.default.pgAdmin.Browser;
      self.preferences = browser.get_preferences_for_module('debugger');
      self.toolbarView.preferences = self.preferences;

      /* Update the shortcuts of the buttons */
      self.toolbarView.$el.find('#btn-step-into')
        .attr('title', keyboardShortcuts.shortcut_accesskey_title(gettext('Step into'),self.preferences.btn_step_into))
        .attr('aria-label', keyboardShortcuts.shortcut_accesskey_title(gettext('Step into'),self.preferences.btn_step_into))
        .attr('accesskey', keyboardShortcuts.shortcut_key(self.preferences.btn_step_into));

      self.toolbarView.$el.find('#btn-step-over')
        .attr('title', keyboardShortcuts.shortcut_accesskey_title(gettext('Step over'),self.preferences.btn_step_over))
        .attr('aria-label', keyboardShortcuts.shortcut_accesskey_title(gettext('Step over'),self.preferences.btn_step_over))
        .attr('accesskey', keyboardShortcuts.shortcut_key(self.preferences.btn_step_over));

      self.toolbarView.$el.find('#btn-continue')
        .attr('title', keyboardShortcuts.shortcut_accesskey_title(gettext('Continue/Start'),self.preferences.btn_start))
        .attr('aria-label', keyboardShortcuts.shortcut_accesskey_title(gettext('Continue/Start'),self.preferences.btn_start))
        .attr('accesskey', keyboardShortcuts.shortcut_key(self.preferences.btn_start));

      self.toolbarView.$el.find('#btn-toggle-breakpoint')
        .attr('title', keyboardShortcuts.shortcut_accesskey_title(gettext('Toggle breakpoint'),self.preferences.btn_toggle_breakpoint))
        .attr('aria-label', keyboardShortcuts.shortcut_accesskey_title(gettext('Toggle breakpoint'),self.preferences.btn_toggle_breakpoint))
        .attr('accesskey', keyboardShortcuts.shortcut_key(self.preferences.btn_toggle_breakpoint));

      self.toolbarView.$el.find('#btn-clear-breakpoint')
        .attr('title', keyboardShortcuts.shortcut_accesskey_title(gettext('Clear all breakpoints'),self.preferences.btn_clear_breakpoints))
        .attr('aria-label', keyboardShortcuts.shortcut_accesskey_title(gettext('Clear all breakpoints'),self.preferences.btn_clear_breakpoints))
        .attr('accesskey', keyboardShortcuts.shortcut_key(self.preferences.btn_clear_breakpoints));

      self.toolbarView.$el.find('#btn-stop')
        .attr('title', keyboardShortcuts.shortcut_accesskey_title(gettext('Stop'),self.preferences.btn_stop))
        .attr('aria-label', keyboardShortcuts.shortcut_accesskey_title(gettext('Stop'),self.preferences.btn_stop))
        .attr('accesskey', keyboardShortcuts.shortcut_key(self.preferences.btn_stop));
    },
    // Register the panel with new debugger docker instance.
    registerPanel: function(name, title, width, height, onInit) {
      var self = this;

      this.docker.registerPanelType(name, {
        title: title,
        isPrivate: true,
        onCreate: function(panel) {
          self.panels[name] = panel;
          panel.initSize(width, height);
          if (!title)
            panel.title(false);
          else
            panel.title(title);
          panel.closeable(false);
          panel.layout().addItem(
            $('<div tabindex="0">', {
              'class': 'pg-debugger-panel',
            })
          );
          if (onInit) {
            onInit.apply(self, [panel]);
          }
        },
      });
    },
  });

  pgTools.DirectDebug = new DirectDebug();
  pgTools.DirectDebug['jquery'] = $;

  return pgTools.DirectDebug;
});
