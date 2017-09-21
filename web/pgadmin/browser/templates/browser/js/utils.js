define('pgadmin.browser.utils', [], function() {
  var pgAdmin = window.pgAdmin = window.pgAdmin || {},
    pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};

  /* Add hooked-in panels by extensions */
  pgBrowser['panels_items'] = '{{ current_app.panels|tojson }}';


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
    app_name: '{{ app_name }}',
    addMenus: function (obj) {
      // Generate the menu items only when all the initial scripts
      // were loaded completely.
      //
      // First - register the menus from the other
      // modules/extensions.
      var self = this;

      {% for key in ('File', 'Edit', 'Object' 'Tools', 'Management', 'Help') %}
      {% if current_app.menu_items['%s_items' % key.lower()]|length > 0 %}
      obj.add_menus([{% for item in current_app.menu_items['%s_items' % key.lower()] %}{% if loop.index != 1 %}, {% endif %}{
        name: "{{ item.name }}",
        {% if item.url %}url: "{{ item.url }}",
        {% endif %}{% if item.target %}target: "{{ item.target }}",
        {% endif %}{% if item.callback %}callback: "{{ item.callback }}",
        {% endif %}{% if item.category %}category: "{{ item.category }}",
        {% endif %}{% if item.icon %}icon: '{{ item.icon }}',
        {% endif %}{% if item.data %}data: {{ item.data }},
        {% endif %}label: '{{ item.label }}', applies: ['{{ key.lower() }}'],
        priority: {{ item.priority }},
        enable: '{{ item.enable }}'
      }{% endfor %}]);
      {% endif %}
      {% endfor %}
    },
  };
  return pgBrowser.utils;
});
