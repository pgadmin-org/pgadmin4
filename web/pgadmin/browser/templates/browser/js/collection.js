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

  pgBrowser.Collection = _.extend(_.clone(pgBrowser.Node), {
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
        applies: ['object', 'context'], callback: 'refresh_node',
        priority: 1, label: '{{ _("Refresh...") }}',
        icon: 'fa fa-refresh'
      }]);
    },
    showProperties: function(item, data, panel) {
      var that = this,
        j = panel.$container.find('.obj_properties').first(),
        view = j.data('obj-view'),
        content = $('<div></div>')
          .addClass('pg-prop-content col-xs-12'),
        node = pgBrowser.Nodes[that.node],
        // This will be the URL, used for object manipulation.
        urlBase = this.generate_url('properties', data),
        collections = new (node.Collection.extend({
          url: urlBase,
          model: node.model
        }))(),
        gridSchema = Backform.generateGridColumnsFromModel(
            node.model, 'prorperties', that.columns
          ),
        // Initialize a new Grid instance
        grid = new Backgrid.Grid({
          columns: gridSchema.columns,
          collection: collections,
          className: "backgrid table-bordered"
        }),
        gridView = {
          'remove': function() {
            if (this.grid) {
              delete (this.grid);
              this.grid = null;
            }
          }
        };
        gridView.grid = grid;

      if (view) {
        // Release the view
        view.remove();
        // Deallocate the view
        delete view;
        view = null;
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
      collections.fetch({reset: true});
    },
    generate_url: function(type, d) {
      var url = pgAdmin.Browser.URL + '{TYPE}/{REDIRECT}{REF}',
        ref = S('/%s/').sprintf(d._id).value(),
        /*
         * Using list, and collections functions of a node to get the nodes
         * under the collection, and properties of the collection respectively.
         */
        opURL = {
          'nodes': 'obj', 'properties': 'coll'
        };
      if (d._type == this.type) {
        if (d.refid)
          ref = S('/%s/').sprintf(d.refid).value();
      }

      var TYPE = d.module.split(".");
      var args = {'TYPE': TYPE[TYPE.length-1], 'REDIRECT': '', 'REF': ref};
      if (type in opURL) {
        args.REDIRECT = opURL[type];
      } else {
        args.REDIRECT = type;
      }

      return url.replace(/{(\w+)}/g, function(match, arg) {
        return args[arg];
      });
    }
  });

  return pgAdmin.Browser.Collection;
});
