define(
  ['jquery', 'underscore', 'underscore.string', 'alertify', 'pgadmin','pgadmin.browser',
   'backbone', 'backgrid', 'codemirror', 'backform','pgadmin.tools.debugger.ui',
  'wcdocker', 'pgadmin.backform', 'pgadmin.backgrid', 'codemirror/addon/selection/active-line',
  'codemirror/addon/fold/foldgutter', 'codemirror/addon/fold/foldcode', 'codemirror/addon/fold/pgadmin-sqlfoldcode'],
  function($, _, S, Alertify, pgAdmin, pgBrowser, Backbone, Backgrid, CodeMirror, Backform, debug_function_again) {

  if (pgAdmin.Browser.tree != null) {
    pgAdmin = pgAdmin || window.pgAdmin || {};
  }

  var pgTools = pgAdmin.Tools = pgAdmin.Tools || {};

  if (pgTools.DirectDebug)
    return pgTools.DirectDebug;

  var controller = new (function() {});

  _.extend(
    controller, Backbone.Events, {
      enable: function(btn, enable) {
        // trigger the event and change the button view to enable/disable the buttons for debugging
        this.trigger('pgDebugger:button:state:' + btn, enable);
      },

      /*
        Function to set the breakpoint and send the line no. which is set to server
        trans_id :- Unique Transaction ID, line_no - line no. to set the breakpoint, set_type = 0 - clear , 1 - set
      */
      set_breakpoint: function(trans_id, line_no, set_type) {
        var self = this;

        // Make ajax call to set/clear the break point by user
        var baseUrl = "{{ url_for('debugger.index') }}" + "set_breakpoint/" + trans_id + "/" + line_no + "/" + set_type;

        $.ajax({
          url: baseUrl,
          method: 'GET',
          success: function(res) {
            if (res.data.status) {
              // Breakpoint has been set by the user
            }
          },
          error: function(e) {
            Alertify.alert(
              'Debugger: Breakpoint set execution error'
            );
          }
        });
      },

      // Function to get the latest breakpoint information and update the gutters of codemirror
      UpdateBreakpoint: function(trans_id) {
        var self = this;

        var br_list = self.GetBreakpointInformation(trans_id);

        // If there is no break point to clear then we should return from here.
        if ((br_list.length == 1) && (br_list[0].linenumber == -1))
          return;

        var breakpoint_list = new Array();

        for (i = 0; i < br_list.length; i++) {
          if (br_list[i].linenumber != -1) {
            breakpoint_list.push(br_list[i].linenumber)
          }
        }

        for (i = 0;i< breakpoint_list.length;i++) {
          var info = pgTools.DirectDebug.editor.lineInfo((breakpoint_list[i] - 1));

          if (info.gutterMarkers != undefined) {
            pgTools.DirectDebug.editor.setGutterMarker((breakpoint_list[i] - 1), "breakpoints", null);
          }
          else {
            pgTools.DirectDebug.editor.setGutterMarker((breakpoint_list[i] - 1), "breakpoints", function() {
            var marker = document.createElement("div");
            marker.style.color = "#822";
            marker.innerHTML = "●";
            return marker;
            }());
          }
        }
      },

      // Function to get the breakpoint information from the server
      GetBreakpointInformation: function(trans_id) {
        var self = this;
        var result = '';

        // Make ajax call to listen the database message
        var baseUrl = "{{ url_for('debugger.index') }}" + "execute_query/" + trans_id + "/" + "get_breakpoints";

        $.ajax({
          url: baseUrl,
          method: 'GET',
          async: false,
          success: function(res) {
            if (res.data.status === 'Success') {
              result = res.data.result;
            }
            else if (res.data.status === 'NotConnected') {
              Alertify.alert(
                'Debugger: Error fetching breakpoint information'
              );
            }
          },
          error: function(e) {
            Alertify.alert(
              'Debugger: Error fetching breakpoint information'
            );
          }
        });

        return result;
      },

      // Function to start the executer and execute the user requested option for debugging
      start_execution: function(trans_id, port_num) {
        var self = this;
        // Make ajax call to listen the database message
        var baseUrl = "{{ url_for('debugger.index') }}" + "start_execution/" + trans_id + "/" + port_num;

        $.ajax({
          url: baseUrl,
          method: 'GET',
          success: function(res) {
            if (res.data.status === 'Success') {
              // If status is Success then find the port number to attach the executer.
              self.execute_query(trans_id);
            }
            else if (res.data.status === 'NotConnected') {
              Alertify.alert(
                'Debugger: Start execution error'
              );
            }
          },
          error: function(e) {
            Alertify.alert(
              'Debugger: Start execution error'
            );
          }
        });
      },

      // Execute the query and get the first functions debug information from the server
      execute_query: function(trans_id) {
        var self = this;
        // Make ajax call to listen the database message
        var baseUrl = "{{ url_for('debugger.index') }}" + "execute_query/" + trans_id + "/" + "wait_for_breakpoint";

        $.ajax({
          url: baseUrl,
          method: 'GET',
          success: function(res) {
            if (res.data.status === 'Success') {
              // set the return code to the code editor text area
              if (res.data.result[0].src != null && res.data.result[0].linenumber != null) {
                pgTools.DirectDebug.editor.setValue(res.data.result[0].src);
                active_line_no = self.active_line_no = (res.data.result[0].linenumber - 2);
                pgTools.DirectDebug.editor.addLineClass((res.data.result[0].linenumber - 2), 'wrap', 'CodeMirror-activeline-background');
              }

              // Call function to create and update local variables ....
              self.GetStackInformation(trans_id);
            }
            else if (res.data.status === 'NotConnected') {
              Alertify.alert(
                'Debugger: Execution error'
              );
            }
          },
          error: function(e) {
            Alertify.alert(
              'Debugger: Execution error'
            );
          }
        });
      },

      // Get the local variable information of the functions and update the grid
      GetLocalVariables: function(trans_id) {
        var self = this;

        // Make ajax call to listen the database message
        var baseUrl = "{{ url_for('debugger.index') }}" + "execute_query/" + trans_id + "/" + "get_variables";

        $.ajax({
          url: baseUrl,
          method: 'GET',
          success: function(res) {
            if (res.data.status === 'Success') {
              // Call function to create and update local variables
              self.AddLocalVariables(res.data.result);
              self.AddParameters(res.data.result);
            }
            else if (res.data.status === 'NotConnected') {
              Alertify.alert(
                'Debugger: Error fetching variable information'
              );
            }
          },
          error: function(e) {
            Alertify.alert(
              'Debugger: Error fetching variable information'
            );
          }
        });
      },

      // Get the stack information of the functions and update the grid
      GetStackInformation: function(trans_id) {
        var self = this;

        // Make ajax call to listen the database message
        var baseUrl = "{{ url_for('debugger.index') }}" + "execute_query/" + trans_id + "/" + "get_stack_info";

        $.ajax({
          url: baseUrl,
          method: 'GET',
          success: function(res) {
            if (res.data.status === 'Success') {
              // Call function to create and update stack information
              self.AddStackInformation(res.data.result);
              self.GetLocalVariables(pgTools.DirectDebug.trans_id);
            }
            else if (res.data.status === 'NotConnected') {
              Alertify.alert(
                'Debugger: Error fetching stack information'
              );
            }
          },
          error: function(e) {
            Alertify.alert(
              'Debugger: Error fetching stack information'
            );
          }
        });
      },

      /*
        poll the actual result after user has executed the "continue", "step-into", "step-over" actions and get the
        other updated information from the server.
      */
      poll_result: function(trans_id) {
      var self = this;
      // Make ajax call to listen the database message
      var baseUrl = "{{ url_for('debugger.index') }}" + "poll_result/" + trans_id;

      /*
        During the execution we should poll the result in minimum seconds but once the execution is completed
        and wait for the another debugging session then we should decrease the polling frequency.
      */
      if (pgTools.DirectDebug.polling_timeout_idle) {
        // poll the result after 1 second
        var  poll_timeout = 1000;
      }
      else {
        // poll the result after 200 ms
        var  poll_timeout = 200;
      }

      setTimeout(
        function() {
        $.ajax({
          url: baseUrl,
          method: 'GET',
          beforeSend: function(jqXHR, settings) {
            // set cursor to progress before every poll.
            $('.debugger-container').addClass('show_progress');
          },
          success: function(res) {
            if (res.data.status === 'Success') {
              // If no result then poll again to wait for results.
              if (res.data.result == null || res.data.result.length == 0) {
                self.poll_result(trans_id);
              }
              else {
                if (res.data.result[0].src != undefined || res.data.result[0].src != null) {
                pgTools.DirectDebug.polling_timeout_idle = false;
                pgTools.DirectDebug.docker.finishLoading(50);
                pgTools.DirectDebug.editor.setValue(res.data.result[0].src);
                self.UpdateBreakpoint(trans_id);
                pgTools.DirectDebug.editor.removeLineClass(self.active_line_no, 'wrap', 'CodeMirror-activeline-background');
                pgTools.DirectDebug.editor.addLineClass((res.data.result[0].linenumber - 2), 'wrap', 'CodeMirror-activeline-background');
                self.active_line_no = (res.data.result[0].linenumber - 2);

                // Update the stack, local variables and parameters information
                self.GetStackInformation(trans_id);

                }
                else if (!pgTools.DirectDebug.debug_type && !pgTools.DirectDebug.first_time_indirect_debug) {
                  pgTools.DirectDebug.docker.finishLoading(50);
                  if (self.active_line_no != undefined) {
                    pgTools.DirectDebug.editor.removeLineClass(self.active_line_no, 'wrap', 'CodeMirror-activeline-background');
                  }
                  self.clear_all_breakpoint(trans_id);
                  self.execute_query(trans_id);
                  pgTools.DirectDebug.first_time_indirect_debug = true;
                  pgTools.DirectDebug.polling_timeout_idle = false;
                }
                else {
                  pgTools.DirectDebug.polling_timeout_idle = false;
                  pgTools.DirectDebug.docker.finishLoading(50);
                  // If the source is really changed then only update the breakpoint information
                  if (res.data.result[0].src != pgTools.DirectDebug.editor.getValue()) {
                    pgTools.DirectDebug.editor.setValue(res.data.result[0].src);
                    self.UpdateBreakpoint(trans_id);
                  }

                  pgTools.DirectDebug.editor.removeLineClass(self.active_line_no, 'wrap', 'CodeMirror-activeline-background');
                  pgTools.DirectDebug.editor.addLineClass((res.data.result[0].linenumber - 2), 'wrap', 'CodeMirror-activeline-background');
                  self.active_line_no = (res.data.result[0].linenumber - 2);

                  // Update the stack, local variables and parameters information
                  self.GetStackInformation(trans_id);
                }

                // remove progress cursor
                $('.debugger-container').removeClass('show_progress');
                // Enable all the buttons as we got the results
                self.enable('stop', true);
                self.enable('step_over', true);
                self.enable('step_into', true);
                self.enable('continue', true);
                self.enable('toggle_breakpoint', true);
                self.enable('clear_all_breakpoints', true);
              }
            }
            else if (res.data.status === 'Busy') {
              pgTools.DirectDebug.polling_timeout_idle = true;
              // If status is Busy then poll the result by recursive call to the poll function
              if (!pgTools.DirectDebug.debug_type) {
                pgTools.DirectDebug.docker.startLoading('{{ _('Waiting for another session to invoke the target...') }}');
                // As we are waiting for another session to invoke the target so disable all the buttons
                self.enable('stop', false);
                self.enable('step_over', false);
                self.enable('step_into', false);
                self.enable('continue', false);
                self.enable('toggle_breakpoint', false);
                self.enable('clear_all_breakpoints', false);
                pgTools.DirectDebug.first_time_indirect_debug = false;
                self.poll_result(trans_id);
              }
              else {
                self.poll_result(trans_id);
              }
            }
            else if (res.data.status === 'NotConnected') {
              Alertify.alert(
                'Debugger Poll Result Error'
              );
            }
          },
          error: function(e) {
            Alertify.alert(
              'Debugger Poll Result Error'
            );
          }
        });
      }, poll_timeout );

    },

    /*
      For the direct debugging, we need to check weather the functions execution is completed or not. After completion
      of the debugging, we will stop polling the result  until new execution starts.
    */
    poll_end_execution_result: function(trans_id) {
      var self = this;
      //return;
      // Make ajax call to listen the database message
      var baseUrl = "{{ url_for('debugger.index') }}" + "poll_end_execution_result/" + trans_id;

      /*
        During the execution we should poll the result in minimum seconds but once the execution is completed
        and wait for the another debugging session then we should decrease the polling frequency.
      */
      if (pgTools.DirectDebug.polling_timeout_idle) {
        // poll the result to check that execution is completed or not after 1200 ms
        var  poll_end_timeout = 1200;
      }
      else {
        // poll the result to check that execution is completed or not after 350 ms
        var  poll_end_timeout = 250;
      }

      setTimeout(
        function() {
          $.ajax({
          url: baseUrl,
          method: 'GET',
          success: function(res) {
            if (res.data.status === 'Success') {
              if(res.data.result == undefined ) {
                /*
                 "result" is undefined only in case of EDB procedure. As Once the EDB procedure execution is completed
                 then we are not getting any result so we need ignore the result.
                */
                pgTools.DirectDebug.editor.removeLineClass(self.active_line_no, 'wrap', 'CodeMirror-activeline-background');
                pgTools.DirectDebug.direct_execution_completed = true;
                pgTools.DirectDebug.polling_timeout_idle = true;

                //Set the alertify message to inform the user that execution is completed.
                Alertify.notify(
                  res.info,
                  'success',
                  3,
                  function() { }
                );

                // Update the message tab of the debugger
                pgTools.DirectDebug.dbmsMessages.$elem.text(res.data.status_message);

                // Execution completed so disable the buttons other than "Continue/Start" button because user can still
                // start the same execution again.
                self.enable('stop', false);
                self.enable('step_over', false);
                self.enable('step_into', false);
                self.enable('toggle_breakpoint', false);
                self.enable('clear_all_breakpoints', false);
              }
              else {
                // Call function to create and update local variables ....
                if (res.data.result != null) {
                  pgTools.DirectDebug.editor.removeLineClass(self.active_line_no, 'wrap', 'CodeMirror-activeline-background');
                  self.AddResults(res.data.col_info, res.data.result);
                  pgTools.DirectDebug.results_panel.focus();
                  pgTools.DirectDebug.direct_execution_completed = true;
                  pgTools.DirectDebug.polling_timeout_idle = true;

                  //Set the alertify message to inform the user that execution is completed.
                  Alertify.notify(
                    res.info,
                    'success',
                    3,
                    function() { }
                  );

                  // Update the message tab of the debugger
                  pgTools.DirectDebug.messages_panel.$container.find('.messages').text(res.data.status_message);

                  // Execution completed so disable the buttons other than "Continue/Start" button because user can still
                  // start the same execution again.
                  self.enable('stop', false);
                  self.enable('step_over', false);
                  self.enable('step_into', false);
                  self.enable('toggle_breakpoint', false);
                  self.enable('clear_all_breakpoints', false);
                }
              }
            }
            else if (res.data.status === 'Busy') {
              // If status is Busy then poll the result by recursive call to the poll function
              //self.poll_end_execution_result(trans_id);
            }
            else if (res.data.status === 'NotConnected') {
              Alertify.alert(
                'Debugger poll end execution error',
                res.data.result
              );
            }
            else if (res.data.status === 'ERROR') {
              pgTools.DirectDebug.direct_execution_completed = true;
              pgTools.DirectDebug.editor.removeLineClass(self.active_line_no, 'wrap', 'CodeMirror-activeline-background');

              //Set the alertify message to inform the user that execution is completed with error.
              Alertify.notify(
                res.info,
                'error',
                3,
                function() { }
              );

              pgTools.DirectDebug.messages_panel.$container.find('.messages').text(res.data.status_message);
              pgTools.DirectDebug.messages_panel.focus();

              // Execution completed so disable the buttons other than "Continue/Start" button because user can still
              // start the same execution again.
              self.enable('stop', false);
              self.enable('step_over', false);
              self.enable('step_into', false);
              self.enable('toggle_breakpoint', false);
              self.enable('clear_all_breakpoints', false);
            }
          },
          error: function(e) {
            Alertify.alert(
              'Debugger poll end execution error',
              e.responseJSON.errormsg
            );
          }
        });
      }, poll_end_timeout);

    },

    Restart: function(trans_id) {

      var baseUrl = "{{ url_for('debugger.index') }}" + "restart/" + trans_id;

      $.ajax({
        url: baseUrl,
        success: function(res) {
          // Restart the same function debugging with previous arguments
          var restart_dbg = res.data.restart_debug ? 1 : 0;

          /*
           Need to check if restart debugging really require to open the input dialog ?
           If yes then we will get the previous arguments from database and populate the input dialog
           If no then we should directly start the listener.
          */
          if (res.data.result.require_input) {
            var res_val = debug_function_again(res.data.result, restart_dbg);
          }
          else {
            // Debugging of void function is started again so we need to start the listener again
            var baseUrl = "{{ url_for('debugger.index') }}" + "start_listener/" + trans_id;

            $.ajax({
              url: baseUrl,
              method: 'GET',
              success: function(res) {
              },
              error: function(e) {
                Alertify.alert(
                  'Debugger listener starting error',
                  e.responseJSON.errormsg
                );
              }
            });
          }
        },
        error: function(xhr, status, error) {
          try {
            var err = $.parseJSON(xhr.responseText);
            if (err.success == 0) {
              Alertify.alert(err.errormsg);
            }
          } catch (e) {}
        }
      });
    },

    // Continue the execution until the next breakpoint
    Continue: function(trans_id) {
      var self = this;

      //Check first if previous execution was completed or not
      if (pgTools.DirectDebug.direct_execution_completed &&
          pgTools.DirectDebug.direct_execution_completed == pgTools.DirectDebug.polling_timeout_idle) {
        self.Restart(trans_id);
      }
      else {
        // Make ajax call to listen the database message
        var baseUrl = "{{ url_for('debugger.index') }}" + "execute_query/" + trans_id + "/" + "continue";

        $.ajax({
          url: baseUrl,
          method: 'GET',
          success: function(res) {
            if (res.data.status) {
              self.poll_result(trans_id);
              if (pgTools.DirectDebug.debug_type) {
                self.poll_end_execution_result(trans_id);
              }
            }
            else {
              Alertify.alert(
                'Debugger: Continue execution error'
              );
            }
          },
          error: function(e) {
            Alertify.alert(
              'Debugger: Continue execution error'
            );
          }
        });
      }
    },

      Step_over: function(trans_id) {
        var self = this;

        // Make ajax call to listen the database message
        var baseUrl = "{{ url_for('debugger.index') }}" + "execute_query/" + trans_id + "/" + "step_over";

        $.ajax({
          url: baseUrl,
          method: 'GET',
          success: function(res) {
            if (res.data.status) {
              self.poll_result(trans_id);
              if (pgTools.DirectDebug.debug_type) {
                self.poll_end_execution_result(trans_id);
              }
            }
            else {
              Alertify.alert(
                'Debugger: Step over execution error'
              );
            }
          },
          error: function(e) {
            Alertify.alert(
              'Debugger: Step over execution error'
            );
          }
        });
      },

      Step_into: function(trans_id) {
        var self = this;

        // Make ajax call to listen the database message
        var baseUrl = "{{ url_for('debugger.index') }}" + "execute_query/" + trans_id + "/" + "step_into";

        $.ajax({
          url: baseUrl,
          method: 'GET',
          success: function(res) {
            if (res.data.status) {
              self.poll_result(trans_id);
              if (pgTools.DirectDebug.debug_type) {
                self.poll_end_execution_result(trans_id);
              }
            }
            else {
              Alertify.alert(
                'Debugger: Step into execution error'
              );
            }
          },
          error: function(e) {
            Alertify.alert(
              'Debugger: Step into execution error'
            );
          }
        });
      },

      Stop: function(trans_id) {
        var self = this;

        // Make ajax call to listen the database message
        var baseUrl = "{{ url_for('debugger.index') }}" + "execute_query/" + trans_id + "/" + "abort_target";

        $.ajax({
          url: baseUrl,
          method: 'GET',
          success: function(res) {
            if (res.data.status) {
              // Call function to create and update local variables ....
              pgTools.DirectDebug.editor.removeLineClass(self.active_line_no, 'wrap', 'CodeMirror-activeline-background');
              pgTools.DirectDebug.direct_execution_completed = true;

              //Set the alertify message to inform the user that execution is completed.
              Alertify.notify(
                res.info,
                'success',
                3,
                function() { }
              );

              //Disable the buttons other than continue button. If user wants to again then it should allow to debug again...
              self.enable('stop', false);
              self.enable('step_over', false);
              self.enable('step_into', false);
              self.enable('continue', false);
              self.enable('toggle_breakpoint', false);
              self.enable('clear_all_breakpoints', false);
            }
            else if (res.data.status === 'NotConnected') {
              Alertify.alert(
                'Debugger: Stop execution error'
              );
            }
          },
          error: function(e) {
            Alertify.alert(
              'Debugger: Stop execution error'
            );
          }
        });
      },

      toggle_breakpoint: function(trans_id) {
        var self = this;

        var info = pgTools.DirectDebug.editor.lineInfo(self.active_line_no);
        var baseUrl = '';

        // If gutterMarker is undefined that means there is no marker defined previously
        // So we need to set the breakpoint command here...
        if (info.gutterMarkers == undefined) {
            baseUrl = "{{ url_for('debugger.index') }}" + "set_breakpoint/" + trans_id + "/" + self.active_line_no + "/" + "1";
        }
        else {
            baseUrl = "{{ url_for('debugger.index') }}" + "set_breakpoint/" + trans_id + "/" + self.active_line_no + "/" + "0";
        }

        $.ajax({
          url: baseUrl,
          method: 'GET',
          success: function(res) {
            if (res.data.status) {
              // Call function to create and update local variables ....
              var info = pgTools.DirectDebug.editor.lineInfo(self.active_line_no);

              if (info.gutterMarkers != undefined) {
                pgTools.DirectDebug.editor.setGutterMarker(self.active_line_no, "breakpoints", null);
              }
              else {
                pgTools.DirectDebug.editor.setGutterMarker(self.active_line_no, "breakpoints", function() {
                    var marker = document.createElement("div");
                    marker.style.color = "#822";
                    marker.innerHTML = "●";
                    return marker;
                }());
              }
            }
            else if (res.data.status === 'NotConnected') {
              Alertify.alert(
                'Debugger: Toggle breakpoint execution error'
              );
            }
          },
          error: function(e) {
            Alertify.alert(
              'Debugger: Toggle breakpoint execution error'
            );
          }
        });
      },

      clear_all_breakpoint: function(trans_id) {
        var self = this;

        var br_list = self.GetBreakpointInformation(trans_id);

        // If there is no break point to clear then we should return from here.
        if ((br_list.length == 1) && (br_list[0].linenumber == -1))
          return;

        var breakpoint_list = new Array();

        for (i = 0; i < br_list.length; i++) {
          if (br_list[i].linenumber != -1) {
            breakpoint_list.push(br_list[i].linenumber)
          }
        }

        // Make ajax call to listen the database message
        var baseUrl = "{{ url_for('debugger.index') }}" + "clear_all_breakpoint/" + trans_id;

        $.ajax({
          url: baseUrl,
          method: 'POST',
          data: { 'breakpoint_list': breakpoint_list.join() },
          success: function(res) {
            if (res.data.status) {
              for (i = 0;i< breakpoint_list.length;i++) {
                var info = pgTools.DirectDebug.editor.lineInfo((breakpoint_list[i] - 1));

                if (info) {
                  if (info.gutterMarkers != undefined) {
                    pgTools.DirectDebug.editor.setGutterMarker((breakpoint_list[i] - 1), "breakpoints", null);
                  }
                }
              }
            }
          },
          error: function(e) {
            Alertify.alert(
              'Debugger: Clear all breakpoint execution error'
            );
          }
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
            name: undefined,
            value: undefined,
            line_no: undefined
          }
        });

        // Collection which contains the model for function informations.
        var StackCollection = Backbone.Collection.extend({
          model: DebuggerStackModel
        });

        stackGridCols = [
          {name: 'name', label:'Name', type:'text', editable: false, cell:'string'},
          {name: 'value', label:'Value', type:'text', editable: false, cell:'string'},
          {name: 'line_no', label:'Line No.', type:'text', editable: false, cell:'string'}
        ];

        var my_obj = [];
        if (result.length != 0)
        {
          for (i = 0; i < result.length; i++) {
            my_obj.push({ "name": result[i].targetname, "value": result[i].args, "line_no": result[i].linenumber });
          }
        }

        var stackColl = this.stackColl = new StackCollection(my_obj);
        this.stackColl.on('backgrid:row:selected', self.select_frame, self);

        // Initialize a new Grid instance
        var stack_grid = this.stack_grid = new Backgrid.Grid({
          columns: stackGridCols,
          row: Backgrid.Row.extend({
            highlightColor: "#D9EDF7",
            disabledColor: "#F1F1F1",
            events: {
              click: "rowClick"
            },
            rowClick: function(e) {
              //Find which row is selected and depending on that send the frame id
              for (i = 0; i < this.model.collection.length; i++) {
                if (this.model.collection.models[i].get('name') == this.model.get('name')) {
                  self.frame_id_ = i;
                  break;
                }
              }
              this.model.trigger('backgrid:row:selected', this);
              self.stack_grid.$el.find("td").css("background-color", this.disabledColor);
              this.$el.find("td").css("background-color", this.highlightColor);
            }
          }),
          collection: stackColl,
          className: "backgrid table-bordered"
        });

        stack_grid.render();

        // Render the stack grid into stack panel
        pgTools.DirectDebug.stack_pane_panel.$container.find('.stack_pane').append(stack_grid.el);

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
            name: undefined
          }
        });

        // Collection which contains the model for function informations.
        var ResultsCollection = Backbone.Collection.extend({
          model: DebuggerResultsModel
        });

        var resultGridCols = [];
        if(_.size(columns)) {
          _.each(columns, function(c) {
            var column = {
                            type:'text',
                            editable: false,
                            cell:'string'
                         };
            column['name'] = column['label'] = c.name;
            resultGridCols.push(column);
          });
        }

        // Initialize a new Grid instance
        var result_grid = this.result_grid = new Backgrid.Grid({
          columns: resultGridCols,
          collection: new ResultsCollection(result),
          className: "backgrid table-bordered"
        });

        result_grid.render();

        // Render the result grid into result panel
        pgTools.DirectDebug.results_panel.$container.find('.debug_results').append(result_grid.el);

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
            value: undefined
          }
        });

        // Collection which contains the model for function informations.
        var VariablesCollection = Backbone.Collection.extend({
          model: DebuggerVariablesModel
        });

        gridCols = [
          {name: 'name', label:'Name', type:'text', editable: false, cell:'string'},
          {name: 'type', label:'Type', type: 'text', editable: false, cell:'string'},
          {name: 'value', label:'Value', type: 'text', cell: 'string'}
        ];

        var my_obj = [];
        if (result.length != 0)
        {
          for (i = 0; i < result.length; i++) {
            if (result[i].varclass == 'L') {
              my_obj.push({ "name": result[i].name, "type": result[i].dtype, "value": result[i].value});
            }
          }
        }

        // Initialize a new Grid instance
        var variable_grid = this.variable_grid = new Backgrid.Grid({
          columns: gridCols,
          collection: new VariablesCollection(my_obj),
          className: "backgrid table-bordered"
        });

        variable_grid.render();

        // Render the variables grid into local variables panel
        pgTools.DirectDebug.local_variables_panel.$container.find('.local_variables').append(variable_grid.el);

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
            value: undefined
          }
        });

        // Collection which contains the model for function informations.
        var ParametersCollection = self.ParametersCollection = Backbone.Collection.extend({
          model: DebuggerParametersModel
        });

        self.ParametersCollection.prototype.on('change', self.deposit_parameter_value, self);

        paramGridCols = [
          {name: 'name', label:'Name', type:'text', editable: false, cell:'string'},
          {name: 'type', label:'Type', type: 'text', editable: false, cell:'string'},
          {name: 'value', label:'Value', type: 'text', cell: 'string'}
        ];

        var param_obj = [];
        if (result.length != 0)
        {
          for (i = 0; i < result.length; i++) {
            if (result[i].varclass == 'A') {
              param_obj.push({ "name": result[i].name, "type": result[i].dtype, "value": result[i].value});
            }
          }
        }

        // Initialize a new Grid instance
        var param_grid = this.param_grid = new Backgrid.Grid({
          columns: paramGridCols,
          collection: new ParametersCollection(param_obj),
          className: "backgrid table-bordered"
        });

        param_grid.render();

        // Render the parameters grid into parameter panel
        pgTools.DirectDebug.parameters_panel.$container.find('.parameters').append(param_grid.el);
      },

      deposit_parameter_value: function(model) {
        var self = this;

        // variable name and value list that is changed by user
        var name_value_list = [];

        name_value_list.push({ 'name': model.get('name'),'type': model.get('type'), 'value': model.get('value')});

        // Make ajax call to listen the database message
        var baseUrl = "{{ url_for('debugger.index') }}" + "deposit_value/" + pgTools.DirectDebug.trans_id;

        $.ajax({
          url: baseUrl,
          method: 'POST',
          data:{'data':JSON.stringify(name_value_list)},
          success: function(res) {
            if (res.data.status) {
              // Get the updated variables value
              self.GetLocalVariables(pgTools.DirectDebug.trans_id);
              // Show the message to the user that deposit value is success or failure
              Alertify.notify(
                res.data.info,
                res.data.result ? 'success': 'error',
                3,
                function() { }
              );
            }
          },
          error: function(e) {
            Alertify.alert(
              'Debugger: Deposit value execution error',
              e.responseJSON.errormsg
            );
          }
        });
      },

      select_frame: function(model, selected) {
        var self = this;

        // Make ajax call to listen the database message
        var baseUrl = "{{ url_for('debugger.index') }}" + "select_frame/" + pgTools.DirectDebug.trans_id + "/" + self.frame_id_;

        $.ajax({
          url: baseUrl,
          method: 'GET',
          success: function(res) {
            if (res.data.status) {
              pgTools.DirectDebug.editor.setValue(res.data.result[0].src);
              self.UpdateBreakpoint(pgTools.DirectDebug.trans_id);
              //active_line_no = self.active_line_no = (res.data.result[0].linenumber - 2);
              pgTools.DirectDebug.editor.addLineClass((res.data.result[0].linenumber - 2), 'wrap', 'CodeMirror-activeline-background');

              // Call function to create and update local variables ....
              self.GetLocalVariables(pgTools.DirectDebug.trans_id);
            }
          },
          error: function(e) {
            Alertify.alert(
              'Debugger: Select frame execution error',
              e.responseJSON.errormsg
            );
          }
        });
      },
    }
  )

  /*
    Debugger tool var view to create the button toolbar and listen to the button click event and inform the
    controller about the click and controller will take the action for the specified button click.
  */
  var DebuggerToolbarView = Backbone.View.extend({
    el: '#btn-toolbar',
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
        'click .btn-step-into': 'on_step_into'
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
  });


  /*
    Function is responsible to create the new wcDocker instance for debugger and initialize the debugger panel inside
    the docker instance.
  */
  var DirectDebug = function() {};

  _.extend(DirectDebug.prototype, {
    init: function(trans_id, debug_type) { /* We should get the transaction id from the server during initialization here */
      // We do not want to initialize the module multiple times.

      var self = this;
      _.bindAll(pgTools.DirectDebug, 'messages');

      if (this.initialized)
          return;

      this.initialized = true;
      this.trans_id = trans_id;
      this.debug_type = debug_type;
      this.first_time_indirect_debug = false;
      this.direct_execution_completed = false;
      this.polling_timeout_idle = false;

      var docker = this.docker = new wcDocker(
          '#container', {
          allowContextMenu: false,
          allowCollapse: false,
          themePath: '{{ url_for('static', filename='css/wcDocker/Themes') }}',
          theme: 'pgadmin'
        });

      this.panels = [];

      // Below code will be executed for indirect debugging
      // indirect debugging - 0  and for direct debugging - 1
      if (trans_id != undefined && !debug_type) {
        // Make ajax call to execute the and start the target for execution
        var baseUrl = "{{ url_for('debugger.index') }}" + "start_listener/" + trans_id;

        $.ajax({
          url: baseUrl,
          method: 'GET',
          success: function(res) {
            if (res.data.status) {
              self.intializePanels();
              controller.poll_result(trans_id);
            }
          },
          error: function(e) {
            Alertify.alert(
              'Debugger listener starting error',
              e.responseJSON.errormsg
            );
          }
        });
      }
      else if (trans_id != undefined && debug_type)
      {
        // Make ajax call to execute the and start the target for execution
        var baseUrl = "{{ url_for('debugger.index') }}" + "start_listener/" + trans_id;

        $.ajax({
          url: baseUrl,
          method: 'GET',
          success: function(res) {
            if (res.data.status) {
              self.messages(trans_id);
            }
          },
          error: function(e) {
            Alertify.alert(
              'Debugger listener starting error',
              e.responseJSON.errormsg
            );
          }
        });
      }
      else
        this.intializePanels();
    },

    // Read the messages of the database server and get the port ID and attach the executer to that port.
    messages: function(trans_id) {
      var self = this;
      // Make ajax call to listen the database message
      var baseUrl = "{{ url_for('debugger.index') }}" + "messages/" + trans_id;

      $.ajax({
        url: baseUrl,
        method: 'GET',
        success: function(res) {
          if (res.data.status === 'Success') {
            self.intializePanels();
            // If status is Success then find the port number to attach the executer.
            //self.start_execution(trans_id, res.data.result);
            controller.start_execution(trans_id, res.data.result);
          }
          else if (res.data.status === 'Busy') {
            // If status is Busy then poll the result by recursive call to the poll function
            self.messages(trans_id);
          }
          else if (res.data.status === 'NotConnected') {
            Alertify.alert(
              'Not connected to server or connection with the server has been closed.',
              res.data.result
            );
          }
        },
        error: function(e) {
          Alertify.alert(
            'Debugger: Error fetching messages information'
          );
        }
      });

    },

    // Callback function when user click on gutters of codemirror to set/clear the breakpoint
    onBreakPoint: function(cm, m, gutter) {
      var self = this;

      // If breakpoint gutter is clicked and execution is not completed then only set the breakpoint
      if (gutter == "breakpoints" && !pgTools.DirectDebug.polling_timeout_idle ) {
        // We may want to check, if break-point is allowed at this moment or not
        var info = cm.lineInfo(m);

        // If gutterMarker is undefined that means there is no marker defined previously
        // So we need to set the breakpoint command here...
        if (info.gutterMarkers == undefined) {
          controller.set_breakpoint(self.trans_id,m+1,1); //set the breakpoint
        }
        else {
          controller.set_breakpoint(self.trans_id,m+1,0); //clear the breakpoint
        }

        cm.setGutterMarker(
          m, "breakpoints", info.gutterMarkers ? null : function() {
            var marker = document.createElement("div");

            marker.style.color = "#822";
            marker.innerHTML = "●";

            return marker;
        }());
      }
    },

    // Create the debugger layout with splitter and display the appropriate data received from server.
    intializePanels: function() {
      var self = this;
      this.registerPanel(
        'code', false, '100%', '100%',
        function(panel) {

            // Create the parameters panel to display the arguments of the functions
            var parameters = new pgAdmin.Browser.Panel({
              name: 'parameters',
              title: '{{ _('Parameters') }}',
              width: '100%',
              height:'100%',
              isCloseable: false,
              isPrivate: true,
              content: '<div id ="parameters" class="parameters"></div>'
            })

            // Create the Local variables panel to display the local variables of the function.
            var local_variables = new pgAdmin.Browser.Panel({
              name: 'local_variables',
              title: '{{ _('Local variables') }}',
              width: '100%',
              height:'100%',
              isCloseable: false,
              isPrivate: true,
              content: '<div id ="local_variables" class="local_variables"></div>'
            })

            // Create the messages panel to display the message returned from the database server
            var messages = new pgAdmin.Browser.Panel({
              name: 'messages',
              title: '{{ _('Messages') }}',
              width: '100%',
              height:'100%',
              isCloseable: false,
              isPrivate: true,
              content: '<div id="messages" class="messages"></div>'
            })

            // Create the result panel to display the result after debugging the function
            var results = new pgAdmin.Browser.Panel({
              name: 'results',
              title: '{{ _('Results') }}',
              width: '100%',
              height:'100%',
              isCloseable: false,
              isPrivate: true,
              content: '<div id="debug_results" class="debug_results"></div>'
            })

            // Create the stack pane panel to display the debugging stack information.
            var stack_pane = new pgAdmin.Browser.Panel({
              name: 'stack_pane',
              title: '{{ _('Stack') }}',
              width: '100%',
              height:'100%',
              isCloseable: false,
              isPrivate: true,
              content: '<div id="stack_pane" class="stack_pane"></div>'
            })

            // Load all the created panels
            parameters.load(self.docker);
            local_variables.load(self.docker);
            messages.load(self.docker);
            results.load(self.docker);
            stack_pane.load(self.docker);
        });

        self.code_editor_panel = self.docker.addPanel('code', wcDocker.DOCK.TOP );

        self.parameters_panel = self.docker.addPanel(
          'parameters', wcDocker.DOCK.BOTTOM, self.code_editor_panel);
        self.local_variables_panel = self.docker.addPanel('local_variables', wcDocker.DOCK.STACKED, self.parameters_panel, {
          tabOrientation: wcDocker.TAB.TOP
        });
        self.messages_panel = self.docker.addPanel('messages', wcDocker.DOCK.STACKED, self.parameters_panel);
        self.results_panel = self.docker.addPanel(
          'results', wcDocker.DOCK.STACKED, self.parameters_panel);
        self.stack_pane_panel = self.docker.addPanel(
          'stack_pane', wcDocker.DOCK.STACKED, self.parameters_panel);

        var editor_pane = $('<div id="stack_editor_pane" class="full-container-pane info"></div>');
        var code_editor_area = $('<textarea id="debugger-editor-textarea"></textarea>').append(editor_pane);
        self.code_editor_panel.layout().addItem(code_editor_area);

        // To show the line-number and set breakpoint marker details by user.
        var editor = self.editor = CodeMirror.fromTextArea(
          code_editor_area.get(0), {
          lineNumbers: true,
          foldOptions: {
            widget: "\u2026"
          },
          foldGutter: {
            rangeFinder: CodeMirror.fold.combine(CodeMirror.pgadminBeginRangeFinder, CodeMirror.pgadminIfRangeFinder,
                                                 CodeMirror.pgadminLoopRangeFinder, CodeMirror.pgadminCaseRangeFinder)
          },
          gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter", "breakpoints"],
          mode: "text/x-pgsql",
          readOnly: true,
          extraKeys: pgAdmin.Browser.editor_shortcut_keys,
          tabSize: pgAdmin.Browser.editor_options.tabSize
        });

        // On loading the docker, register the callbacks
        var onLoad = function() {
          self.docker.finishLoading(100);
          self.docker.off(wcDocker.EVENT.LOADED);
          // Register the callback when user set/clear the breakpoint on gutter area.
          self.editor.on("gutterClick", self.onBreakPoint.bind(self), self);
        };

        self.docker.startLoading('{{ _('Loading...') }}');
        self.docker.on(wcDocker.EVENT.LOADED, onLoad);

        // Create the toolbar view for debugging the function
        this.toolbarView = new DebuggerToolbarView();
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
            $('<div>', {'class': 'pg-debugger-panel'})
          );
          if (onInit) {
            onInit.apply(self, [panel]);
          }
        }
      });
    }
  });

  pgTools.DirectDebug = new DirectDebug();

  return pgTools.DirectDebug;
});
