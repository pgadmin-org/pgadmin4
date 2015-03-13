// Page globals
var docker
var editor
var tree
var dashboardPanel
var propertiesPanel
var statisticsPanel
var dependenciesPanel
var dependentsPanel
var sqlPanel
var browserPanel

// Store the main browser layout
$(window).bind('unload', function() { 
    state = docker.save();
    settings = { setting: "Browser/Layout", 
                 value: state }
    
    $.post("{{ url_for('settings.store') }}", settings);

    return true
});

// Build a regular dock panel
function buildPanel(docker, name, title, width, height, showTitle, isCloseable, isPrivate, content) {
    docker.registerPanelType(name, {
        title: title,
        isPrivate: isPrivate,
        onCreate: function(myPanel) {
            myPanel.initSize(width, height);
            
            if (showTitle == false) 
                myPanel.title(false);

            myPanel.closeable(isCloseable);

            myPanel.layout().addItem(content, 0, 0).parent().css('height', '100%');
        }
    });
}

// Build an iFrame dock panel
function buildIFramePanel(docker, name, title, width, height, showTitle, isCloseable, isPrivate, url) {
    docker.registerPanelType(name, {
        title: title,
        isPrivate: isPrivate,
        onCreate: function(myPanel) {
            myPanel.initSize(width, height);
            
            if (showTitle == false) 
                myPanel.title(false);

            myPanel.closeable(isCloseable);

            var $frameArea = $('<div style="width:100%;height:100%;position:relative;">');
            myPanel.layout().addItem($frameArea).parent().css('height', '100%');

            var iFrame = new wcIFrame($frameArea, myPanel);
            iFrame.openURL(url);
        }
    });
}

// Build the default layout
function buildDefaultLayout() {
    dashboardPanel = docker.addPanel('pnl_dashboard', wcDocker.DOCK_TOP, propertiesPanel);
    propertiesPanel = docker.addPanel('pnl_properties', wcDocker.DOCK_STACKED, dashboardPanel);
    sqlPanel = docker.addPanel('pnl_sql', wcDocker.DOCK_STACKED, dashboardPanel);
    statisticsPanel = docker.addPanel('pnl_statistics', wcDocker.DOCK_STACKED, dashboardPanel);
    dependenciesPanel = docker.addPanel('pnl_dependencies', wcDocker.DOCK_STACKED, dashboardPanel);
    dependentsPanel = docker.addPanel('pnl_dependents', wcDocker.DOCK_STACKED, dashboardPanel);
    browserPanel = docker.addPanel('pnl_browser', wcDocker.DOCK_LEFT, browserPanel);
}

function report_error(message, info) {

    text = '<div class="panel-group" id="accordion" role="tablist" aria-multiselectable="true">\
  <div class="panel panel-default">\
    <div class="panel-heading" role="tab" id="headingOne">\
      <h4 class="panel-title">\
        <a data-toggle="collapse" data-parent="#accordion" href="#collapseOne" aria-expanded="true" aria-controls="collapseOne">\
          {{ _('Error message') }}\
        </a>\
      </h4>\
    </div>\
    <div id="collapseOne" class="panel-collapse collapse in" role="tabpanel" aria-labelledby="headingOne">\
      <div class="panel-body" style="overflow: scroll;">' + message + '</div>\
    </div>\
  </div>'
  
    if (info != null && info != '') {
        text += '<div class="panel panel-default">\
    <div class="panel-heading" role="tab" id="headingTwo">\
      <h4 class="panel-title">\
        <a class="collapsed" data-toggle="collapse" data-parent="#accordion" href="#collapseTwo" aria-expanded="false" aria-controls="collapseTwo">\
          {{ _('Additional info') }}\
        </a>\
      </h4>\
    </div>\
    <div id="collapseTwo" class="panel-collapse collapse" role="tabpanel" aria-labelledby="headingTwo">\
      <div class="panel-body" style="overflow: scroll;">' + info + '</div>\
    </div>\
  </div>\
</div>'
    }
    
    text += '</div>'
    
    alertify.alert(
        '{{ _('An error has occurred') }}',
        text
    )
}


