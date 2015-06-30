define(
   ['underscore', 'pgadmin', 'jquery'],
function(_, pgAdmin, $) {
  'use strict';

  pgAdmin.Browser = pgAdmin.Browser || {};
  pgAdmin.Browser.MenuItem = function(opts) {
    var menu_opts = [
      'name', 'label', 'priority', 'module', 'callback', 'data', 'enable',
      'category', 'target', 'url', 'icon'
    ],
    defaults = {
      url: '#',
      target: '_self',
      enable: true
    };
    _.extend(this, defaults, _.pick(opts, menu_opts));
  };

  _.extend(pgAdmin.Browser.MenuItem.prototype, {
    generate: function() {
      var url = $('<a></a>', {
          'id': this.name,
          'href': this.url,
          'target': this.target,
          'data-toggle': 'pg-menu'
        }).data('pgMenu', {
          module: this.module || pgAdmin.Browser,
          cb: this.callback,
          data: this.data
        }).addClass('menu-link');
      if (this.icon) {
        url.append($('<i></i>', {'class': this.icon}));
      }
      url.append($('<span></span>').text('  ' + this.label));

      return $('<li/>')
        .addClass('menu-item')
        .append(url);
    },
    disabled: function(o) {
      if (_.isFunction(this.enable)) return !this.enable.apply(this.module, [this.data]);
      if (_.isBoolean(this.enable)) return !this.enable;
      if (this.module && _.isBoolean(this.module[this.enable])) return !this.module[this.enable];
      if (this.module && _.isFunction(this.module[this.enable])) return !this.enable.apply(this.module, [this.data]);
      if (_.isFunction(o[this.enable])) return !this.enable.apply(o, [this.data]);

      return false;
    }
  });


  // MENU PUBLIC CLASS DEFINITION
  // ==============================
  var Menu = function (element, options) {
    this.$element  = $(element)
    this.options   = $.extend({}, Menu.DEFAULTS, options)
    this.isLoading = false
  }

  Menu.DEFAULTS = {}

  Menu.prototype.toggle = function (ev) {
    var $parent = this.$element.closest('.menu-item');
    if ($parent.hasClass('disabled')) {
      ev.preventDefault()
      return false;
    }
    var d = this.$element.data('pgMenu');
    if (d.cb) {
      var cb = d.module && d.module['callbacks'] && d.module['callbacks'][d.cb] || d.module && d.module[d.cb];
      if (cb) {
        cb.apply(d.module, [d.data]);
        ev.preventDefault()
      } else {
        pgAdmin.Browser.report_error('Developer Warning: Callback - "' + d.cb + '" not found!');
      }
    }
  }


  // BUTTON PLUGIN DEFINITION
  // ========================

  function Plugin(option, ev) {
    return this.each(function () {
      var $this   = $(this)
      var data  = $this.data('pg.menu')
      var options = typeof option == 'object' && option

      if (!data) $this.data('pg.menu', (data = new Menu(this, options)))

      data.toggle(ev)
    })
  }

  var old = $.fn.button

  $.fn.pgmenu       = Plugin
  $.fn.pgmenu.Constructor = Menu


  // BUTTON NO CONFLICT
  // ==================

  $.fn.pgmenu.noConflict = function () {
    $.fn.pgmenu = old;
    return this;
  }

  // MENU DATA-API
  // =============

  $(document)
    .on('click.pg.menu.data-api', '[data-toggle^="pg-menu"]', function (ev) {
      var $menu = $(ev.target)
      if (!$menu.hasClass('menu-link'))
        $menu = $menu.closest('.menu-link')
      Plugin.call($menu, 'toggle', ev)
    })
    .on('focus.pg.menu.data-api blur.pg.menu.data-api', '[data-toggle^="pg-menu"]',
      function (e) {
        $(e.target).closest('.menu').toggleClass('focus', /^focus(in)?$/.test(e.type))
      });

  return pgAdmin.Browser.MenuItem;
});
