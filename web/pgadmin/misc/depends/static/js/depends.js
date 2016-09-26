define([
  'underscore', 'underscore.string', 'jquery', 'pgadmin.browser',
  'alertify', 'pgadmin.alertifyjs', 'pgadmin.browser.messages',
], function(_, S, $, pgBrowser, Alertify) {

  if (pgBrowser.ShowNodeDepends)
    return pgBrowser.ShowNodeDepends;

  pgBrowser.ShowNodeDepends = pgBrowser.ShowNodeDepends || {};

  _.extend(pgBrowser.ShowNodeDepends, {
    init: function() {
      if (this.initialized) {
        return;
      }

      this.initialized = true;
      /* Parameter is used to set the proper label of the
       * backgrid header cell.
       */
      var dependent = true,
          dependentGrid = null,  // Refer to the backgrid object render under Dependents tab
          dependenciesGrid = null; // Refer to the backgrid object render under Dependencies tab

      _.bindAll(this, 'showDependents', 'dependentsPanelVisibilityChanged',
         'showDependencies', 'dependenciesPanelVisibilityChanged', '__updateCollection'
      );

      // We will listened to the visibility change of the Dependencies and Dependents panel
      pgBrowser.Events.on('pgadmin-browser:panel-dependencies:' + wcDocker.EVENT.VISIBILITY_CHANGED,
                        this.dependenciesPanelVisibilityChanged);
      pgBrowser.Events.on('pgadmin-browser:panel-dependents:' + wcDocker.EVENT.VISIBILITY_CHANGED,
                        this.dependentsPanelVisibilityChanged);

      // Defining Backbone Model for Dependencies and Dependents.
      var Model = Backbone.Model.extend({
        defaults: {
          icon: 'icon-unknown',
          type: undefined,
          name: undefined,
          /* field contains 'Database Name' for 'Tablespace and Role node',
           * for other node it contains 'Restriction'.
           */
          field: undefined
        },
        // This function is used to fetch/set the icon for the type(Function, Role, Database, ....)
        parse: function(res) {
          var node = pgBrowser.Nodes[res.type];
          res.icon = node ? (_.isFunction(node['node_image']) ?
                  (node['node_image']).apply(node, [null, null]) :
                  (node['node_image'] || ('icon-' + res.type))) :
                  ('icon-' + res.type);
          res.type = S.titleize(res.type.replace(/_/g, " "), true);
          return res;
        }
      });

      // Defining Backbone Collection for Dependents.
      this.dependentCollection = new (Backbone.Collection.extend({
        model: Model
      }))(null);

      // Defining Backbone Collection for Dependencies.
      this.dependenciesCollection = new (Backbone.Collection.extend({
        model: Model
      }))(null);

      var self = this;

      /* Function is used to create and render backgrid with
       * empty collection. We just want to add backgrid into the
       * panel only once.
       */
      var appendGridToPanel = function(collection, panel, is_dependent) {
        var $container = panel[0].layout().scene().find('.pg-panel-content'),
            $gridContainer = $container.find('.pg-panel-depends-container'),
            grid = new Backgrid.Grid({
              columns: [
                {
                  name : 'type',
                  label: 'Type',
                  // Extend it to render the icon as per the type.
                  cell: Backgrid.Cell.extend({
                    render: function() {
                      Backgrid.Cell.prototype.render.apply(this, arguments);
                      this.$el.prepend($('<i>', {class: "wcTabIcon " + this.model.get('icon')}));
                      return this;
                    }
                  }),
                  editable: false
                },
                {
                  name : 'name',
                  label: 'Name',
                  cell: 'string',
                  editable: false
                },
                {
                  name : 'field',
                  label: '',  // label kept blank, it will change dynamically
                  cell: 'string',
                  editable: false
                }
              ],

              collection: collection,
              className: "backgrid presentation table backgrid-striped table-bordered table-hover",
            });

        // Condition is used to save grid object to change the label of the header.
        if (is_dependent)
          self.dependentGrid = grid;
        else
          self.dependenciesGrid = grid;

        $gridContainer.append(grid.render().el);

        return true;
      };

      // We will listened to the visibility change of the Dependencies and Dependents panel
      pgBrowser.Events.on('pgadmin-browser:panel-dependencies:' + wcDocker.EVENT.VISIBILITY_CHANGED,
                        this.dependenciesPanelVisibilityChanged);
      pgBrowser.Events.on('pgadmin-browser:panel-dependents:' + wcDocker.EVENT.VISIBILITY_CHANGED,
                        this.dependentsPanelVisibilityChanged);
      pgBrowser.Events.on(
        'pgadmin:browser:node:updated', function() {
          if (this.dependenciesPanels && this.dependenciesPanels.length) {
            $(this.dependenciesPanels[0]).data('node-prop', '');
            this.dependenciesPanelVisibilityChanged(this.dependenciesPanels[0]);
          }
          if (this.dependentsPanels && this.dependentsPanels.length) {
            $(this.dependentsPanels[0]).data('node-prop', '');
            this.dependentsPanelVisibilityChanged(this.dependentsPanels[0]);
          }
        }, this
      );

      // We will render the grid objects in the panel after some time, because -
      // it is possible, it is not yet available.
      // Find the panels to render the grid.
      var dependenciesPanels = this.dependenciesPanels = pgBrowser.docker.findPanels('dependencies');
      var dependentsPanels = this.dependentsPanels = pgBrowser.docker.findPanels('dependents');

      if (dependenciesPanels.length == 0) {
        pgBrowser.Events.on(
          'pgadmin-browser:panel-dependencies:' + wcDocker.EVENT.INIT,
          function() {
            this.dependenciesPanels = pgBrowser.docker.findPanels('dependencies');
            appendGridToPanel(this.dependenciesCollection, this.dependenciesPanels, false);

            // If Dependencies panel exists and is focused then we need to listen the browser tree selection events.
            if ((dependenciesPanels[0].isVisible()) || dependenciesPanels.length != 1) {
            pgBrowser.Events.on('pgadmin-browser:tree:selected', this.showDependencies);
            }
          }.bind(this)
          );
      } else {
        appendGridToPanel(this.dependenciesCollection, this.dependenciesPanels, false);

        // If Dependencies panel exists and is focused then we need to listen the browser tree selection events.
        if ((dependenciesPanels[0].isVisible()) || dependenciesPanels.length != 1) {
          pgBrowser.Events.on('pgadmin-browser:tree:selected', this.showDependencies);
        }
      }

      if (dependentsPanels.length == 0) {
        pgBrowser.Events.on(
          'pgadmin-browser:panel-dependents:' + wcDocker.EVENT.INIT,
          function() {
            this.dependentsPanels = pgBrowser.docker.findPanels('dependents');
            appendGridToPanel(this.dependentCollection, this.dependentsPanels, true);

            // If Dependents panel exists and is focused then we need to listen the browser tree selection events.
            if ((dependentsPanels[0].isVisible()) || dependentsPanels.length != 1) {
              pgBrowser.Events.on('pgadmin-browser:tree:selected', this.showDependents);
            }
          }.bind(this)
          );
      } else {
        appendGridToPanel(this.dependentCollection, this.dependentsPanels, true);

        // If Dependents panel exists and is focused then we need to listen the browser tree selection events.
        if ((dependentsPanels[0].isVisible()) || dependentsPanels.length != 1) {
          pgBrowser.Events.on('pgadmin-browser:tree:selected', this.showDependents);
        }
      }
    },

    // Fetch the actual data and update the collection
    __updateCollection: function(collection, panel, url, messages, node, item, type) {
      var msg = messages[0],
          $container = panel[0].layout().scene().find('.pg-panel-content'),
          $msgContainer = $container.find('.pg-panel-depends-message'),
          $gridContainer = $container.find('.pg-panel-depends-container');
          treeHierarchy = node.getTreeNodeHierarchy(item),
          n_value = -1,
          n_type = type;

      // Avoid unnecessary reloads
      if (_.isEqual($(panel[0]).data('node-prop'), treeHierarchy)) {
        return;
      }

      // Cache the current IDs for next time
      $(panel[0]).data('node-prop', treeHierarchy);

      // Hide the grid container and show the default message container
      if (!$gridContainer.hasClass('hidden'))
        $gridContainer.addClass('hidden');
      $msgContainer.removeClass('hidden');

      if (node) {
        msg = messages[1];
        /* We fetch the Dependencies and Dependents tab only for
         * those node who set the parameter hasDepends to true.
         */
        if (node.hasDepends) {
          /* Set the message because ajax request may take time to
           * fetch the information from the server.
           */
          msg = messages[2];
          $msgContainer.text(msg);

          /* Updating the label for the 'field' type of the backbone model.
           * Label should be "Database" if the node type is tablespace or role
           * and dependent tab is selected. For other nodes and dependencies tab
           * it should be 'Restriction'.
           */
          if (this.dependent && (node.type == 'tablespace' || node.type == 'role'))
            this.dependentGrid.columns.models[2].set({'label': 'Database'});
          else {
            this.dependenciesGrid.columns.models[2].set({'label': 'Restriction'});
            this.dependentGrid.columns.models[2].set({'label': 'Restriction'});
          }

          // Hide message container and show grid container.
          $msgContainer.addClass('hidden');
          $gridContainer.removeClass('hidden');

          var timer = setTimeout(function(){
            // notify user if request is taking longer than 1 second

            $msgContainer.text(pgBrowser.messages['LOADING_MESSAGE']);
            $msgContainer.removeClass('hidden');
            if ($gridContainer) {
              $gridContainer.addClass('hidden');
            }
          }, 1000);

          // Set the url, fetch the data and update the collection
          collection.url = url;
          collection.fetch({
            reset: true,
            success: function() {
              clearTimeout(timer);
              $gridContainer.removeClass('hidden');
              if (!$msgContainer.hasClass('hidden')) {
                $msgContainer.addClass('hidden');
              }
            },
            error: function(coll, xhr, error, message) {
              var _label = treeHierarchy[n_type].label;
              pgBrowser.Events.trigger(
                'pgadmin:node:retrieval:error', 'depends', xhr, error, message
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
        $msgContainer.text(msg);
      }
    },
    showDependents: function(item, data, node) {
      /**
       * We can't start fetching the Dependents immediately, it is possible the user
       * is just using the keyboard to select the node, and just traversing
       * through. We will wait for some time before fetching the Dependents
       **/
      var self = this;
      if (!node) {
        return;
      }
      self.dependent = true;
      if (self.timeout) {
        clearTimeout(self.timeout);
      }
      self.timeout =  setTimeout(
        self.__updateCollection(
          self.dependentCollection,
          self.dependentsPanels,
          node.generate_url(item, 'dependent', data, true),
          ['No object selected.', 'No dependent information is available for the current object.',
            'Fetching dependent information from the server...'],
          node,
          item,
          data._type
        ), 400
      );
    },
    dependentsPanelVisibilityChanged: function(panel) {
      if (panel.isVisible()) {
        var t = pgBrowser.tree,
            i = t.selected(),
            d = i && t.itemData(i),
            n = i && d && pgBrowser.Nodes[d._type];

        pgBrowser.ShowNodeDepends.showDependents.apply(pgBrowser.ShowNodeDepends, [i, d, n]);

        // We will start listening the tree selection event.
        pgBrowser.Events.on('pgadmin-browser:tree:selected', pgBrowser.ShowNodeDepends.showDependents);
      } else {

        // We don't need to listen the tree item selection event.
        pgBrowser.Events.off('pgadmin-browser:tree:selected', pgBrowser.ShowNodeDepends.showDependents);
      }
    },
    showDependencies: function(item, data, node) {
      /**
       * We can't start fetching the Dependencies immediately, it is possible the user
       * is just using the keyboard to select the node, and just traversing
       * through. We will wait for some time before fetching the Dependencies
       **/
      var self = this;
      if (!node) {
        return;
      }
      self.dependent = false;
      if (self.timeout) {
        clearTimeout(self.timeout);
      }
      self.timeout =  setTimeout(
        self.__updateCollection(
          self.dependenciesCollection,
          self.dependenciesPanels,
          node.generate_url(item, 'dependency', data, true),
          ['Please select an object in the tree view.', 'No dependency information is available for the current object.',
            'Fetching dependency information from the server...'],
          node,
          item,
          data._type
        ), 400
      );
    },
    dependenciesPanelVisibilityChanged: function(panel) {
      if (panel.isVisible()) {
        var t = pgBrowser.tree,
            i = t.selected(),
            d = i && t.itemData(i),
            n = i && d && pgBrowser.Nodes[d._type];

        pgBrowser.ShowNodeDepends.showDependencies.apply(pgBrowser.ShowNodeDepends, [i, d, n]);

        // We will start listening the tree selection event.
        pgBrowser.Events.on('pgadmin-browser:tree:selected', pgBrowser.ShowNodeDepends.showDependencies);
      } else {
        // We don't need to listen the tree item selection event.
        pgBrowser.Events.off('pgadmin-browser:tree:selected', pgBrowser.ShowNodeDepends.showDependencies);
      }
    }
  });

  return pgBrowser.ShowNodeDepends;
});
