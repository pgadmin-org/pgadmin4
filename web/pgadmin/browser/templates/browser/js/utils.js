/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

{% macro A_MENU_ITEM(key, item) -%}
{
  name: "{{ item.name }}",
  {% if item.module %}module: {{ item.module }},
  {% endif %}{% if item.url %}url: "{{ item.url }}",
  {% endif %}{% if item.target %}target: "{{ item.target }}",
  {% endif %}{% if item.callback %}callback: "{{ item.callback }}",
  {% endif %}{% if item.category %}category: "{{ item.category }}",
  {% endif %}{% if item.icon %}icon: "{{ item.icon }}",
  {% endif %}{% if item.data %}data: {{ item.data }},
  {% endif %}label: "{{ item.label }}", applies: ["{{ key.lower() }}"],
  priority: {{ item.priority }},
  enable: "{{ item.enable }}",
  {% if item.checked is defined %}checked: {% if item.checked %}true{% else %}false{% endif %},
  {% endif %}
  {% if item.below is defined %}below: {% if item.below %}true{% else %}false{% endif %},
  {% endif %}
  {% if item.menu_items %}menu_items: {{MENU_ITEMS(key, item.menu_items)}}
  {% endif %}
}
{%- endmacro %}

{% macro MENU_ITEMS(key, items) -%}
[
  {% for item in items %}{% if loop.index != 1 %}, {% endif %}
    {{ A_MENU_ITEM(key, item) }}{% set hasMenus = True %}{% endfor %}
]
{%- endmacro %}

define('pgadmin.browser.utils',
  ['sources/pgadmin'], function(pgAdmin) {

  var pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};

  /* Add hooked-in panels by extensions */
  pgBrowser['panels_items'] = '{{ current_app.panels|tojson }}';

  pgAdmin['csrf_token_header'] = '{{ current_app.config.get('WTF_CSRF_HEADERS')[0] }}';
  pgAdmin['csrf_token'] = '{{ csrf_token() }}';
  pgAdmin['server_mode'] = '{{ current_app.config.get('SERVER_MODE') }}';

  /* Get the inactivity related config */
  pgAdmin['user_inactivity_timeout'] = {{ current_app.config.get('USER_INACTIVITY_TIMEOUT') }};
  pgAdmin['override_user_inactivity_timeout'] = '{{ current_app.config.get('OVERRIDE_USER_INACTIVITY_TIMEOUT') }}' == 'True';

  // Define list of nodes on which Query tool option doesn't appears
  var unsupported_nodes = pgAdmin.unsupported_nodes = [
     'server_group', 'server', 'coll-tablespace', 'tablespace',
     'coll-role', 'role', 'coll-resource_group', 'resource_group',
     'coll-database'
  ];

  pgBrowser.utils = {
    layout: '{{ layout }}',
    pg_help_path: '{{ pg_help_path }}',
    edbas_help_path: '{{ edbas_help_path }}',
    tabSize: '{{ editor_tab_size }}',
    wrapCode: '{{ editor_wrap_code }}' == 'True',
    useSpaces: '{{ editor_use_spaces }}',
    insertPairBrackets: '{{ editor_insert_pair_brackets }}' == 'True',
    braceMatching: '{{ editor_brace_matching }}' == 'True',
    is_indent_with_tabs: '{{ editor_indent_with_tabs }}' == 'True',
    app_name: '{{ app_name }}',
    app_version_int: '{{ app_version_int}}',
    pg_libpq_version: {{pg_libpq_version|e}},
    support_ssh_tunnel: '{{ support_ssh_tunnel }}' == 'True',
    logout_url: '{{logout_url}}',

    counter: {total: 0, loaded: 0},
    registerScripts: function (ctx) {
      // There are some scripts which needed to be loaded immediately,
      // but - not all. We will will need to generate all the menus only
      // after they all were loaded completely.
    },

    addMenus: function (obj) {
      // Generate the menu items only when all the initial scripts
      // were loaded completely.
      //
      // First - register the menus from the other
      // modules/extensions.
      var self = this;
      if (this.counter.total == this.counter.loaded) {
        {% for key in ('File', 'Edit', 'Object' 'Tools', 'Management', 'Help') %}
        obj.add_menus({{ MENU_ITEMS(key, current_app.menu_items['%s_items' % key.lower()])}});
        {% endfor %}
        obj.create_menus();
      } else {
         //recall after some time
         setTimeout(function(){ self.addMenus(obj); }, 3000);
      }
    },

    // load the module right now
    load_module: function(name, path, c) {
      var obj = this;
      require([name],function(m) {
        try {
          // initialize the module (if 'init' function present).
          if (m.init && typeof(m.init) == 'function')
            m.init();
        } catch (e) {
          // Log this exception on console to understand the issue properly.
          console.log(e);
          obj.report_error(gettext('Error loading script - ') + path);
        }
        if (c)
        c.loaded += 1;
      }, function() {
        // Log the arguments on console to understand the issue properly.
        console.log(arguments);
        obj.report_error(gettext('Error loading script - ') + path);
      });
    }
  };
  return pgBrowser;
});
