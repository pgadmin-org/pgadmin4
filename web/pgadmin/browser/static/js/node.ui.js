/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([
  'sources/gettext', 'jquery', 'underscore', 'sources/pgadmin', 'backbone', 'backform',
  'alertify', 'backgrid', 'select2', 'pgadmin.browser.node',
], function(gettext, $, _, pgAdmin, Backbone, Backform, Alertify, Backgrid) {

  /*
   * Define the selectAll adapter for select2.
   *
   * Reference:
   * https://github.com/select2/select2/issues/195#issuecomment-240130634
   */
  $.fn.select2.amd.define('select2/selectAllAdapter', [
    'select2/utils',
    'select2/dropdown',
    'select2/dropdown/attachBody',
  ], function(Utils, Dropdown, AttachBody) {

    function SelectAll() {}
    SelectAll.prototype.render = function(decorated) {
      let self = this;
      let $rendered = decorated.call(this);

      let $selectAll = $([
        '<button class="btn btn-secondary btn-sm" type="button"',
        ' style="width: 49%;margin: 0 0.5%;">',
        '<i class="fa fa-check-square-o" role="img"></i>',
        '<span style="padding: 0px 5px;">',
        gettext('Select All'),
        '</span></button>',
      ].join(''));

      let $unselectAll = $([
        '<button class="btn btn-secondary btn-sm" type="button"',
        ' style="width: 49%;margin: 0 0.5%;">',
        '<i class="fa fa-square-o"></i><span style="padding: 0px 5px;" role="img">',
        gettext('Unselect All'),
        '</span></button>',
      ].join(''));

      let $btnContainer = $(
        '<div class="select2-select-all-adapter-container">'
      ).append($selectAll).append($unselectAll);

      if (!this.$element.prop('multiple')) {
        // this isn't a multi-select -> don't add the buttons!
        return $rendered;
      }
      $rendered.find('.select2-dropdown').prepend($btnContainer);
      // Select All button click
      $selectAll.on('click', function() {
        $rendered.find('.select2-results__option[aria-selected=false]').each(
          function() {
            // Note: With latest version we do not get data in the data attribute of a element
            // Hence as per new logic we will fetch the data from the cache created by Select2.
            let data = Utils.GetData($(this)[0], 'data');
            self.trigger('select', {
              data: data,
            });
          }
        );
        self.trigger('close');
      });
      // Unselect All button click
      $unselectAll.on('click', function() {
        $rendered.find('.select2-results__option[aria-selected=true]').each(
          function() {
            let data = Utils.GetData($(this)[0], 'data');
            self.trigger('unselect', {
              data: data,
            });
          }
        );
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
          placeholder: gettext('Select an item...'),
          width: 'style',
        },
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
          m = self.model.top || self.model,
          url_jump_after_node = self.field.get('url_jump_after_node') || null;

        // Hmm - we found the url option.
        // That means - we needs to fetch the options from that node.
        if (url) {
          var node = this.field.get('schema_node'),
            node_info = this.field.get('node_info'),
            with_id = this.field.get('url_with_id') || false,
            full_url = node.generate_url.apply(
              node, [
                null, url, this.field.get('node_data'), with_id, node_info, url_jump_after_node,
              ]),
            cache_level,
            cache_node = this.field.get('cache_node');

          cache_node = (cache_node && pgAdmin.Browser.Nodes[cache_node]) || node;

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
            })
              .done(function(res) {
              /*
               * We will cache this data for short period of time for avoiding
               * same calls.
               */
                data = cache_node.cache(node.type + '#' + url, node_info, cache_level, res.data);
              })
              .fail(function() {
                m.trigger('pgadmin:view:fetch:error', m, self.field);
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
          var transform = this.field.get('transform') || self.defaults.transform;
          if (transform && _.isFunction(transform)) {
            // We will transform the data later, when rendering.
            // It will allow us to generate different data based on the
            // dependencies.
            self.field.set('options', transform.bind(self, data));
          } else {
            self.field.set('options', data);
          }
        }
      },
    });

  var formatNode = function(opt) {
    if (!opt.id) {
      return opt.text;
    }

    var optimage = $(opt.element).data('image');

    if (!optimage) {
      return opt.text;
    } else {
      return $('<span></span>').append(
        $('<span></span>', {
          class: 'wcTabIcon ' + optimage,
        })
      ).append($('<span></span>').text(opt.text));
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
          filter = self.field.get('filter') || function() {
            return true;
          };

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
              'value': r._id,
              'image': image,
              'label': l,
            });
          }
        });

        return res;
      },
      select2: {
        allowClear: true,
        placeholder: gettext('Select an item...'),
        width: 'style',
        templateResult: formatNode,
        templateSelection: formatNode,
      },
    }),
  });

  Backform.NodeListByNameControl = NodeListByIdControl.extend({
    defaults: _.extend({}, NodeListByIdControl.prototype.defaults, {
      transform: function(rows) {
        var self = this,
          node = self.field.get('schema_node'),
          res = [],
          filter = self.field.get('filter') || function() {
            return true;
          };

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
              'label': l,
            });
          }
        });

        return res;
      },
    }),
  });

  /*
   * Global function to make visible  particular dom element in it's parent
   * with given class.
   */
  $.fn.pgMakeVisible = function(cls) {
    return this.each(function() {
      if (!this || !$(this.length))
        return;
      var top, p = $(this),
        hasScrollbar = function(j) {
          if (j && j.length > 0) {
            return j.get(0).scrollHeight > j.height();
          }
          return false;
        };

      // check if p is not empty
      while (p && p.length > 0) {
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
  * Global function to make visible backgrid new row
  */
  $.fn.pgMakeBackgridVisible = function(cls) {
    return this.each(function() {
      if (!this || !$(this.length))
        return;

      var elem = $(this),
        backgridDiv = $(this).offsetParent().parent(), // Backgrid div.subnode
        backgridDivTop = backgridDiv.offset().top,
        backgridDivHeight = backgridDiv.height(),
        backformTab = $(this).closest(cls), // Backform-tab
        gridScroll = null;

      if(backformTab.length == 0) {
        return false;
      }
      gridScroll = backformTab[0].offsetHeight - backgridDivTop;

      if (backgridDivHeight > gridScroll) {
        var top = elem.get(0).offsetTop + elem.height();
        backformTab.find('.tab-content').scrollTop(top);
      }
      return true;
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
        placeholder: gettext('Select an item...'),
        width: 'style',
      },
      opt: {
        label: null,
        value: null,
        image: null,
        selected: false,
      },
    }),
    template: _.template(
      '<option <% if (image) { %> data-image=<%= image %> <% } %> value="<%- value %>" <%= selected ? \'selected="selected"\' : "" %>><%- label %></option>'
    ),
    initialize: function() {
      Backgrid.Extension.Select2Cell.prototype.initialize.apply(this, arguments);

      var url = this.column.get('url') || this.defaults.url,
        is_options_cached = _.has(this.column.attributes, 'options_cached'),
        options_cached = is_options_cached && this.column.get('options_cached');
      // Hmm - we found the url option.
      // That means - we needs to fetch the options from that node.
      if (url && !options_cached) {

        var self = this,
          m = this.model,
          column = this.column,
          eventHandler = m.top || m,
          node = column.get('schema_node'),
          node_info = column.get('node_info'),
          with_id = column.get('url_with_id') || false,
          url_jump_after_node = this.column.get('url_jump_after_node') || null,
          full_url = node.generate_url.apply(
            node, [
              null, url, column.get('node_data'), with_id, node_info, url_jump_after_node,
            ]),
          cache_level,
          cache_node = column.get('cache_node');

        cache_node = (cache_node && pgAdmin.Browser.Nodes[cache_node]) || node;

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
          })
            .done(function(res) {
            /*
             * We will cache this data for short period of time for avoiding
             * same calls.
             */
              data = cache_node.cache(node.type + '#' + url, node_info, cache_level, res.data);
            })
            .fail(function() {
              eventHandler.trigger('pgadmin:view:fetch:error', m, column);
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
        var transform = column.get('transform') || self.defaults.transform;
        if (transform && _.isFunction(transform)) {
          // We will transform the data later, when rendering.
          // It will allow us to generate different data based on the
          // dependencies.
          column.set('options', transform.bind(column, data));
        } else {
          column.set('options', data);
        }

        if (is_options_cached) {
          column.set('options_cached', true);
        }
      }
    },
  });

  Backgrid.Extension.NodeListByIdCell = NodeAjaxOptionsCell.extend({
    controlClassName: 'pgadmin-node-select backgrid-cell',
    defaults: _.extend({}, NodeAjaxOptionsCell.prototype.defaults, {
      url: 'nodes',
      filter: undefined,
      transform: function(rows, control) {
        var self = control || this,
          node = self.column.get('schema_node'),
          res = [],
          filter = self.column.get('filter') || function() {
            return true;
          };

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
              'value': r._id,
              'image': image,
              'label': l,
            });
          }
        });

        return res;
      },
      select2: {
        placeholder: gettext('Select an item...'),
        width: 'style',
        templateResult: formatNode,
        templateSelection: formatNode,
      },
    }),
  });

  Backgrid.Extension.NodeListByNameCell = NodeAjaxOptionsCell.extend({
    controlClassName: 'pgadmin-node-select backgrid-cell',
    defaults: _.extend({}, NodeAjaxOptionsCell.prototype.defaults, {
      url: 'nodes',
      filter: undefined,
      transform: function(rows, control) {
        var self = control || this,
          node = self.column.get('schema_node'),
          res = [],
          filter = self.column.get('filter') || function() {
            return true;
          };

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
              'label': l,
            });
          }
        });

        return res;
      },
      select2: {
        placeholder: gettext('Select an item...'),
        width: 'style',
        templateResult: formatNode,
        templateSelection: formatNode,
      },
    }),
  });

  // Extend the browser's node model class to create a option/value pair
  Backgrid.Extension.MultiSelectAjaxCell = Backgrid.Extension.NodeAjaxOptionsCell.extend({
    defaults: _.extend({}, NodeAjaxOptionsCell.prototype.defaults, {
      transform: undefined,
      url_with_id: false,
      select2: {
        allowClear: true,
        placeholder: gettext('Select an item...'),
        width: 'style',
        multiple: true,
      },
      opt: {
        label: null,
        value: null,
        image: null,
        selected: false,
      },
    }),
    getValueFromDOM: function() {
      var res = [];

      this.$el.find('select').find(':selected').each(function() {
        res.push($(this).attr('value'));
      });

      return res;
    },
  });

  /*
   * Control to select multiple columns.
   */
  Backform.MultiSelectAjaxControl = NodeAjaxOptionsControl.extend({
    defaults: _.extend({}, NodeAjaxOptionsControl.prototype.defaults, {
      select2: {
        multiple: true,
        allowClear: true,
        width: 'style',
      },
    }),
  });

  return Backform;
});
