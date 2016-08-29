define(
    ['jquery', 'underscore', 'underscore.string', 'pgadmin',
     'backbone', 'alertify', 'backform', 'pgadmin.backform',
     'pgadmin.backgrid', 'pgadmin.browser.node'
     ],
function($, _, S, pgAdmin, Backbone, Alertify, Backform) {

  var pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};

  // It has already been defined.
  // Avoid running this script again.
  if (pgBrowser.Collection)
    return pgBrowser.Collection;

  pgBrowser.Collection = function() {};

   _.extend(
     pgBrowser.Collection,
     _.clone(pgBrowser.Node), {
    ///////
    // Initialization function
    // Generally - used to register the menus for this type of node.
    //
    // Also, look at pgAdmin.Browser.add_menus(...) function.
    //
    // Collection will not have 'Properties' menu.
    //
    // NOTE: Override this for each node for initialization purpose
    Init: function() {
      if (this.node_initialized)
        return;
      this.node_initialized = true;
      pgAdmin.Browser.add_menus([{
        name: 'refresh', node: this.type, module: this,
        applies: ['object', 'context'], callback: 'refresh',
        priority: 1, label: '{{ _("Refresh...") }}',
        icon: 'fa fa-refresh'
      }]);

      // show query tool only in context menu of supported nodes.
      if (pgAdmin.DataGrid && pgAdmin.unsupported_nodes) {
        if (_.indexOf(pgAdmin.unsupported_nodes, this.type) == -1) {
          pgAdmin.Browser.add_menus([{
            name: 'show_query_tool', node: this.type, module: this,
            applies: ['context'], callback: 'show_query_tool',
            priority: 998, label: '{{ _("Query Tool...") }}',
            icon: 'fa fa-bolt'
          }]);
        }
      }
    },
    hasId: false,
    is_collection: true,
    collection_node: true,
    // A collection will always have a collection of statistics, when the node
    // it represent will have some statistics.
    hasCollectiveStatistics: true,
    showProperties: function(item, data, panel) {
      var that = this,
        j = panel.$container.find('.obj_properties').first(),
        view = j.data('obj-view'),
        content = $('<div></div>')
          .addClass('pg-prop-content col-xs-12'),
        node = pgBrowser.Nodes[that.node],
        // This will be the URL, used for object manipulation.
        urlBase = this.generate_url(item, 'properties', data),
        collection = new (node.Collection.extend({
          url: urlBase,
          model: node.model
        }))(),
        info = this.getTreeNodeHierarchy.apply(this, [item]),
        gridSchema = Backform.generateGridColumnsFromModel(
            info, node.model, 'properties', that.columns
          ),
        // Initialize a new Grid instance
        grid = new Backgrid.Grid({
          columns: gridSchema.columns,
          collection: collection,
          className: "backgrid table-bordered"
        }),
        gridView = {
          'remove': function() {
            if (this.grid) {
              if (this.grid.collection) {
                this.grid.collection.reset(null, {silent: true});
                delete (this.grid.collection);
              }
              delete (this.grid);
              this.grid = null;
            }
          },
          grid: grid
        };

      if (view) {
        // Avoid unnecessary reloads
        if (_.isEqual($(panel).data('node-prop'), urlBase)) {
          return;
        }

        // Cache the current IDs for next time
        $(panel).data('node-prop', urlBase);

        // Reset the data object
        j.data('obj-view', null);
      }

      // Make sure the HTML element is empty.
      j.empty();
      j.data('obj-view', gridView);

      // Render subNode grid
      content.append(grid.render().$el);
      j.append(content);

      // Fetch Data
      collection.fetch({reset: true})
      .error(function(xhr, error, message) {
        pgBrowser.Events.trigger(
          'pgadmin:collection:retrieval:error', 'properties', xhr, error, message, item, that
        );
        if (
          !Alertify.pgHandleItemError(xhr, error, message, {item: item, info: info})
        ) {
          Alertify.pgNotifier(
            error, xhr,
            S(
              "{{ _("Error retrieving properties - %s.") }}"
            ).sprintf(message || that.label).value(),
            function() {
              console.log(arguments);
            }
          );
        }
      });
    },
    generate_url: function(item, type, d) {
      var url = pgAdmin.Browser.URL + '{TYPE}/{REDIRECT}{REF}',
        /*
         * Using list, and collection functions of a node to get the nodes
         * under the collection, and properties of the collection respectively.
         */
        opURL = {
          'properties': 'obj', 'children': 'nodes'
        },
        ref = '', self = this;

      _.each(
        _.sortBy(
          _.values(
           _.pick(
            this.getTreeNodeHierarchy(item), function(v, k, o) {
              return (k != self.type);
            })
           ),
          function(o) { return o.priority; }
          ),
        function(o) {
          ref = S('%s/%s').sprintf(ref, encodeURI(o._id)).value();
        });

      var args = {
        'TYPE': self.node,
        'REDIRECT': (type in opURL ? opURL[type] : type),
        'REF': S('%s/').sprintf(ref).value()
      };

      return url.replace(/{(\w+)}/g, function(match, arg) {
        return args[arg];
      });
    }
  });

  return pgBrowser.Collection;
});
