/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define('misc.bgprocess', [
  'sources/pgadmin', 'sources/gettext', 'sources/url_for', 'underscore',
  'jquery', 'pgadmin.browser', 'alertify',
], function(
  pgAdmin, gettext, url_for, _, $, pgBrowser, Alertify
) {

  pgBrowser.BackgroundProcessObsorver = pgBrowser.BackgroundProcessObsorver || {};

  if (pgBrowser.BackgroundProcessObsorver.initialized) {
    return pgBrowser.BackgroundProcessObsorver;
  }

  var isServerMode = (function() { return pgAdmin.server_mode == 'True'; })();

  var wcDocker = window.wcDocker;

  var BGProcess = function(info, notify) {
    var self = this;
    setTimeout(
      function() {
        self.initialize.apply(self, [info, notify]);
      }, 1
    );
  };

  _.extend(
    BGProcess.prototype, {
      success_status_tpl: _.template(`
      <div class="d-flex px-2 py-1 bg-success-light border border-success rounded">
        <div class="pr-2">
          <i class="fa fa-check text-success pg-bg-status-icon" aria-hidden="true" role="img"></i>
        </div>
        <div class="mx-auto pg-bg-status-text alert-text-body"><%-status_text%></div>
      </div>`),
      failed_status_tpl: _.template(`
      <div class="d-flex px-2 py-1 bg-danger-lighter border border-danger rounded">
        <div class="pr-2">
          <i class="fa fa-times fa-lg text-danger pg-bg-status-icon" aria-hidden="true" role="img"></i>
        </div>
        <div class="mx-auto pg-bg-status-text alert-text-body"><%-status_text%></div>
      </div>`),
      other_status_tpl: _.template(`
      <div class="d-flex px-2 py-1 bg-primary-light border border-primary rounded">
        <div class="pr-2">
          <i class="fa fa-info fa-lg text-primary pg-bg-status-icon" aria-hidden="true" role="img"></i>
        </div>
        <div class="mx-auto pg-bg-status-text alert-text-body"><%-status_text%></div>
      </div>`),
      initialize: function(info, notify) {
        _.extend(this, {
          details: false,
          notify: (_.isUndefined(notify) || notify),
          curr_status: null,
          state: 0, // 0: NOT Started, 1: Started, 2: Finished, 3: Terminated
          completed: false,
          current_storage_dir: null,

          id: info['id'],
          type_desc: null,
          desc: null,
          detailed_desc: null,
          stime: null,
          exit_code: null,
          acknowledge: info['acknowledge'],
          execution_time: null,
          out: -1,
          err: -1,
          lot_more: false,

          notifier: null,
          container: null,
          panel: null,
          logs: $('<ol></ol>', {
            class: 'pg-bg-process-logs',
          }),
        });

        if (this.notify) {
          pgBrowser.Events && pgBrowser.Events.on(
            'pgadmin-bgprocess:started:' + this.id,
            function(process) {
              if (!process.notifier)
                process.show.apply(process);
            }
          );
          pgBrowser.Events && pgBrowser.Events.on(
            'pgadmin-bgprocess:finished:' + this.id,
            function(process) {
              if (!process.notifier)
                process.show.apply(process);
            }
          );
        }
        var self = this;

        setTimeout(
          function() {
            self.update.apply(self, [info]);
          }, 1
        );
      },

      bgprocess_url: function(type) {
        switch (type) {
        case 'status':
          if (this.details && this.out != -1 && this.err != -1) {
            return url_for(
              'bgprocess.detailed_status', {
                'pid': this.id,
                'out': this.out,
                'err': this.err,
              }
            );
          }
          return url_for('bgprocess.status', {
            'pid': this.id,
          });
        case 'acknowledge':
          return url_for('bgprocess.acknowledge', {
            'pid': this.id,
          });
        case 'stop_process':
          return url_for('bgprocess.stop_process', {
            'pid': this.id,
          });
        default:
          return url_for('bgprocess.list');
        }
      },

      update: function(data) {
        var self = this,
          out = [],
          err = [];

        if ('stime' in data)
          self.stime = new Date(data.stime);

        if ('execution_time' in data)
          self.execution_time = parseFloat(data.execution_time);

        if ('type_desc' in data)
          self.type_desc = data.type_desc;

        if ('desc' in data)
          self.desc = data.desc;

        if ('details' in data)
          self.detailed_desc = data.details;

        if ('exit_code' in data)
          self.exit_code = data.exit_code;

        if ('process_state' in data)
          self.state = data.process_state;

        if ('current_storage_dir' in data)
          self.current_storage_dir = data.current_storage_dir;

        if ('out' in data) {
          self.out = data.out && data.out.pos;

          if (data.out && data.out.lines) {
            out = data.out.lines;
          }
        }

        if ('err' in data) {
          self.err = data.err && data.err.pos;

          if (data.err && data.err.lines) {
            err = data.err.lines;
          }
        }
        self.completed = self.completed || (
          'err' in data && 'out' in data && data.err.done && data.out.done
        ) || (!self.details && !_.isNull(self.exit_code));

        var io = 0,
          ie = 0,
          res = [],
          escapeEl = document.createElement('textarea'),
          escapeHTML = function(html) {
            escapeEl.textContent = html;
            return escapeEl.innerHTML;
          };

        while (io < out.length && ie < err.length) {
          if (pgAdmin.natural_sort(out[io][0], err[ie][0]) <= 0) {
            res.push('<li class="pg-bg-res-out">' + escapeHTML(out[io++][1]) + '</li>');
          } else {
            let log_msg = escapeHTML(err[ie++][1]);
            let regex_obj = new RegExp(': (' + gettext('error') + '|' + gettext('fatal') + '):', 'i');
            if (regex_obj.test(log_msg)) {
              res.push('<li class="pg-bg-res-err">' + log_msg + '</li>');
            } else {
              res.push('<li class="pg-bg-res-out">' + log_msg + '</li>');
            }
          }
        }

        while (io < out.length) {
          res.push('<li class="pg-bg-res-out">' + escapeHTML(out[io++][1]) + '</li>');
        }

        while (ie < err.length) {
          let log_msg = escapeHTML(err[ie++][1]);
          let regex_obj = new RegExp(': (' + gettext('error') + '|' + gettext('fatal') + '):', 'i');
          if (regex_obj.test(log_msg)) {
            res.push('<li class="pg-bg-res-err">' + log_msg + '</li>');
          } else {
            res.push('<li class="pg-bg-res-out">' + log_msg + '</li>');
          }
        }

        if (res.length) {
          self.logs.append(res.join(''));
          setTimeout(function() {
            self.logs[0].scrollTop = self.logs[0].scrollHeight;
          });
        }

        if(self.logs_loading) {
          self.logs_loading.remove();
          self.logs_loading = null;
        }

        if (self.stime) {
          self.curr_status = self.other_status_tpl({status_text:gettext('Started')});

          if (self.execution_time >= 2) {
            self.curr_status = self.other_status_tpl({status_text:gettext('Running...')});
          }

          if (!_.isNull(self.exit_code)) {
            if (self.state === 3) {
              self.curr_status = self.failed_status_tpl({status_text:gettext('Terminated by user.')});
            } else if (self.exit_code == 0) {
              self.curr_status = self.success_status_tpl({status_text:gettext('Successfully completed.')});
            } else {
              self.curr_status = self.failed_status_tpl(
                {status_text:gettext('Failed (exit code: %s).', String(self.exit_code))}
              );
            }
          } else if (_.isNull(self.exit_code) && self.state === 3) {
            self.curr_status = self.other_status_tpl({status_text:gettext('Terminating the process...')});
          }

          if (self.state == 0 && self.stime) {
            self.state = 1;
            pgBrowser.Events && pgBrowser.Events.trigger(
              'pgadmin-bgprocess:started:' + self.id, self, self
            );
          }

          if (self.state == 1 && !_.isNull(self.exit_code)) {
            self.state = 2;
            pgBrowser.Events && pgBrowser.Events.trigger(
              'pgadmin-bgprocess:finished:' + self.id, self, self
            );
          }

          setTimeout(function() {
            self.show.apply(self);
          }, 10);
        }

        if (!self.completed) {
          setTimeout(
            function() {
              self.status.apply(self);
            }, 1000
          );
        }
      },

      status: function() {
        var self = this;

        $.ajax({
          typs: 'GET',
          timeout: 30000,
          url: self.bgprocess_url('status'),
          cache: false,
          async: true,
          contentType: 'application/json',
        })
          .done(function(res) {
            setTimeout(function() {
              self.update(res);
            }, 10);
          })
          .fail(function(res) {
          // Try after some time only if job id present
            if (res.status != 410)
              setTimeout(function() {
                self.update(res);
              }, 10000);
          });
      },

      show: function() {
        var self = this;

        if (self.notify && !self.details) {
          if (!self.notifier) {
            let content = $(`
            <div class="card">
              <div class="card-header bg-primary d-flex">
                <div>${self.type_desc}</div>
                <div class="ml-auto">
                  <button class="btn btn-sm-sq btn-primary pg-bg-close"><i class="fa fa-lg fa-times" role="img"></i></button>
                </div>
              </div>
              <div class="card-body px-2">
                <div class="py-1">${self.desc}</div>
                <div class="py-1">${self.stime.toString()}</div>
                <div class="d-flex py-1">
                  <div class="my-auto mr-2">
                    <span class="fa fa-clock fa-lg" role="img"></span>
                  </div>
                  <div class="pg-bg-etime my-auto mr-2"></div>
                  <div class="ml-auto">
                    <button class="btn btn-secondary pg-bg-more-details" title="More Details"><span class="fa fa-info-circle" role="img"></span>&nbsp;` + gettext('More details...') + `</button>
                    <button class="btn btn-danger bg-process-stop" disabled><span class="fa fa-times-circle" role="img" title="Stop the operation"></span>&nbsp;` + gettext('Stop Process') + `</button>
                  </div>
                </div>
                <div class="pg-bg-status py-1">
                </div>
              </div>
            </div>
            `);

            let for_details = content.find('.pg-bg-more-details');
            let close_me = content.find('.pg-bg-close');

            self.container = content;
            self.notifier = Alertify.notify(
              content.get(0), 'bg-bgprocess', 0, null
            );

            for_details.on('click', function(ev) {
              ev = ev || window.event;
              ev.cancelBubble = true;
              ev.stopPropagation();

              this.notifier.dismiss();
              this.notifier = null;
              this.completed = false;

              this.show_detailed_view.apply(this);
            }.bind(self));

            close_me.on('click', function() {
              this.notifier.dismiss();
              this.notifier = null;
              this.acknowledge_server.apply(this);
            }.bind(this));

            // Do not close the notifier, when clicked on the container, which
            // is a default behaviour.
            self.container.on('click', function(ev) {
              ev = ev || window.event;
              ev.cancelBubble = true;
              ev.stopPropagation();

              return;
            });

            // On Click event to stop the process.
            content.find('.bg-process-stop').off('click').on('click', self.stop_process.bind(this));
          }

          // TODO:: Formatted execution time
          self.container.find('.pg-bg-etime').empty().append(
            $('<span></span>').text(
              String(self.execution_time)
            )
          ).append(
            $('<span></span>').text(' ' + gettext('seconds'))
          );

          var $status_bar = $(self.container.find('.pg-bg-status'));
          $status_bar.html(self.curr_status);
          var $btn_stop_process = $(self.container.find('.bg-process-stop'));

          // Enable Stop Process button only when process is running
          if (parseInt(self.state) === 1) {
            $btn_stop_process.attr('disabled', false);
          } else {
            $btn_stop_process.attr('disabled', true);
          }
        } else {
          self.show_detailed_view.apply(self);
        }
      },

      show_detailed_view: function() {
        var self = this,
          panel = this.panel,
          is_new = false;

        if (!self.panel) {
          is_new = true;
          panel = this.panel =
            pgBrowser.BackgroundProcessObsorver.create_panel();
          panel.title(gettext('Process Watcher - %s', self.type_desc));
          panel.focus();
        }

        var container = panel.$container,
          $logs = container.find('.bg-process-watcher'),
          $header = container.find('.bg-process-details'),
          $footer = container.find('.bg-process-footer'),
          $btn_stop_process = container.find('.bg-process-stop'),
          $btn_storage_manager = container.find('.bg-process-storage-manager');

        if(self.current_storage_dir && isServerMode) { //for backup & exports with server mode, operate over storage manager

          if($btn_storage_manager.length == 0) {
            var str_storage_manager_btn = '<button id="bg-process-storage-manager" class="btn btn-secondary bg-process-storage-manager" title="Click to open file location" aria-label="Storage Manager" tabindex="0" disabled><span class="pg-font-icon icon-storage-manager" role="img"></span></button>&nbsp;';
            container.find('.bg-process-details .bg-btn-section').prepend(str_storage_manager_btn);
            $btn_storage_manager = container.find('.bg-process-storage-manager');
          }

          // Disable storage manager button only when process is running
          if (parseInt(self.state) === 1) {
            $btn_storage_manager.attr('disabled', true);
          }
          else {
            $btn_storage_manager.attr('disabled', false);
          }
          // On Click event for storage manager button.
          $btn_storage_manager.off('click').on('click', self.storage_manager.bind(this));
        }

        // Enable Stop Process button only when process is running
        if (parseInt(self.state) === 1) {
          $btn_stop_process.attr('disabled', false);
        } else {
          $btn_stop_process.attr('disabled', true);
        }

        // On Click event to stop the process.
        $btn_stop_process.off('click').on('click', self.stop_process.bind(this));

        if (is_new) {
          // set logs
          $logs.html(self.logs);
          setTimeout(function() {
            self.logs[0].scrollTop = self.logs[0].scrollHeight;
          });
          self.logs_loading = $('<li class="pg-bg-res-out loading-logs">' + gettext('Loading process logs...') + '</li>');
          self.logs.append(self.logs_loading);
          // set bgprocess detailed description
          $header.find('.bg-detailed-desc').html(self.detailed_desc);
        }

        // set bgprocess start time
        $header.find('.bg-process-stats .bgprocess-start-time').html(
          self.stime
        );

        // set status
        $footer.find('.bg-process-status').html(self.curr_status);

        // set bgprocess execution time
        $footer.find('.bg-process-exec-time p').empty().append(
          $('<span></span>').text(
            String(self.execution_time)
          )
        ).append(
          $('<span></span>').text(' ' + gettext('seconds'))
        );

        if (is_new) {
          self.details = true;
          self.err = 0;
          self.out = 0;
          setTimeout(
            function() {
              self.status.apply(self);
            }, 1000
          );

          var resize_log_container = function(logs, header, footer) {
            var h = header.outerHeight() + footer.outerHeight();
            logs.css('padding-bottom', h);
          }.bind(panel, $logs, $header, $footer);

          panel.on(wcDocker.EVENT.RESIZED, resize_log_container);
          panel.on(wcDocker.EVENT.ATTACHED, resize_log_container);
          panel.on(wcDocker.EVENT.DETACHED, resize_log_container);

          resize_log_container();

          panel.on(wcDocker.EVENT.CLOSED, function(process) {
            process.panel = null;

            process.details = false;
            if (process.exit_code != null) {
              process.acknowledge_server.apply(process);
            }
          }.bind(panel, this));
        }
      },

      acknowledge_server: function() {
        var self = this;
        $.ajax({
          type: 'PUT',
          timeout: 30000,
          url: self.bgprocess_url('acknowledge'),
          cache: false,
          async: true,
          contentType: 'application/json',
        })
          .done(function() {
            return;
          })
          .fail(function() {
            console.warn(arguments);
          });
      },

      stop_process: function() {
        var self = this;
        // Set the state to terminated.
        self.state = 3;
        $.ajax({
          type: 'PUT',
          timeout: 30000,
          url: self.bgprocess_url('stop_process'),
          cache: false,
          async: true,
          contentType: 'application/json',
        })
          .done(function() {
            return;
          })
          .fail(function() {
            console.warn(arguments);
          });
      },

      storage_manager: function() {

        var self = this;
        if(self.current_storage_dir) {
          pgBrowser.Events.trigger(
            'pgadmin:tools:storage_manager', self.current_storage_dir
          );
        }
      },
    });

  _.extend(
    pgBrowser.BackgroundProcessObsorver, {
      bgprocesses: {},
      init: function() {
        var self = this;

        if (self.initialized) {
          return;
        }
        self.initialized = true;

        setTimeout(
          function() {
            self.update_process_list.apply(self);
          }, 1000
        );

        pgBrowser.Events.on(
          'pgadmin-bgprocess:created',
          function() {
            setTimeout(
              function() {
                pgBrowser.BackgroundProcessObsorver.update_process_list(true);
              }, 1000
            );
          }
        );
      },

      update_process_list: function(recheck) {
        var observer = this;

        $.ajax({
          typs: 'GET',
          timeout: 30000,
          url: url_for('bgprocess.list'),
          cache: false,
          async: true,
          contentType: 'application/json',
        })
          .done(function(res) {
            if (!res || !_.isArray(res)) {
              return;
            }
            for (var idx in res) {
              var process = res[idx];
              if ('id' in process) {
                if (!(process.id in observer.bgprocesses)) {
                  observer.bgprocesses[process.id] = new BGProcess(process);
                }
              }
            }
            if (recheck && res.length == 0) {
            // Recheck after some more time
              setTimeout(
                function() {
                  observer.update_process_list(false);
                }, 3000
              );
            }
          })
          .fail(function() {
          // FIXME:: What to do now?
            console.warn(arguments);
          });
      },

      create_panel: function() {
        this.register_panel();

        return pgBrowser.docker.addPanel(
          'bg_process_watcher',
          wcDocker.DOCK.FLOAT,
          null, {
            w: (screen.width < 700 ?
              screen.width * 0.95 : screen.width * 0.5),
            h: (screen.height < 500 ?
              screen.height * 0.95 : screen.height * 0.5),
            x: (screen.width < 700 ? '2%' : '25%'),
            y: (screen.height < 500 ? '2%' : '25%'),
          });
      },

      register_panel: function() {
        var w = pgBrowser.docker,
          panels = w.findPanels('bg_process_watcher');

        if (panels && panels.length >= 1)
          return;

        var p = new pgBrowser.Panel({
          name: 'bg_process_watcher',
          showTitle: true,
          isCloseable: true,
          isPrivate: true,
          isLayoutMember: false,
          content: '<div class="bg-process-details">' +
              '<div class="bg-detailed-desc"></div>' +
              '<div class="bg-process-stats d-flex py-1">' +
                '<div class="my-auto mr-2">' +
                  '<span class="fa fa-clock fa-lg" role="img"></span>' +
                '</div>' +
                '<div class="pg-bg-etime my-auto mr-2">'+
                  '<span>' + gettext('Start time') + ': <span class="bgprocess-start-time"></span>' +
                  '</span>'+
                '</div>' +
                '<div class="ml-auto bg-btn-section">' +
                  '<button type="button" class="btn btn-danger bg-process-stop" disabled><span class="fa fa-times-circle" role="img"></span>&nbsp;' + gettext('Stop Process') + '</button>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="bg-process-watcher">' +
            '</div>' +
            '<div class="bg-process-footer p-2 d-flex">' +
              '<div class="bg-process-status flex-grow-1">' +
              '</div>' +
              '<div class="bg-process-exec-time ml-4 my-auto">' +
                '<div class="exec-div">' +
                  '<span>' + gettext('Execution time') + ':</span><p></p>' +
                '</div>' +
              '</div>' +
            '</div>',
          onCreate: function(myPanel, $container) {
            $container.addClass('pg-no-overflow p-2');
          },
        });
        p.load(pgBrowser.docker);
      },
    });

  return pgBrowser.BackgroundProcessObsorver;
});
