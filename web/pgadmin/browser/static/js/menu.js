/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([
  'underscore', 'sources/pgadmin', 'jquery', 'sources/utils', 'sources/gettext',
], function(_, pgAdmin, $, pgadminUtils, gettext) {
  'use strict';

  pgAdmin.Browser = pgAdmin.Browser || {};

  // Individual menu-item class
  var MenuItem = pgAdmin.Browser.MenuItem = function(opts) {
    var menu_opts = [
        'name', 'label', 'priority', 'module', 'callback', 'data', 'enable',
        'category', 'target', 'url' /* Do not show icon in the menus, 'icon' */ , 'node',
        'checked', 'below', 'menu_items',
      ],
      defaults = {
        url: '#',
        target: '_self',
        enable: true,
      };
    _.extend(this, defaults, _.pick(opts, menu_opts));
  };

  _.extend(pgAdmin.Browser.MenuItem.prototype, {
    /*
     *  Keeps track of the jQuery object representing this menu-item. This will
     *  be used by the update function to enable/disable the individual item.
     */
    $el: null,
    /*
     * Generate the UI for this menu-item. enable/disable, based on the
     * currently selected object.
     */
    generate: function(node, item) {
      this.create_el(node, item);

      this.context = {
        name: this.label,
        /* icon: this.icon || this.module && (this.module.type), */
        disabled: this.is_disabled,
        callback: this.context_menu_callback.bind(this, item),
      };

      return this.$el;
    },

    /*
     * Create the jquery element for the menu-item.
     */
    create_el: function(node, item) {

      if(this.menu_items) {
        _.each(this.menu_items, function(submenu_item){
          submenu_item.generate(node, item);
        });
        var create_submenu = pgAdmin.Browser.MenuGroup({
          'label': this.label,
          'id': this.name,
        }, this.menu_items);
        this.$el = create_submenu.$el;
      } else {
        var data_disabled = null;
        if(this.data != undefined && this.data.data_disabled != undefined){
          data_disabled = this.data.data_disabled;
        }
        var url = $('<a></a>', {
          'id': this.name,
          'href': this.url,
          'target': this.target,
          'data-toggle': 'pg-menu',
          'role': 'menuitem',
          'data-disabled': data_disabled,
        }).data('pgMenu', {
          module: this.module || pgAdmin.Browser,
          cb: this.callback,
          data: this.data,
        }).addClass('dropdown-item');

        this.is_disabled = this.disabled(node, item);
        if (this.icon) {
          url.append($('<i></i>', {
            'class': this.icon,
          }));
        } else if(!_.isUndefined(this.checked)) {
          url.append($('<i></i>', {
            'class': 'fa fa-check '+ (this.checked?'':'visibility-hidden'),
          }));
        }

        url.addClass((this.is_disabled ? ' disabled' : ''));

        var textSpan = $('<span data-test="menu-item-text"></span>').text('  ' + this.label);

        url.append(textSpan);

        var mnu_element = $('<li/>').append(url);
        // Check if below parameter is defined and true then we need to add
        // separator.
        if (!_.isUndefined(this.below) && this.below === true) {
          mnu_element.append('<li class="dropdown-divider"></li>');
        }

        this.$el = mnu_element;
      }

    },
    /*
     * Updates the enable/disable state of the menu-item based on the current
     * selection using the disabled function. This also creates a object
     * for this menu, which can be used in the context-menu.
     */
    update: function(node, item) {

      if (this.$el && !this.$el.find('.dropdown-item').hasClass('disabled')) {
        this.$el.find('.dropdown-item').addClass('disabled');
      }

      this.is_disabled = this.disabled(node, item);
      if (this.$el && !this.is_disabled) {
        this.$el.find('.dropdown-item').removeClass('disabled');
      }

      this.context = {
        name: this.label,
        /* icon: this.icon || (this.module && this.module.type), */
        disabled: this.is_disabled,
        callback: this.context_menu_callback.bind(this, item),
      };
    },

    /*
     * This will be called when context-menu is clicked.
     */
    context_menu_callback: function(item) {
      var o = this,
        cb;

      if (o.module['callbacks'] && (
        o.callback in o.module['callbacks']
      )) {
        cb = o.module['callbacks'][o.callback];
      } else if (o.callback in o.module) {
        cb = o.module[o.callback];
      }
      if (cb) {
        cb.apply(o.module, [o.data, item]);
      } else {
        pgAdmin.Browser.report_error(
          pgadminUtils.sprintf('Developer Warning: Callback - "%s" not found!', o.cb)
        );
      }
    },

    /*
     * Checks this menu enable/disable state based on the selection.
     */
    disabled: function(node, item) {
      if (this.enable == undefined) {
        return false;
      }

      if (this.node) {
        if (!node) {
          return true;
        }
        if (_.isArray(this.node) ? (
          _.indexOf(this.node, node) == -1
        ) : (this.node != node._type)) {
          return true;
        }
      }

      if (_.isBoolean(this.enable)) return !this.enable;
      if (_.isFunction(this.enable)) return !this.enable.apply(this.module, [node, item, this.data]);
      if (this.module && _.isBoolean(this.module[this.enable])) return !this.module[this.enable];
      if (this.module && _.isFunction(this.module[this.enable])) return !(this.module[this.enable]).apply(this.module, [node, item, this.data]);

      return false;
    },

    /*
     * Change the checked value and update the checked icon on the menu
     */
    change_checked(isChecked) {
      if(!_.isUndefined(this.checked)) {
        this.checked = isChecked;
        if(this.checked) {
          this.$el.find('.fa-check').removeClass('visibility-hidden');
        } else {
          this.$el.find('.fa-check').addClass('visibility-hidden');
        }
      }
    },
  });

  /*
   * This a class for creating a menu group, mainly used by the submenu
   * creation logic.
   *
   * Arguments:
   * 1. Options to render the submenu DOM Element.
   *    i.e. label, icon, above (separator), below (separator)
   * 2. List of menu-items comes under this submenu.
   * 3. Did we rendered separator after the menu-item/submenu?
   * 4. A unique-id for this menu-item.
   *
   * Returns a object, similar to the menu-item, which has his own jQuery
   * Element, context menu representing object, etc.
   *
   */

  pgAdmin.Browser.MenuGroup = function(opts, items, prev, ctx) {
    var template = _.template([
        '<% if (above) { %><li class="dropdown-divider"></li><% } %>',
        '<li class="dropdown-submenu" role="menuitem">',
        ' <a href="#" class="dropdown-item">',
        '  <% if (icon) { %><i class="<%= icon %>"></i><% } %>',
        '  <span><%= label %></span>',
        ' </a>',
        ' <ul class="dropdown-menu">',
        ' </ul>',
        '</li>',
        '<% if (below) { %><li class="dropdown-divider"></li><% } %>',
      ].join('\n')),
      data = {
        'label': opts.label,
        'icon': opts.icon,
        'above': opts.above && !prev,
        'below': opts.below,
      },
      m,
      $el = $(template(data)),
      $menu = $el.find('.dropdown-menu'),
      submenus = {},
      ctxId = 1;

    ctx = _.uniqueId(ctx + '_sub_');

    // Sort by alphanumeric ordered first
    items.sort(function(a, b) {
      return a.label.localeCompare(b.label);
    });
    // Sort by priority
    items.sort(function(a, b) {
      return a.priority - b.priority;
    });

    for (var idx in items) {
      m = items[idx];
      $menu.append(m.$el);
      if (!m.is_disabled) {
        submenus[ctx + ctxId] = m.context;
      }
      ctxId++;
    }

    var is_disabled = (_.size(submenus) == 0);

    return {
      $el: $el,
      priority: opts.priority || 10,
      label: opts.label,
      above: data['above'],
      below: opts.below,
      is_disabled: is_disabled,
      context: {
        name: opts.label,
        icon: opts.icon,
        items: submenus,
        disabled: is_disabled,
      },
    };
  };

  /*
   * A function to generate menus (submenus) based on the categories.
   * Attach the current selected browser tree node to each of the generated
   * menu-items.
   *
   * Arguments:
   * 1. nodes_obj - Nodes object contains each node object.
   * 2. jQuery Element on which you may want to created the menus
   * 3. list of menu-items
   * 4. categories - metadata information about the categories, based on which
   *                 the submenu (menu-group) will be created (if any).
   * 5. d - Data object for the selected browser tree item.
   * 6. item - The selected browser tree item
   * 7. menu_items - A empty object on which the context menu for the given
   *                 list of menu-items.
   *
   * Returns if any menu generated for the given input.
   */
  pgAdmin.Browser.MenuCreator = function(
    nodes_obj, $mnu, menus, categories, d, item, menu_items
  ) {
    let showMenu = true;

    /* We check showMenu function is defined by the respective node, if it is
     * defined then call the function which will return true or false.
     */
    if (d && nodes_obj[d._type] && !_.isUndefined(nodes_obj[d._type].showMenu))
      showMenu = nodes_obj[d._type].showMenu(d, item);

    if (!showMenu) {
      menu_items = menu_items || {};
      menu_items[_.uniqueId('ctx_')+ '1_1_ms'] = {
        disabled : true,
        name: gettext('No menu available for this object.'),
      };
      return;
    }

    var groups = {
        'common': [],
      },
      common, idx = 0,
      ctxId = _.uniqueId('ctx_'),
      update_menuitem = function(m) {
        if (m instanceof MenuItem) {
          if (m.$el) {
            m.$el.remove();
            delete m.$el;
          }
          m.generate(d, item);
          var group = groups[m.category || 'common'] =
            groups[m.category || 'common'] || [];
          group.push(m);
        } else {
          for (var key in m) {
            update_menuitem(m[key]);
          }
        }
      },
      ctxIdx = 1;

    for (idx in menus) {
      update_menuitem(menus[idx]);
    }

    // Not all menu creator requires the context menu structure.
    menu_items = menu_items || {};

    common = groups['common'];
    delete groups['common'];

    var prev = true;

    for (var name in groups) {
      var g = groups[name],
        c = categories[name] || {
          'label': name,
          single: false,
        },
        menu_group = pgAdmin.Browser.MenuGroup(c, g, prev, ctxId);

      if (g.length <= 1 && !c.single) {
        prev = false;
        for (idx in g) {
          common.push(g[idx]);
        }
      } else {
        prev = g.below;
        common.push(menu_group);
      }
    }

    // The menus will be created based on the priority given.
    // Menu with lowest value has the highest priority. If the priority is
    // same, then - it will be ordered by label.
    // Sort by alphanumeric ordered first
    common.sort(function(a, b) {
      return a.label.localeCompare(b.label);
    });
    // Sort by priority
    common.sort(function(a, b) {
      return a.priority - b.priority;
    });
    var len = _.size(common);

    for (idx in common) {
      item = common[idx];

      item.priority = (item.priority || 10);
      $mnu.append(item.$el);
      var prefix = ctxId + '_' + item.priority + '_' + ctxIdx;

      if (ctxIdx != 1 && item.above && !item.is_disabled) {
        // For creatign the seprator any string will do.
        menu_items[prefix + '_ma'] = '----';
      }

      if (!item.is_disabled) {
        menu_items[prefix + '_ms'] = item.context;
      }

      if (ctxId != len && item.below && !item.is_disabled) {
        menu_items[prefix + '_mz'] = '----';
      }
      ctxIdx++;
    }

    return (len > 0);
  };

  // MENU PUBLIC CLASS DEFINITION
  // ==============================
  var Menu = function(element, options) {
    this.$element = $(element);
    this.options = $.extend({}, Menu.DEFAULTS, options);
    this.isLoading = false;
  };

  Menu.DEFAULTS = {};

  Menu.prototype.toggle = function(ev) {
    var $parent = this.$element.closest('.dropdown-item');
    if ($parent.hasClass('disabled')) {
      ev.preventDefault();
      return false;
    }

    var d = this.$element.data('pgMenu');
    if (d.cb) {
      var cb = d.module && d.module['callbacks'] && d.module['callbacks'][d.cb] || d.module && d.module[d.cb];
      if (cb) {
        cb.apply(d.module, [d.data, pgAdmin.Browser.tree.selected()]);
        ev.preventDefault();
      } else {
        pgAdmin.Browser.report_error('Developer Warning: Callback - "' + d.cb + '" not found!');
      }
    }
  };


  // BUTTON PLUGIN DEFINITION
  // ========================

  function Plugin(option, ev) {
    return this.each(function() {
      var $this = $(this);
      var data = $this.data('pg.menu');
      var options = typeof option == 'object' && option;

      if (!data) $this.data('pg.menu', (data = new Menu(this, options)));

      data.toggle(ev);
    });
  }

  var old = $.fn.button;

  $.fn.pgmenu = Plugin;
  $.fn.pgmenu.Constructor = Menu;


  // BUTTON NO CONFLICT
  // ==================

  $.fn.pgmenu.noConflict = function() {
    $.fn.pgmenu = old;
    return this;
  };

  // MENU DATA-API
  // =============

  $(document)
    .on('click.pg.menu.data-api', '[data-toggle^="pg-menu"]', function(ev) {
      var $menu = $(ev.target);
      if (!$menu.hasClass('dropdown-item'))
        $menu = $menu.closest('.dropdown-item');
      Plugin.call($menu, 'toggle', ev);
    })
    .on(
      'focus.pg.menu.data-api blur.pg.menu.data-api',
      '[data-toggle^="pg-menu"]',
      function(ev) {
        $(ev.target).closest('.menu').toggleClass(
          'focus', /^focus(in)?$/.test(ev.type)
        );
      })
    .on('mouseenter', '.dropdown-submenu', function(ev) {
      $(ev.currentTarget).removeClass('dropdown-submenu-visible')
        .addClass('dropdown-submenu-visible');
      $(ev.currentTarget).find('.dropdown-menu').first().addClass('show');
    })
    .on('mouseleave', '.dropdown-submenu', function(ev) {
      $(ev.currentTarget).removeClass('dropdown-submenu-visible');
      $(ev.currentTarget).find('.dropdown-menu').first().removeClass('show');
    })
    .on('hidden.bs.dropdown', function(ev) {
      $(ev.target)
        .find('.dropdown-submenu.dropdown-submenu-visible')
        .removeClass('dropdown-submenu-visible')
        .find('.dropdown-menu.show')
        .removeClass('show');
    });

  return pgAdmin.Browser.MenuItem;
});
