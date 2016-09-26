define([
  'underscore', 'underscore.string', 'jquery', 'pgadmin.browser', 'backgrid',
  'alertify', 'wcdocker', 'pgadmin.backgrid', 'pgadmin.alertifyjs', 'pgadmin.browser.messages',
], function(_, S, $, pgBrowser, Backgrid, Alertify) {

  if (pgBrowser.NodeStatistics)
    return pgBrowser.NodeStatistics;

  pgBrowser.NodeStatistics = pgBrowser.NodeStatistics || {};

  if (pgBrowser.NodeStatistics.initialized) {
    return pgBrowser.NodeStatistics;
  }

  var PGBooleanCell = Backgrid.Extension.SwitchCell.extend({
      defaults: _.extend({}, Backgrid.Extension.SwitchCell.prototype.defaults)
  }),
  typeCellMapper = {
    // boolean
    16: PGBooleanCell,
    // int8
    20: Backgrid.IntegerCell,
    // int2
    21: Backgrid.IntegerCell,
    // int4
    23: Backgrid.IntegerCell,
    // float4
    700: Backgrid.NumberCell,
    // float8
    701: Backgrid.NumberCell,
    // numeric
    1700: Backgrid.NumberCell,
    // abstime
    702: Backgrid.DatetimeCell,
    // reltime
    703: Backgrid.DatetimeCell,
    // date
    1082: Backgrid.DatetimeCell.extend({
      includeDate: true, includeTime: false, includeMilli: false
    }),
    // time
    1083: Backgrid.DatetimeCell.extend({
      includeDate: false, includeTime: true, includeMilli: true
    }),
    // timestamp
    1114: Backgrid.DatetimeCell.extend({
      includeDate: true, includeTime: true, includeMilli: true
    }),
    // timestamptz
    1184: 'string'/* Backgrid.DatetimeCell.extend({
      includeDate: true, includeTime: true, includeMilli: true
    }) */,
    1266: 'string'/* Backgrid.DatetimeCell.extend({
      includeDate: false, includeTime: true, includeMilli: true
    }) */
  },
  GRID_CLASSES = "backgrid presentation table backgrid-striped table-bordered table-hover",
  wcDocker = window.wcDocker;

  _.extend(
    PGBooleanCell.prototype.defaults.options, {
      onText: pgBrowser.messages.TRUE,
      offText: pgBrowser.messages.FALSE,
      onColor: 'success',
      offColor: 'primary',
      size: 'mini'
    }
  );

  _.extend(pgBrowser.NodeStatistics, {
    init: function() {
      if (this.initialized) {
        return;
      }
      this.initialized = true;
      _.bindAll(
        this,
        'showStatistics', 'panelVisibilityChanged',
        '__createMultiLineStatistics', '__createSingleLineStatistics');

      _.extend(
        this, {
          initialized: true,
          collection: new (Backbone.Collection)(null),
          statistic_columns: [{
            editable: false,
            name: 'statistics',
            label: pgBrowser.messages.STATISTICS_LABEL,
            cell: 'string',
            headerCell: Backgrid.Extension.CustomHeaderCell,
            cellHeaderClasses: 'width_percent_25'
          },{
            editable: false,
            name: 'value',
            label: pgBrowser.messages.STATISTICS_VALUE_LABEL,
            cell: 'string'
          }],
          panel: pgBrowser.docker.findPanels('statistics'),
          columns: null,
          grid: null
        });

      var self = this;

      // We will listen to the visibility change of the statistics panel
      pgBrowser.Events.on(
        'pgadmin-browser:panel-statistics:' +
          wcDocker.EVENT.VISIBILITY_CHANGED,
          this.panelVisibilityChanged
      );

      pgBrowser.Events.on(
        'pgadmin:browser:node:updated', function() {
          if (this.panel && this.panel.length) {
            $(this.panel[0]).data('node-prop', '');
            this.panelVisibilityChanged(this.panel[0]);
          }
        }, this
      );

      // Hmm.. Did we find the statistics panel, and is it visible (openned)?
      // If that is the case - we need to listen the browser tree selection
      // events.
      if (this.panel.length == 0) {
        pgBrowser.Events.on(
          'pgadmin-browser:panel-statistics:' + wcDocker.EVENT.INIT,
          function() {
            self.panel = pgBrowser.docker.findPanels('statistics');
            if (self.panel[0].isVisible() ||
                self.panel.length != 1) {
              pgBrowser.Events.on(
                'pgadmin-browser:tree:selected', this.showStatistics
              );
            }
          }.bind(this)
          );
      } else {
        if (self.panel[0].isVisible() ||
            self.panel.length != 1) {
          pgBrowser.Events.on(
            'pgadmin-browser:tree:selected', this.showStatistics
          );
        }
      }
      if (self.panel.length > 0 && self.panel[0].isVisible()) {
        pgBrowser.Events.on(
            'pgadmin-browser:tree:selected', this.showStatistics
        );
      }
    },

    // Fetch the actual data and update the collection
    __updateCollection: function(url, node, item, node_type) {
      var $container = this.panel[0].layout().scene().find('.pg-panel-content'),
          $msgContainer = $container.find('.pg-panel-statistics-message'),
          $gridContainer = $container.find('.pg-panel-statistics-container'),
          collection = this.collection,
          panel = this.panel,
          self = this,
          msg = '',
          n_type = node_type;

      if (node) {
        msg = pgBrowser.messages.NODE_HAS_NO_STATISTICS;
        /* We fetch the statistics only for those node who set the parameter
         * showStatistics function.
         */

          // Avoid unnecessary reloads
          var treeHierarchy = node.getTreeNodeHierarchy(item);
          if (_.isEqual($(panel[0]).data('node-prop'), treeHierarchy)) {
            return;
          }
          // Cache the current IDs for next time
          $(panel[0]).data('node-prop', treeHierarchy);

        if (node.hasStatistics) {
          msg = '';
          var timer;
          // Set the url, fetch the data and update the collection
          $.ajax({
            url: url,
            type:'GET',
            beforeSend: function(jqXHR, settings) {
              // Generate a timer for the request
              timer = setTimeout(function(){
                // notify user if request is taking longer than 1 second

                $msgContainer.text(pgBrowser.messages['LOADING_MESSAGE']);
                $msgContainer.removeClass('hidden');
                if (self.grid) {
                  self.grid.remove();
                }
              }, 1000);
            },
            success: function(res) {
              // clear timer and reset message.
              clearTimeout(timer);
              $msgContainer.text('');
              if (res.data) {
                var data = res.data;
                if (node.hasCollectiveStatistics || data['rows'].length > 1) {
                  self.__createMultiLineStatistics.call(self, data);
                } else {
                  self.__createSingleLineStatistics.call(self, data);
                }

                if (self.grid) {
                  delete self.grid;
                  self.grid = null;
                }

                self.grid = new Backgrid.Grid({
                  columns: self.columns,
                  collection: self.collection,
                  className: GRID_CLASSES
                });
                self.grid.render();
                $gridContainer.empty();
                $gridContainer.append(self.grid.$el);

                if (!$msgContainer.hasClass('hidden')) {
                  $msgContainer.addClass('hidden')
                }
                $gridContainer.removeClass('hidden');

              } else if (res.info) {
                if (!$gridContainer.hasClass('hidden')) {
                  $gridContainer.addClass('hidden')
                }
                $msgContainer.text(res.info);
                $msgContainer.removeClass('hidden');
              }
            },
            error: function(xhr, error, message) {
              var _label = treeHierarchy[n_type].label;
              pgBrowser.Events.trigger(
                'pgadmin:node:retrieval:error', 'statistics', xhr, error, message, item
              );
              if (
                !Alertify.pgHandleItemError(xhr, error, message, {
                  item: item, info: treeHierarchy
                })
              ) {
                Alertify.pgNotifier(
                  error, xhr,
                  S(
                    pgBrowser.messages['ERR_RETRIEVAL_INFO']
                  ).sprintf(message || _label).value(),
                  function() {
                    console.log(arguments);
                  }
                );
              }
              // show failed message.
              $msgContainer.text(pgBrowser.messages['LOADING_FAILED']);
            }
          });
        }
      }
      if (msg != '') {
        // Hide the grid container and show the default message container
        if (!$gridContainer.hasClass('hidden'))
          $gridContainer.addClass('hidden');
        $msgContainer.removeClass('hidden');

        $msgContainer.text(msg);
      }
    },

    showStatistics: function(item, data, node) {
      var self = this;
      if (!node) {
        return;
      }
      /**
       * We can't start fetching the statistics immediately, it is possible -
       * the user is just using keyboards to select the node, and just
       * traversing through.
       *
       * We will wait for some time before fetching the statistics for the
       * selected node.
       **/
      if (node) {
        if (self.timeout) {
          clearTimeout(self.timeout);
        }
        self.timeout =  setTimeout(
          function() {
            self.__updateCollection.call(
              self, node.generate_url(item, 'stats', data, true), node, item, data._type
            );
          }, 400);
        }
    },

    __createMultiLineStatistics: function(data) {
      var rows = data['rows'],
          columns = data['columns'];

      this.columns = [];
      for (var idx in columns) {
        var c = columns[idx];
        this.columns.push({
          editable: false,
          name: c['name'],
          cell: typeCellMapper[c['type_code']] || 'string'
        });
      }

      this.collection.reset(rows);
    },

    __createSingleLineStatistics: function(data) {
      var row = data['rows'][0],
          columns = data['columns']
          res = [];

      this.columns = this.statistic_columns;
      for (var idx in columns) {
        name = (columns[idx])['name'];
        res.push({
          'statistics': name,
          // Check if row is undefined?
          'value': row && row[name] ? row[name] : null
        });
      }

      this.collection.reset(res);
    },

    panelVisibilityChanged: function(panel) {
      if (panel.isVisible()) {
        var t = pgBrowser.tree,
            i = t.selected(),
            d = i && t.itemData(i),
            n = i && d && pgBrowser.Nodes[d._type];

        pgBrowser.NodeStatistics.showStatistics.apply(
          pgBrowser.NodeStatistics, [i, d, n]
        );

        // We will start listening the tree selection event.
        pgBrowser.Events.on(
          'pgadmin-browser:tree:selected',
          pgBrowser.NodeStatistics.showStatistics
        );
      } else {
        // We don't need to listen the tree item selection event.
        pgBrowser.Events.off(
          'pgadmin-browser:tree:selected',
          pgBrowser.NodeStatistics.showStatistics
        );
      }
    }
  });

  return pgBrowser.NodeStatistics;
});