// Enable/disable menu options
function enable_disable_menus() {
    
    // Disable everything first
    $("#mnu_create").html('<li class="menu-item disabled"><a href="#">{{ _('No object selected') }}</a></li>\n');
    $("#mnu_drop_object").addClass("mnu-disabled"); 
    $("#mnu_rename_object").addClass("mnu-disabled"); 
    node_type = get_selected_node_type()
    
    // List the possible standard items, their types and actions
    var handlers = [{% if standard_items is defined %}{% for standard_item in standard_items %}
        "{{ standard_item.type }}:{{ standard_item.action }}",{% endfor %}{% endif %} 
    ]
    
    // Check if we have a matching action for the object type in the list, and
    // if so, enable the menu item
    if ($.inArray(node_type + ":drop", handlers) >= 0)
        $("#mnu_drop_object").removeClass("mnu-disabled"); 
        
    if ($.inArray(node_type + ":rename", handlers) >= 0)
        $("#mnu_rename_object").removeClass("mnu-disabled");
        
    // List the possibe create items
    var creators = [{% if create_items is defined %}{% for create_item in create_items %}
        [{{ create_item.type }}, "{{ create_item.name }}", "{{ create_item.label }}", "{{ create_item.function }}"],{% endfor %}{% endif %} 
    ]
    
    // Loop through the list of creators and add links for any that apply to this
    // node type to the Create menu's UL element
    items = ''
    
    for (i = 0; i < creators.length; ++i) {
        if ($.inArray(node_type, creators[i][0]) >= 0) {
            items = items + '<li class="menu-item"><a href="#" onclick="' + creators[i][3] + '()">' + creators[i][2] + '</a></li>\n'
        }
    }
    if (items != '')
        $("#mnu_create").html(items);
}

// Get the selected treeview item type, or nowt
function get_selected_node_type() {
    item = tree.selected()
    if (!item || item.length != 1)
        return "";
        
    return tree.itemData(tree.selected())._type;
}
    
// Create a new object of the type currently selected
function create_object() {
    node_type = get_selected_node_type()
    if (node_type == "")
        return;
    
    switch(node_type) {
    {% if standard_items is defined %}{% for standard_item in standard_items %}{% if standard_item.action == 'create' %}
        case '{{ standard_item.type }}':
             {{ standard_item.function }}()
             break;
    {% endif %}{% endfor %}{% endif %} 
    }
}

// Drop the selected object
function drop_object() {
    node_type = get_selected_node_type()
    if (node_type == "")
        return;
    
    switch(node_type) {
    {% if standard_items is defined %}{% for standard_item in standard_items %}{% if standard_item.action == 'drop' %}
        case '{{ standard_item.type }}':
             {{ standard_item.function }}(tree.selected())
             break;
    {% endif %}{% endfor %}{% endif %} 
    }
}

// Rename the selected object
function rename_object() {
    node_type = get_selected_node_type()
    if (node_type == "")
        return;
    
    switch(node_type) {
    {% if standard_items is defined %}{% for standard_item in standard_items %}{% if standard_item.action == 'rename' %}
        case '{{ standard_item.type }}':
             {{ standard_item.function }}(tree.selected())
             break;
    {% endif %}{% endfor %}{% endif %} 
    }
}


