define([
  'pgadmin', 'underscore', 'underscore.string', 'jquery', 'pgadmin.browser',
  'alertify', 'pgadmin.browser.messages'
], function(pgAdmin, _, S, $, pgBrowser, alertify, pgMessages) {

  pgBrowser.BackgroundProcessObsorver = pgBrowser.BackgroundProcessObsorver || {};

  if (pgBrowser.BackgroundProcessObsorver.initialized) {
    return pgBrowser.BackgroundProcessObsorver;
  }

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
      initialize: function(info, notify) {
        _.extend(this, {
          details: false,
          notify: (_.isUndefined(notify) || notify),
          curr_status: null,
          state: 0, // 0: NOT Started, 1: Started, 2: Finished
          completed: false,

          id: info['id'],
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
          logs: $('<ol></ol>', {class: 'pg-bg-process-logs'})
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
          )
        }
        var self = this;

        setTimeout(
          function() {
            self.update.apply(self, [info]);
          }, 1
        );
      },

      url: function(type) {
        var url = S('%s%s').sprintf(pgMessages['bgprocess.index'], this.id).value();

        switch (type) {
          case 'status':
            if (this.details && this.out != -1 && this.err != -1) {
              url = S('%s/%s/%s/').sprintf(
                url, this.out, this.err
              ).value();
            }
            break;
        }

        return url;
      },

      update: function(data) {
        var self = this,
            out = [],
            err = [],
            idx = 0;

        if ('stime' in data)
          self.stime = new Date(data.stime);

        if ('execution_time' in data)
          self.execution_time = parseFloat(data.execution_time);

        if ('desc' in data)
          self.desc = data.desc;

        if ('details' in data)
          self.detailed_desc = data.details;

        if ('exit_code' in data)
          self.exit_code = data.exit_code;

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
        ) || (
          !self.details && !_.isNull(self.exit_code)
        );

        var io = ie = 0, res = [],
            escapeEl = document.createElement('textarea'),
            escapeHTML = function(html) {
              escapeEl.textContent = html;
              return escapeEl.innerHTML;
            };

        while (io < out.length && ie < err.length) {
          if (pgAdmin.natural_sort(out[io][0], err[ie][0]) <= 0){
            res.push('<li class="pg-bg-res-out">' + escapeHTML(out[io++][1]) + '</li>');
          } else {
            res.push('<li class="pg-bg-res-err">' + escapeHTML(err[ie++][1]) + '</li>');
          }
        }

        while (io < out.length) {
          res.push('<li class="pg-bg-res-out">' + escapeHTML(out[io++][1]) + '</li>');
        }

        while (ie < err.length) {
          res.push('<li class="pg-bg-res-err">' + escapeHTML(err[ie++][1]) + '</li>');
        }
        if (res.length) {
          self.logs.append(res.join(''));
        }

        if (self.stime) {
          self.curr_status = pgMessages['started'];

          if (self.execution_time >= 2) {
            self.curr_status = pgMessages['running'];
          }

          if (!_.isNull(self.exit_code)) {
            if (self.exit_code == 0) {
              self.curr_status = pgMessages['successfully_finished'];
            } else {
              self.curr_status = S(
                pgMessages['failed_with_exit_code']
              ).sprintf(String(self.exit_code)).value();
            }
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

          setTimeout(function() {self.show.apply(self)}, 10);
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
          url: self.url('status'),
          cache: false,
          async: true,
          contentType: "application/json",
          success: function(res) {
            setTimeout(function() { self.update(res); }, 10);
          },
          error: function(res) {
            // Try after some time only if job id present
            if (res.status != 410)
              setTimeout(function() { self.update(res); }, 10000);
          }
        });
      },

      show: function() {
        var self = this;

        if (self.notify && !self.details) {
          if (!self.notifier) {
            var header = $('<div></div>', {
                  class: "h5 pg-bg-notify-header"
                }).append($('<span></span>').text(self.desc)),
                content = $('<div class="pg-bg-bgprocess row"></div>').append(
                  header
                ).append(
                  $('<div></div>', {class: 'pg-bg-notify-body h6' }).append(
                    $('<div></div>', {class: 'pg-bg-start col-xs-12' }).append(
                      $('<div></div>').text(self.stime.toString())
                    ).append(
                      $('<div class="pg-bg-etime"></div>')
                    )
                  )
                ),
                for_details = $('<div></div>', {
                  class: "col-xs-12 text-center pg-bg-click h6"
                }).append(
                  $('<span></span>').text(pgMessages.CLICK_FOR_DETAILED_MSG)
                ).appendTo(content),
                status = $('<div></div>', {
                  class: "pg-bg-status col-xs-12 h5 " + ((self.exit_code === 0) ?
                      'bg-success': (self.exit_code == 1) ?
                      'bg-failed' : '')
                }).appendTo(content),
                close_me = $(
                  '<div class="bg-close"><i class="fa fa-close"></i></div>'
                ).appendTo(header);

            self.container = content;
            self.notifier = alertify.notify(
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

            close_me.on('click', function(ev) {
              this.notifier.dismiss();
              this.notifier = null;
              this.acknowledge_server.apply(this);
            }.bind(this));

            // Do not close the notifier, when clicked on the container, which
            // is a default behaviour.
            content.on('click', function(ev) {
              ev = ev || window.event;
              ev.cancelBubble = true;
              ev.stopPropagation();

              return;
            });
          }
          // TODO:: Formatted execution time
          self.container.find('.pg-bg-etime').empty().append(
            $('<span></span>').text(
              String(self.execution_time)
            )
          ).append(
            $('<span></span>').text(' ' + pgMessages['seconds'])
          );
          self.container.find('.pg-bg-status').empty().append(
            self.curr_status
          );
        } else {
          self.show_detailed_view.apply(self)
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

          panel.title('Process Watcher - ' + self.desc);
          panel.focus();
        }

        var container = panel.$container,
            status_class = (
              (self.exit_code === 0) ?
                'bg-bgprocess-success': (self.exit_code == 1) ?
                  'bg-bgprocess-failed' : ''
            ),
            $logs = container.find('.bg-process-watcher'),
            $header = container.find('.bg-process-details'),
            $footer = container.find('.bg-process-footer');

        if (is_new) {
          // set logs
          $logs.html(self.logs);

          // set bgprocess detailed description
          $header.find('.bg-detailed-desc').html(self.detailed_desc);
        }

        // set bgprocess start time
        $header.find('.bg-process-stats .bgprocess-start-time').html(
          self.stime
        );

        // set status
        $footer.find('.bg-process-status p').removeClass().addClass(
          status_class
        ).html(self.curr_status);

        // set bgprocess execution time
        $footer.find('.bg-process-exec-time p').empty().append(
          $('<span></span>').text(
            String(self.execution_time)
          )
        ).append(
          $('<span></span>').text(' ' + pgMessages['seconds'])
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

          var resize_log_container = function($logs, $header, $footer) {
            var h = $header.outerHeight() + $footer.outerHeight();
            $logs.css('padding-bottom', h);
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
          url: self.url('acknowledge'),
          cache: false,
          async: true,
          contentType: "application/json",
          success: function(res) {
            return;
          },
          error: function(res) {
          }
        });
      }
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
        )
      },

      update_process_list: function(recheck) {
        var observer = this;

        $.ajax({
          typs: 'GET',
          timeout: 30000,
          url: pgMessages['bgprocess.index'],
          cache: false,
          async: true,
          contentType: "application/json",
          success: function(res) {
            var cnt = 0;
            if (!res || !_.isArray(res)) {
              return;
            }
            for (idx in res) {
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
          },
          error: function(res) {
            // FIXME:: What to do now?
          }
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
                    y: (screen.height < 500 ? '2%' : '25%')
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
                content: '<div class="bg-process-details col-xs-12">'+
                  '<p class="bg-detailed-desc"></p>'+
                  '<div class="bg-process-stats">'+
                  '<span><b>' + pgMessages['START_TIME'] + ': </b>'+
                  '<span class="bgprocess-start-time"></span>'+
                  '</span></div>'+
                  '</div>'+
                  '<div class="bg-process-watcher col-xs-12">'+
                  '</div>'+
                  '<div class="bg-process-footer col-xs-12">'+
                  '<div class="bg-process-status col-xs-6">'+
                  '<span><b>' + pgMessages['STATUS'] + ':</b></span><p></p>'+
                  '</div>'+
                  '<div class="bg-process-exec-time col-xs-6">'+
                  '<div class="exec-div pull-right">'+
                  '<span><b>' + pgMessages['EXECUTION_TIME'] + ':</b></span><p></p>'+
                  '</div>'+
                  '</div>'+
                  '</div>',
                onCreate: function(myPanel, $container) {
                  $container.addClass('pg-no-overflow');
                }
              });
          p.load(pgBrowser.docker);
      }
    });

  return pgBrowser.BackgroundProcessObsorver;
});
