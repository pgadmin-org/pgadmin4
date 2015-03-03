// Page globals
var docker
var editor
var tree

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
            myPanel.layout().addItem($frameArea);
            
            var iFrame = new wcIFrame($frameArea, myPanel);
            iFrame.openURL(url);
        }
    });
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
  
        buildPanel(docker, 'pnl_sql', '{{ _('SQL') }}', 500, 200, false, false, true, 
                  '<textarea id="sql-textarea" name="sql-textarea">' + demoSql + '</textarea>')
        buildPanel(docker, 'pnl_browser', '{{ _('Browser') }}', 300, 600, false, false, true, 
                  '<div id="tree" class="aciTree">')
        buildIFramePanel(docker, 'pnl_dashboard', '{{ _('Dashboard') }}', 500, 600, true, false, true, 
                  'http://www.pgadmin.org/')
        buildPanel(docker, 'pnl_properties', '{{ _('Properties') }}', 500, 600, true, false, true, 
                  '<p>Properties pane</p>')
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
        
        // Restore the layout if there is one
        if (layout != '') {
            docker.restore(layout)
        } else {
            var dashboardPanel = docker.addPanel('pnl_dashboard', wcDocker.DOCK_TOP, propertiesPanel);
            var propertiesPanel = docker.addPanel('pnl_properties', wcDocker.DOCK_STACKED, dashboardPanel);
            var statisticsPanel = docker.addPanel('pnl_statistics', wcDocker.DOCK_STACKED, dashboardPanel);
            var dependenciesPanel = docker.addPanel('pnl_dependencies', wcDocker.DOCK_STACKED, dashboardPanel);
            var dependentsPanel = docker.addPanel('pnl_dependents', wcDocker.DOCK_STACKED, dashboardPanel);
            var sqlPanel = docker.addPanel('pnl_sql', wcDocker.DOCK_BOTTOM, sqlPanel);
            var browserPanel = docker.addPanel('pnl_browser', wcDocker.DOCK_LEFT, browserPanel);
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
            var menu = {
            };
            {% if context_items is defined %}
            {% for context_item in context_items %}
            menu['{{ context_item.name }}'] = {
                name: '{{ context_item.label }}',
                callback: function() { {{ context_item.onclick }} }
            };
            {% endfor %}{% endif %}
            return {
                autoHide: true,
                items: menu,
                callback: null
            };
        }
    });
});

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
  
    if (info != '') {
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