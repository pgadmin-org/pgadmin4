define([
  'jquery', 'underscore', 'pgadmin', 'backbone', 'backform', 'alertify',
  'pgadmin.browser.node', 'pgadmin.browser.messages'
],
function($, _, pgAdmin, Backbone, Backform, Alertify, Node) {

  var pgBrowser = pgAdmin.Browser;

  /*
   * Define the selectAll adapter for select2.
   *
   * Reference:
   * https://github.com/select2/select2/issues/195#issuecomment-240130634
   */
  $.fn.select2.amd.define('select2/selectAllAdapter', [
    'select2/utils',
    'select2/dropdown',
    'select2/dropdown/attachBody'
  ], function (Utils, Dropdown, AttachBody) {

    function SelectAll() { }
    SelectAll.prototype.render = function (decorated) {
      var self = this,
        $rendered = decorated.call(this),
        $selectAll = $([
          '<button class="btn btn-xs btn-default" type="button"',
          ' style="width: 49%;margin: 0 0.5%;">',
          '<i class="fa fa-check-square-o"></i>',
          '<span style="padding: 0px 5px;">',
          pgAdmin.Browser.messages['SELECT_ALL'],
          '</span></button>'
        ].join('')),
        $unselectAll = $([
          '<button class="btn btn-xs btn-default" type="button"',
          ' style="width: 49%;margin: 0 0.5%;">',
          '<i class="fa fa-square-o"></i><span style="padding: 0px 5px;">',
          pgAdmin.Browser.messages['UNSELECT_ALL'],
          '</span></button>'
        ].join('')),
        $btnContainer = $(
          '<div style="padding: 3px 0px; background-color: #2C76B4; margin-bottom: 3px;">'
        ).append($selectAll).append($unselectAll);

      if (!this.$element.prop("multiple")) {
        // this isn't a multi-select -> don't add the buttons!
        return $rendered;
      }
      $rendered.find('.select2-dropdown').prepend($btnContainer);
      $selectAll.on('click', function (e) {
        var $results = $rendered.find('.select2-results__option[aria-selected=false]');
        $results.each(function () {
          self.trigger('select', {
            data: $(this).data('data')
          });
        });
        self.trigger('close');
      });
      $unselectAll.on('click', function (e) {
        var $results = $rendered.find('.select2-results__option[aria-selected=true]');
        $results.each(function () {
          self.trigger('unselect', {
            data: $(this).data('data')
          });
        });
        self.trigger('close');
      });
      return $rendered;
    };

    return Utils.Decorate(
      Utils.Decorate(
        Dropdown,
        AttachBody
      ),
      SelectAll
    );
  });

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
      Backform.Select2Control.extend({
    defaults: _.extend(Backform.Select2Control.prototype.defaults, {
      url: undefined,
      transform: undefined,
      url_with_id: false,
      select2: {
        allowClear: true,
        placeholder: 'Select from the list',
        width: 'style'
      }
    }),
    initialize: function() {
      /*
       * Initialization from the original control.
       */
      Backform.Select2Control.prototype.initialize.apply(this, arguments);

      /*
       * We're about to fetch the options required for this control.
       */
      var self = this,
          url = self.field.get('url') || self.defaults.url,
          m = self.model.top || self.model;

      // Hmm - we found the url option.
      // That means - we needs to fetch the options from that node.
      if (url) {
        var node = this.field.get('schema_node'),
            node_info = this.field.get('node_info'),
            with_id = this.field.get('url_with_id') || false,
            full_url = node.generate_url.apply(
              node, [
                null, url, this.field.get('node_data'), with_id, node_info
              ]),
            cache_level,
            cache_node = this.field.get('cache_node');

        cache_node = (cache_node && pgAdmin.Browser.Nodes['cache_node']) || node;

        if (this.field.has('cache_level')) {
          cache_level = this.field.get('cache_level');
        } else {
          cache_level = cache_node.cache_level(node_info, with_id);
        }

        /*
         * We needs to check, if we have already cached data for this url.
         * If yes - use that, and do not bother about fetching it again,
         * and use it.
         */
        var data = cache_node.cache(node.type + '#' + url, node_info, cache_level);

        if (this.field.get('version_compatible') &&
            (_.isUndefined(data) || _.isNull(data))) {
          m.trigger('pgadmin:view:fetching', m, self.field);
          $.ajax({
            async: false,
            url: full_url,
            success: function(res) {
              /*
               * We will cache this data for short period of time for avoiding
               * same calls.
               */
              data = cache_node.cache(node.type + '#' + url, node_info, cache_level, res.data);
            },
            error: function() {
              m.trigger('pgadmin:view:fetch:error', m, self.field);
            }
          });
          m.trigger('pgadmin:view:fetched', m, self.field);
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

  var formatNode = function(opt) {
    if (!opt.id) {
      return opt.text;
    }

    var optimage = $(opt.element).data('image');

    if(!optimage){
      return opt.text;
    } else {
      return $('<span></span>').append(
        $('<span></span>', {class: "wcTabIcon " + optimage})
      ).append(
        $('<span></span>').text(opt.text)
      );
    }
  };

  var NodeListByIdControl = Backform.NodeListByIdControl = NodeAjaxOptionsControl.extend({
    controlClassName: 'pgadmin-node-select form-control',
    defaults: _.extend({}, NodeAjaxOptionsControl.prototype.defaults, {
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
                  (node['node_image']).apply(
                    node, [r, self.model, self]
                    ) :
                  (node['node_image'] || ('icon-' + node.type)));

            res.push({
              'value': r._id,
              'image': image,
              'label': l
            });
          }
        });

        return res;
      },
      select2: {
        allowClear: true,
        placeholder: 'Select from the list',
        width: 'style',
        templateResult: formatNode,
        templateSelection: formatNode
      }
    })
  });


  var NodeListByNameControl = Backform.NodeListByNameControl = NodeListByIdControl.extend({
    defaults: _.extend({}, NodeListByIdControl.prototype.defaults, {
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
                image = (_.isFunction(node['node_image']) ?
                  (node['node_image']).apply(
                    node, [r, self.model, self]
                    ) :
                  (node['node_image'] || ('icon-' + node.type)));
            res.push({
              'value': r.label,
              'image': image,
              'label': l
            });
          }
        });

        return res;
      }
    })
  });

  /*
   * Global function to make visible  particular dom element in it's parent
   * with given class.
   */
  $.fn.pgMakeVisible = function( cls ) {
    return this.each(function() {
      if (!this || !$(this.length))
        return;
      var top, p = $(this), hasScrollbar = function(j) {
        if (j && j.length > 0) {
          return j.get(0).scrollHeight > j.height();
        }
        return false;
      };

      // check if p is not empty
      while(p && p.length > 0) {
        top = p.get(0).offsetTop + p.height();
        p = p.parent();
        if (hasScrollbar(p)) {
          p.scrollTop(top);
        }
        if (p.hasClass(cls)) //'backform-tab'
          return;
      }
    });
  };


  /*
   * NodeAjaxOptionsCell
   *   This cell will fetch the options required to render the select
   *   cell, from the url specific to the pgAdmin.Browser node object.
   *
   *   In order to use this properly, schema require to set the 'url' property,
   *   which exposes the data for this node.
   *
   *   In case the url is not providing the data in proper format, we can
   *   specify the 'transform' function too, which will convert the fetched
   *   data to proper 'label', 'value' format.
   */
  var NodeAjaxOptionsCell = Backgrid.Extension.NodeAjaxOptionsCell = Backgrid.Extension.Select2Cell.extend({
    defaults: _.extend({}, Backgrid.Extension.Select2Cell.prototype.defaults, {
      url: undefined,
      transform: undefined,
      url_with_id: false,
      select2: {
        allowClear: true,
        placeholder: 'Select from the list',
        width: 'style'
      },
      opt: {
        label: null,
        value: null,
        image: null,
        selected: false
       }
    }),
    template: _.template(
      '<option <% if (image) { %> data-image=<%= image %> <% } %> value="<%- value %>" <%= selected ? \'selected="selected"\' : "" %>><%- label %></option>'
    ),
    initialize: function () {
      Backgrid.Extension.Select2Cell.prototype.initialize.apply(this, arguments);

      var url = this.column.get('url') || this.defaults.url,
          options_cached = this.column.get('options_cached');

      // Hmm - we found the url option.
      // That means - we needs to fetch the options from that node.
      if (url && !options_cached) {

        var self = this,
            m = this.model, column = this.column,
            eventHandler = m.top || m,
            node = column.get('schema_node'),
            node_info = column.get('node_info'),
            with_id = column.get('url_with_id') || false,
            full_url = node.generate_url.apply(
              node, [
                null, url, column.get('node_data'), with_id, node_info
              ]),
            cache_level,
            cache_node = column.get('cache_node');

        cache_node = (cache_node && pgAdmin.Browser.Nodes['cache_node']) || node;

        if (column.has('cache_level')) {
          cache_level = column.get('cache_level');
        } else {
          cache_level = cache_node.cache_level(node_info, with_id);
        }

        /*
         * We needs to check, if we have already cached data for this url.
         * If yes - use that, and do not bother about fetching it again,
         * and use it.
         */
        var data = cache_node.cache(node.type + '#' + url, node_info, cache_level);

        if (column.get('version_compatible') &&
            (_.isUndefined(data) || _.isNull(data))) {
          eventHandler.trigger('pgadmin:view:fetching', m, column);
          $.ajax({
            async: false,
            url: full_url,
            success: function(res) {
              /*
               * We will cache this data for short period of time for avoiding
               * same calls.
               */
              data = cache_node.cache(node.type + '#' + url, node_info, cache_level, res.data);
            },
            error: function() {
              eventHandler.trigger('pgadmin:view:fetch:error', m, column);
            }
          });
          eventHandler.trigger('pgadmin:view:fetched', m, column);
        }
        // To fetch only options from cache, we do not need time from 'at'
        // attribute but only options.
        //
        // It is feasible that the data may not have been fetched.
        data = (data && data.data) || [];

        /*
         * Transform the data
         */
        transform = column.get('transform') || self.defaults.transform;
        if (transform && _.isFunction(transform)) {
          // We will transform the data later, when rendering.
          // It will allow us to generate different data based on the
          // dependencies.
          column.set('options', transform.bind(column, data));
        } else {
          column.set('options', data);
        }
        column.set('options_cached', true);
      }
    }
  });

  var NodeListByIdCell =  Backgrid.Extension.NodeListByIdCell = NodeAjaxOptionsCell.extend({
    controlClassName: 'pgadmin-node-select backgrid-cell',
    defaults: _.extend({}, NodeAjaxOptionsCell.prototype.defaults, {
      url: 'nodes',
      filter: undefined,
      transform: function(rows, control) {
        var self = control || this,
            node = self.column.get('schema_node'),
            res = [],
            filter = self.column.get('filter') || function() { return true; };

        filter = filter.bind(self);

        _.each(rows, function(r) {
          if (filter(r)) {
            var l = (_.isFunction(node['node_label']) ?
                  (node['node_label']).apply(node, [r, self.model, self]) :
                  r.label),
                image= (_.isFunction(node['node_image']) ?
                  (node['node_image']).apply(
                    node, [r, self.model, self]
                    ) :
                  (node['node_image'] || ('icon-' + node.type)));

            res.push({
              'value': r._id,
              'image': image,
              'label': l
            });
          }
        });

        return res;
      },
      select2: {
        placeholder: 'Select from the list',
        width: 'style',
        templateResult: formatNode,
        templateSelection: formatNode
      }
    })
  });


  var NodeListByNameCell =  Backgrid.Extension.NodeListByNameCell = NodeAjaxOptionsCell.extend({
    controlClassName: 'pgadmin-node-select backgrid-cell',
    defaults: _.extend({}, NodeAjaxOptionsCell.prototype.defaults, {
      url: 'nodes',
      filter: undefined,
      transform: function(rows, control) {
        var self = control || this,
            node = self.column.get('schema_node'),
            res = [],
            filter = self.column.get('filter') || function() { return true; };

        filter = filter.bind(self);

        _.each(rows, function(r) {
          if (filter(r)) {
            var l = (_.isFunction(node['node_label']) ?
                  (node['node_label']).apply(node, [r, self.model, self]) :
                  r.label),
                image= (_.isFunction(node['node_image']) ?
                  (node['node_image']).apply(
                    node, [r, self.model, self]
                    ) :
                  (node['node_image'] || ('icon-' + node.type)));

            res.push({
              'value': r.label,
              'image': image,
              'label': l
            });
          }
        });

        return res;
      },
      select2: {
        placeholder: 'Select from the list',
        width: 'style',
        templateResult: formatNode,
        templateSelection: formatNode
      }
    })
  });

    // Extend the browser's node model class to create a option/value pair
  var MultiSelectAjaxCell = Backgrid.Extension.MultiSelectAjaxCell = Backgrid.Extension.NodeAjaxOptionsCell.extend({
    defaults: _.extend({}, NodeAjaxOptionsCell.prototype.defaults, {
      transform: undefined,
      url_with_id: false,
      select2: {
        allowClear: true,
        placeholder: 'Select from the list',
        width: 'style',
        multiple: true
      },
      opt: {
        label: null,
        value: null,
        image: null,
        selected: false
       }
    }),
    getValueFromDOM: function() {
      var res = [];

      this.$el.find("select").find(':selected').each(function() {
        res.push($(this).attr('value'));
      });

      return res;
    },
  });

  /*
   * Control to select multiple columns.
   */
  var MultiSelectAjaxControl = Backform.MultiSelectAjaxControl = NodeAjaxOptionsControl.extend({
    defaults: _.extend({}, NodeAjaxOptionsControl.prototype.defaults, {
      select2: {
        multiple: true,
        allowClear: true,
        width: 'style'
      }
    })
  });

  return Backform;
});
