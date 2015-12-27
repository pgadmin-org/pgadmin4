define(
    ['jquery', 'underscore', 'pgadmin', 'backbone', 'backform', 'alertify', 'pgadmin.browser.node'],
function($, _, pgAdmin, Backbone, Backform, Alertify, Node) {

  var pgBrowser = pgAdmin.Browser;

  /*
   * NodeAjaxOptionsControl
   *   This control will fetch the options required to render the select
   *   control, from the url specific to the pgAdmin.Browser node object.
   *
   *   In order to use this properly, schema require to set the 'url' property,
   *   which exposes the data for this node.
   *
   *   In case the url is not providing the data in proper format, we can
   *   specify the 'transform' function too, which will convert the fetched
   *   data to proper 'label', 'value' format.
   */
  var NodeAjaxOptionsControl = Backform.NodeAjaxOptionsControl =
      Backform.SelectControl.extend({
    defaults: _.extend(Backform.SelectControl.prototype.defaults, {
      url: undefined,
      transform: undefined
    }),
    initialize: function() {
      /*
       * Initialization from the original control.
       */
      Backform.SelectControl.prototype.initialize.apply(this, arguments);

      /*
       * We're about to fetch the options required for this control.
       */
      var self = this,
          url = self.field.get('url') || self.defaults.url,
          m = self.model.handler || self.model;

      // Hmm - we found the url option.
      // That means - we needs to fetch the options from that node.
      if (url) {
        var node = this.field.get('schema_node'),
            full_url = node.generate_url.apply(
              node, [
                null, url, this.field.get('node_data'),
                false, this.field.get('node_info')
              ]),
            /*
             * We needs to check, if we have already cached data for this url.
             * If yes - use that, and do not bother about fetching it again,
             * and use it.
             */
            data = node.cache(full_url);
        if (_.isUndefined(data) || _.isNull(data)) {
          m.trigger('pgadmin-view:fetching', m, self.field);
          $.ajax({
            async: false,
            url: full_url,
            success: function(res) {
              /*
               * We will cache this data for short period of time for avoiding
               * same calls.
               */
              data = node.cache(full_url, res.data);
            },
            error: function() {
              m.trigger('pgadmin-view:fetch:error', m, self.field);
            }
          });
          m.trigger('pgadmin-view:fetched', m, self.field);
        }

        /*
         * Transform the data
         */
        transform = this.field.get('transform') || self.defaults.transform;
        if (transform && _.isFunction(transform)) {
          try {
            data = transform.apply(self, [data]);
          } catch(e) {
            // Do nothing
            data = []
            m.trigger('pgadmin-view:transform:error', m, self.field, e);
          }
        }
        self.field.set('options', data);
      }
    }
  });

  var NodeListByIdControl = Backform.NodeListByIdControl = NodeAjaxOptionsControl.extend({
    controlClassName: 'pgadmin-node-select form-control',
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>"><%=label%></label>',
      '<div class="<%=Backform.controlsClassName%> <%=extraClasses.join(\' \')%>">',
      '  <select class="pgadmin-node-select form-control" name="<%=name%>" value="<%-value%>" <%=disabled ? "disabled" : ""%> <%=required ? "required" : ""%> >',
      '    <% if (first_empty) { %>',
      '    <option value="" <%="" === rawValue ? "selected=\'selected\'" : "" %>><%- empty_value %></option>',
      '    <% } %>',
      '    <% for (var i=0; i < options.length; i++) { %>',
      '    <% var option = options[i]; %>',
      '    <% if (!_.isUndefined(option.node)) { %>',
      '    <option value="<%-formatter.fromRaw(option.value)%>" <%=option.value === rawValue ? "selected=\'selected\'" : "" %> node="<%=option.node%>"><%-option.label%></option>',
      '    <% } else { %>',
      '    <option value="<%-formatter.fromRaw(option.value)%>" <%=option.value === rawValue ? "selected=\'selected\'" : "" %>><%-option.label%></option>',
      '    <% } %>',
      '    <% } %>',
      '  </select>',
      '</div>'].join("\n")),
    defaults: _.extend(NodeAjaxOptionsControl.prototype.defaults, {
      first_empty: true,
      empty_value: '-- None --',
      url: 'nodes',
      transform: function(rows) {
        var self = this,
            node = self.field.get('schema_node'),
            res = [];

        _.each(rows, function(r) {
          res.push({
            'value': r._id,
            'node': _.isFunction(node['node_image']) ? (node['node_image']).apply(node, [r, self.model]) : node.type,
            'label': (_.isFunction(node['node_label']) ?
              (node['node_label']).apply(node, [r, self.model]) :
              r.label)
          });
        });

        return res;
      }
    })
  });


  var NodeListByNameControl = Backform.NodeListByNameControl = NodeListByIdControl.extend({
    defaults: _.extend(NodeListByIdControl.prototype.defaults, {
      transform: function(rows) {
        var self = this,
            node = self.field.get('schema_node'),
            res = [];

        _.each(rows, function(r) {
          var l = _.isFunction(node['node_label']) ?
            (node['node_label']).apply(node, [r, self.model]) :
            r.label;
          res.push({
            'value': l,
            'node': _.isFunction(node['node_image']) ? (node['node_image']).apply(node, [r, self.model]) : node.type,
            'label': l
          });
        });

        return res;
      }
    })
  });

  return Backform.NodeListControl;
});