// Setup the browser
$(document).ready(function(){

    docker = new wcDocker('.dockerContainer');
    if (docker) {

        demoSql = '-- DROP TABLE tickets_detail; \n\
 \n\
CREATE TABLE tickets_detail \n\
( \n\
  id serial NOT NULL, \n\
  ticket_id integer NOT NULL, \n\
  logger_id integer NOT NULL, \n\
  added timestamp with time zone NOT NULL, \n\
  detail text NOT NULL, \n\
  msgid character varying(100), \n\
  CONSTRAINT tickets_detail_pkey PRIMARY KEY (id), \n\
  CONSTRAINT ticket_id_refs_id_6b8dc130 FOREIGN KEY (ticket_id) \n\
      REFERENCES tickets_ticket (id) MATCH SIMPLE \n\
      ON UPDATE NO ACTION ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED, \n\
  CONSTRAINT tickets_detail_logger_id_fkey FOREIGN KEY (logger_id) \n\
      REFERENCES auth_user (id) MATCH SIMPLE \n\
      ON UPDATE NO ACTION ON DELETE NO ACTION DEFERRABLE INITIALLY DEFERRED \n\
) \n\
WITH ( \n\
  OIDS=FALSE \n\
); \n\
ALTER TABLE tickets_detail \n\
  OWNER TO helpdesk;\n';
  
        buildPanel(docker, 'pnl_browser', '{{ _('Browser') }}', 300, 600, false, false, true, 
                  '<div id="tree" class="aciTree">')
        buildIFramePanel(docker, 'pnl_dashboard', '{{ _('Dashboard') }}', 500, 600, true, false, true, 
                  'http://www.pgadmin.org/')
        buildPanel(docker, 'pnl_properties', '{{ _('Properties') }}', 500, 600, true, false, true, 
                  '<p>Properties pane</p>')
        buildPanel(docker, 'pnl_sql', '{{ _('SQL') }}', 500, 600, true, false, true, 
                  '<textarea id="sql-textarea" name="sql-textarea">' + demoSql + '</textarea>')
        buildPanel(docker, 'pnl_statistics', '{{ _('Statistics') }}', 500, 600, true, false, true, 
                  '<p>Statistics pane</p>')
        buildPanel(docker, 'pnl_dependencies', '{{ _('Dependencies') }}', 500, 600, true, false, true, 
                  '<p>Depedencies pane</p>')
        buildPanel(docker, 'pnl_dependents', '{{ _('Dependents') }}', 500, 600, true, false, true, 
                  '<p>Dependents pane</p>')
        
        // Add hooked-in panels
        {% if panel_items is defined and panel_items|count > 0 %}{% for panel_item in panel_items %}{% if panel_item.isIframe %}
        buildIFramePanel(docker, '{{ panel_item.name }}', '{{ panel_item.title }}', 
                                  {{ panel_item.width }}, {{ panel_item.height }}, 
                                  {{ panel_item.showTitle|lower }}, {{ panel_item.isCloseable|lower }}, 
                                  {{ panel_item.isPrivate|lower }}, '{{ panel_item.content }}')
        {% else %}
        buildPanel(docker, '{{ panel_item.name }}', '{{ panel_item.title }}', 
                            {{ panel_item.width }}, {{ panel_item.height }}, 
                            {{ panel_item.showTitle|lower }}, {{ panel_item.isCloseable|lower }}, 
                            {{ panel_item.isPrivate|lower }}, '{{ panel_item.content }}')                         
        {% endif %}{% endfor %}{% endif %}
        
        var layout = '{{ layout }}';
        
        // Try to restore the layout if there is one
        if (layout != '') {
            try {
                docker.restore(layout)
            }
            catch(err) {
                docker.clear()
                buildDefaultLayout()
            }
        } else {
            buildDefaultLayout()
        }
    }
    
    // Syntax highlight the SQL Pane
    editor = CodeMirror.fromTextArea(document.getElementById("sql-textarea"), {
        lineNumbers: true,
        mode: "text/x-sql",
        readOnly: true,
    });

    // Initialise the treeview
    $('#tree').aciTree({
        ajax: {
            url: '{{ url_for('browser.get_nodes') }}'
        },
    });
    tree = $('#tree').aciTree('api');

    // Build the treeview context menu
    $('#tree').contextMenu({
        selector: '.aciTreeLine',
        build: function(element) {
            var item = tree.itemFrom(element);
            var menu = { };
            var createMenu = { };

            {% if create_items is defined %}
            {% for create_item in create_items %}
            if ($.inArray(tree.itemData(item)._type, {{ create_item.type }}) >= 0) {
                createMenu['{{ create_item.name }}'] = { name: '{{ create_item.label }}', callback: function() { {{ create_item.function }}() }};
            }
            {% endfor %}{% endif %}
            
            menu["create"] = { "name": "Create" }            
            menu["create"]["items"] = createMenu
            
            {% if context_items is defined %}
            {% for context_item in context_items %}
            if (tree.itemData(item)._type == '{{ context_item.type }}') {
                menu['{{ context_item.name }}'] = { name: '{{ context_item.label }}', callback: function() { {{ context_item.onclick }} }};
            }
            {% endfor %}{% endif %}
            return {
                autoHide: true,
                items: menu,
                callback: null
            };
        }
    });
    
    // Treeview event handler
    $('#tree').on('acitree', function(event, api, item, eventName, options){
        switch (eventName){
            case "selected":
                enable_disable_menus()
                break;
        }
    });

    
    // Setup the menus
    enable_disable_menus()
});


