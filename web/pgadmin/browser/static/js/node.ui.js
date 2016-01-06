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
      transform: undefined,
      url_with_id: false
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
            node_info = this.field.get('node_info'),
            full_url = node.generate_url.apply(
              node, [
                null, url, this.field.get('node_data'),
                this.field.get('url_with_id') || false, node_info
              ]),
            cache_level = this.field.get('cache_level'),
            /*
             * We needs to check, if we have already cached data for this url.
             * If yes - use that, and do not bother about fetching it again,
             * and use it.
             */
            data = node.cache(url, node_info, cache_level);
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
              data = node.cache(url, node_info, cache_level, res.data);
            },
            error: function() {
              m.trigger('pgadmin-view:fetch:error', m, self.field);
            }
          });
          m.trigger('pgadmin-view:fetched', m, self.field);
        }
        // To fetch only options from cache, we do not need time from 'at'
        // attribute but only options.
        //
        // It is feasible that the data may not have been fetched.
        data = (data && data.data) || [];

        /*
         * Transform the data
         */
        transform = this.field.get('transform') || self.defaults.transform;
        if (transform && _.isFunction(transform)) {
          // We will transform the data later, when rendering.
          // It will allow us to generate different data based on the
          // dependencies.
          self.field.set('options', transform.bind(self, data));
        } else {
          self.field.set('options', data);
        }
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
      filter: undefined,
      transform: function(rows) {
        var self = this,
            node = self.field.get('schema_node'),
            res = [],
            filter = self.field.get('filter') || function() { return true; };

        filter = filter.bind(self);

        _.each(rows, function(r) {
          if (filter(r)) {
            var l = (_.isFunction(node['node_label']) ?
                  (node['node_label']).apply(node, [r, self.model, self]) :
                  r.label),
                image= (_.isFunction(node['node_image']) ?
                  (node['node_image']).apply(node, [r, self.model, self]) : node.type);
            res.push({
              'value': r._id,
              'node': image,
              'label': l
            });
          }
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
            res = [],
            filter = self.field.get('filter') || function() { return true; };

        filter = filter.bind(self);

        _.each(rows, function(r) {
          if (filter(r)) {
            var l = (_.isFunction(node['node_label']) ?
                  (node['node_label']).apply(node, [r, self.model, self]) :
                  r.label),
                image= (_.isFunction(node['node_image']) ?
                  (node['node_image']).apply(node, [r, self.model, self]) : node.type);
            res.push({
              'value': r.label,
              'node': image,
              'label': l
            });
          }
        });

        return res;
      }
    })
  });

  return Backform.NodeListControl;
});
