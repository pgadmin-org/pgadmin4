/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getPanelView } from './panel_view';
import _ from 'lodash';

define(
  ['sources/pgadmin', 'wcdocker'],
  function(pgAdmin) {

    let pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {},
      wcDocker = window.wcDocker;

    pgAdmin.Browser.Panel = function(options) {
      let defaults = [
        'name', 'title', 'width', 'height', 'showTitle', 'isCloseable',
        'isPrivate', 'isLayoutMember', 'content', 'icon', 'events', 'onCreate', 'elContainer',
        'canHide', 'limit', 'extraClasses', 'canMaximise',
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
      isLayoutMember: true,
      content: '',
      icon: '',
      panel: null,
      onCreate: null,
      elContainer: false,
      canMaximise: false,
      limit: null,
      extraClasses: null,
      load: function(docker, title) {
        let that = this;
        if (!that.panel) {
          docker.registerPanelType(that.name, {
            title: that.title,
            isPrivate: that.isPrivate,
            limit: that.limit,
            isLayoutMember: that.isLayoutMember,
            onCreate: function(myPanel) {
              myPanel.panelData = {
                pgAdminName: that.name,
              };
              myPanel.initSize(that.width, that.height);

              if (!that.showTitle)
                myPanel.title(false);
              else {
                let title_elem = '<a href="#" tabindex="-1" class="panel-link-heading">' + (title || that.title) + '</a>';
                myPanel.title(title_elem);
                if (that.icon != '')
                  myPanel.icon(that.icon);
              }

              let container = document.createElement('div');
              container.setAttribute('class', 'pg-panel-content');
              container.innerHTML = that.content;

              // Add extra classes
              if (!_.isNull('extraClasses')) {
                container.classList.add(that.extraClasses);
              }

              myPanel.maximisable(!!that.canMaximise);
              myPanel.closeable(!!that.isCloseable);
              myPanel.layout().addItem(container);
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
                that.onCreate.apply(that, [myPanel, container]);
              }

              // Prevent browser from opening the drag file.
              // Using addEventListener to avoid conflict with jquery.drag
              ['dragover', 'drop'].forEach((eventName)=>{
                container.addEventListener(eventName, function(event) {
                  event.stopPropagation();
                  event.preventDefault();
                });
              });

              if (that.elContainer) {
                myPanel.pgElContainer = container;
                _.each([
                  wcDocker.EVENT.RESIZED, wcDocker.EVENT.ATTACHED,
                  wcDocker.EVENT.DETACHED, wcDocker.EVENT.VISIBILITY_CHANGED,
                ], function(ev) {
                  myPanel.on(ev, that.resizedContainer.bind(myPanel));
                });
                that.resizedContainer.apply(myPanel);
              }

              if (myPanel._type == 'dashboard' || myPanel._type == 'processes') {
                getPanelView(
                  pgBrowser.tree,
                  container,
                  pgBrowser,
                  myPanel._type
                );
              }

              // Re-render the dashboard panel when preference value 'show graph' gets changed.
              pgBrowser.onPreferencesChange('dashboards', function() {
                getPanelView(
                  pgBrowser.tree,
                  container,
                  pgBrowser,
                  myPanel._type
                );
              });

              // Re-render the dashboard panel when preference value gets changed.
              pgBrowser.onPreferencesChange('graphs', function() {
                getPanelView(
                  pgBrowser.tree,
                  container,
                  pgBrowser,
                  myPanel._type
                );
              });

              _.each([wcDocker.EVENT.CLOSED, wcDocker.EVENT.VISIBILITY_CHANGED],
                function(ev) {
                  myPanel.on(ev, that.handleVisibility.bind(myPanel, ev));
                });

              pgBrowser.Events.on('pgadmin-browser:tree:selected', () => {

                if(myPanel.isVisible() && myPanel._type !== 'properties') {
                  getPanelView(
                    pgBrowser.tree,
                    container,
                    pgBrowser,
                    myPanel._type
                  );
                }
              });

              pgBrowser.Events.on('pgadmin:database:connected', () => {

                if(myPanel.isVisible() && myPanel._type !== 'properties') {
                  getPanelView(
                    pgBrowser.tree,
                    container,
                    pgBrowser,
                    myPanel._type
                  );
                }
              });

              pgBrowser.Events.on('pgadmin-browser:tree:refreshing', () => {

                if(myPanel.isVisible() && myPanel._type !== 'properties') {
                  getPanelView(
                    pgBrowser.tree,
                    container,
                    pgBrowser,
                    myPanel._type
                  );
                }
              });
            },
          });
        }
      },
      eventFunc: function(eventName) {
        let name = this.panelData.pgAdminName;
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
        let p = this;

        if (p.pgElContainer && !p.pgResizeTimeout) {
          if (!p.isVisible()) {
            clearTimeout(p.pgResizeTimeout);
            p.pgResizeTimeout = null;

            return;
          }
          p.pgResizeTimeout = setTimeout(
            function() {
              let w = p.width(),
                elAttr = 'xs';
              p.pgResizeTimeout = null;

              /** Calculations based on https://getbootstrap.com/docs/4.1/layout/grid/#grid-options **/
              if (w >= 480) {
                elAttr = 'sm';
              }
              if (w >= 768) {
                elAttr = 'md';
              }
              if (w >= 992) {
                elAttr = 'lg';
              }
              if (w >=1200) {
                elAttr = 'xl';
              }

              p.pgElContainer.setAttribute('el', elAttr);
            },
            100
          );
        }
      },
      handleVisibility: function(eventName) {
        let selectedPanel = pgBrowser.docker.findPanels(this._type)[0];
        let isPanelVisible = selectedPanel.isVisible();
        let container = selectedPanel
          .layout()
          .scene()
          .find('.pg-panel-content');

        if (isPanelVisible && ['dashboard', 'statistics', 'dependencies', 'dependents', 'sql', 'processes'].includes(selectedPanel._type) ) {
          if (eventName == 'panelVisibilityChanged') {
            getPanelView(
              pgBrowser.tree,
              container[0],
              pgBrowser,
              this._type
            );
          }
        }
        if (eventName == 'panelClosed' && selectedPanel._type == 'dashboard') {
          getPanelView(
            pgBrowser.tree,
            container[0],
            pgBrowser,
            this._type,
            false
          );
        }
      }

    });

    return pgAdmin.Browser.Panel;
  });
