define(
  ['underscore', 'sources/pgadmin', 'jquery', 'wcdocker'],
  function(_, pgAdmin, $) {

    var pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {},
      wcDocker = window.wcDocker;

    pgAdmin.Browser.Panel = function(options) {
      var defaults = [
        'name', 'title', 'width', 'height', 'showTitle', 'isCloseable',
        'isPrivate', 'content', 'icon', 'events', 'onCreate', 'elContainer',
        'canHide', 'limit',
      ];
      _.extend(this, _.pick(options, defaults));
    };

    _.extend(pgAdmin.Browser.Panel.prototype, {
      name: '',
      title: '',
      width: 300,
      height: 600,
      showTitle: true,
      isCloseable: true,
      isPrivate: false,
      content: '',
      icon: '',
      panel: null,
      onCreate: null,
      elContainer: false,
      limit: null,
      load: function(docker, title) {
        var that = this;
        if (!that.panel) {
          docker.registerPanelType(that.name, {
            title: that.title,
            isPrivate: that.isPrivate,
            limit: that.limit,
            onCreate: function(myPanel) {
              $(myPanel).data('pgAdminName', that.name);
              myPanel.initSize(that.width, that.height);

              if (!that.showTitle)
                myPanel.title(false);
              else {
                var title_elem = '<a href="#" tabindex="0" class="panel-link-heading">' + (title || that.title) + '</a>';
                myPanel.title(title_elem);
                if (that.icon != '')
                  myPanel.icon(that.icon);
              }

              var $container = $('<div>', {
                'class': 'pg-panel-content',
              }).append($(that.content));

              myPanel.closeable(!!that.isCloseable);
              myPanel.layout().addItem($container);
              that.panel = myPanel;
              if (that.events && _.isObject(that.events)) {
                _.each(that.events, function(v, k) {
                  if (v && _.isFunction(v)) {
                    myPanel.on(k, v);
                  }
                });
              }
              _.each([
                wcDocker.EVENT.UPDATED, wcDocker.EVENT.VISIBILITY_CHANGED,
                wcDocker.EVENT.BEGIN_DOCK, wcDocker.EVENT.END_DOCK,
                wcDocker.EVENT.GAIN_FOCUS, wcDocker.EVENT.LOST_FOCUS,
                wcDocker.EVENT.CLOSED, wcDocker.EVENT.BUTTON,
                wcDocker.EVENT.ATTACHED, wcDocker.EVENT.DETACHED,
                wcDocker.EVENT.MOVE_STARTED, wcDocker.EVENT.MOVE_ENDED,
                wcDocker.EVENT.MOVED, wcDocker.EVENT.RESIZE_STARTED,
                wcDocker.EVENT.RESIZE_ENDED, wcDocker.EVENT.RESIZED,
                wcDocker.EVENT.SCROLLED,
              ], function(ev) {
                myPanel.on(ev, that.eventFunc.bind(myPanel, ev));
              });

              if (that.onCreate && _.isFunction(that.onCreate)) {
                that.onCreate.apply(that, [myPanel, $container]);
              }

              if (that.elContainer) {
                myPanel.pgElContainer = $container;
                $container.addClass('pg-el-container');
                _.each([
                  wcDocker.EVENT.RESIZED, wcDocker.EVENT.ATTACHED,
                  wcDocker.EVENT.DETACHED, wcDocker.EVENT.VISIBILITY_CHANGED,
                ], function(ev) {
                  myPanel.on(ev, that.resizedContainer.bind(myPanel));
                });
                that.resizedContainer.apply(myPanel);
              }

              // Bind events only if they are configurable
              if (that.canHide) {
                _.each([wcDocker.EVENT.CLOSED, wcDocker.EVENT.VISIBILITY_CHANGED],
                  function(ev) {
                    myPanel.on(ev, that.handleVisibility.bind(myPanel, ev));
                  });
              }
            },
          });
        }
      },
      eventFunc: function(eventName) {
        var name = $(this).data('pgAdminName');

        try {
          pgBrowser.Events.trigger(
            'pgadmin-browser:panel', eventName, this, arguments
          );
          pgBrowser.Events.trigger(
            'pgadmin-browser:panel:' + eventName, this, arguments
          );

          if (name) {
            pgBrowser.Events.trigger(
              'pgadmin-browser:panel-' + name, eventName, this, arguments
            );
            pgBrowser.Events.trigger(
              'pgadmin-browser:panel-' + name + ':' + eventName, this, arguments
            );
          }
        } catch (e) {
          console.warn(e.stack || e);
        }
      },
      resizedContainer: function() {
        var p = this;

        if (p.pgElContainer && !p.pgResizeTimeout) {
          if (!p.isVisible()) {
            clearTimeout(p.pgResizeTimeout);
            p.pgResizeTimeout = null;

            return;
          }
          p.pgResizeTimeout = setTimeout(
            function() {
              var w = p.width();
              p.pgResizeTimeout = null;

              if (w <= 480) {
                w = 'xs';
              } else if (w < 600) {
                w = 'sm';
              } else if (w < 768) {
                w = 'md';
              } else {
                w = 'lg';
              }

              p.pgElContainer.attr('el', w);
            },
            100
          );
        }
      },
      handleVisibility: function(eventName) {
        // Currently this function only works with dashboard panel but
        // as per need it can be extended
        if (this._type != 'dashboard' || _.isUndefined(pgAdmin.Dashboard))
          return;

        if (eventName == 'panelClosed') {
          pgBrowser.save_current_layout(pgBrowser);
          pgAdmin.Dashboard.toggleVisibility(false);
        } else if (eventName == 'panelVisibilityChanged') {
          if (pgBrowser.tree) {
            pgBrowser.save_current_layout(pgBrowser);
            var selectedNode = pgBrowser.tree.selected();
            if (!_.isUndefined(pgAdmin.Dashboard)) {
              pgAdmin.Dashboard.toggleVisibility(pgBrowser.panels.dashboard.panel.isVisible());
            }
            // Explicitly trigger tree selected event when we add the tab.
            pgBrowser.Events.trigger('pgadmin-browser:tree:selected', selectedNode,
              pgBrowser.tree.itemData(selectedNode), pgBrowser.Node);
          }
        }
      },

    });

    return pgAdmin.Browser.Panel;
  });
