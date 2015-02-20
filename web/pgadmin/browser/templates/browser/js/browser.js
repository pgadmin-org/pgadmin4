// Store the main browser layout
function storeLayout(pane, $pane, paneState, paneOptions) {
    state = layout.readState();
    settings = { setting1: "Browser/SQLPane/Size", 
                 value1: state.center.children.layout1.south.size, 
                 setting2: "Browser/SQLPane/Closed", 
                 value2: state.center.children.layout1.south.initClosed,
                 setting3: "Browser/BrowserPane/Size", 
                 value3: state.west.size,
                 setting4: "Browser/BrowserPane/Closed", 
                 value4: state.west.initClosed,
                 count: 4
               }
    
    $.post("{{ url_for('settings.store') }}", settings);

    return true
}

// Setup the browsers
$(document).ready(function(){
    
    // Define the main browser layout
    var layout        
    var layoutDefault = {
        center__maskContents:           true,
        center__paneSelector:           "#outer-center",
        center__maskContents:           true,
        center__children:               [{
            center__paneSelector:           "#inner-center",
            center__maskContents:           true,
            center__onresize:               "storeLayout",
            south__maskContents:            true,
            south__size:		        {{ layout_settings.sql_size }},
            south__initClosed:              {{ layout_settings.sql_closed }},
            south__spacing_closed:	        22,
            south__togglerLength_closed:    140,
            south__togglerAlign_closed:     "right",
            south__togglerContent_closed:   'SQL Pane',
            south__togglerTip_closed:       "Open & Pin SQL Pane",
            south__sliderTip:	        "Slide Open SQL Pane",
            south__slideTrigger_open:       "mouseover",
        }],
        west__maskContents:             true,
        west__size:		            {{ layout_settings.browser_size }},
        west__initClosed:               {{ layout_settings.browser_closed }},
        west__spacing_closed:	    22,
        west__togglerLength_closed:     140,
        west__togglerAlign_closed:      "top",
        west__togglerContent_closed:    'B<br />r<br />o<br />w<br />s<br />e<br />r',
        west__togglerTip_closed:        "Open & Pin Browser",
        west__sliderTip:	            "Slide Open Browser",
        west__slideTrigger_open:        "mouseover",
    };

    layout = $('#container').layout(layoutDefault);


    // Make the tabs, umm, tabable
    $('#dashboard a').click(function (e) {
        e.preventDefault()
        $(this).tab('show')
    })
    $('#properties a').click(function (e) {
        e.preventDefault()
        $(this).tab('show')
    })
    $('#statistics a').click(function (e) {
        e.preventDefault()
        $(this).tab('show')
    })
    $('#dependencies a').click(function (e) {
        e.preventDefault()
        $(this).tab('show')
    })
    $('#dependents a').click(function (e) {
        e.preventDefault()
        $(this).tab('show')
    })

    // Syntax highlight the SQL Pane
    var editor = CodeMirror.fromTextArea(document.getElementById("sql-textarea"), {
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
    var treeApi = $('#tree').aciTree('api');

    // Build the treeview context menu
    $('#tree').contextMenu({
        selector: '.aciTreeLine',
        build: function(element) {
            var item = treeApi.itemFrom(element);
            var menu = {
            };

             menu['rename'] = {
                name: 'Rename server group',
                callback: function() { rename_server_group(item); }
            };
                       
            menu['delete'] = {
                name: 'Delete server group',
                callback: function() { delete_server_group(item); }
            };

            return {
                autoHide: true,
                items: menu,
                callback: null
            };
        }
    });
});
