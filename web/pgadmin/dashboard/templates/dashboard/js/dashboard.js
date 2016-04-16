define(['jquery', 'pgadmin', 'underscore', 'wcdocker', 'pgadmin.browser', 'bootstrap'],
		function($, pgAdmin, _) {

	var wcDocker = window.wcDocker,
	pgBrowser = pgAdmin.Browser;

	/* Return back, this has been called more than once */
	if (pgAdmin.Dashboard)
		return;

	pgAdmin.Dashboard = {
			init: function() {
				if (this.initialized)
					return;

				this.initialized = true;

				// Bind the Dashboard object with the 'object_selected' function
				var selected = this.object_selected.bind(this);

				// Listen for selection of any of object
				pgBrowser.Events.on('pgadmin-browser:tree:selected', selected);
			},

			object_selected: function(item, itemData, node) {
				var treeHierarchy = node.getTreeNodeHierarchy(item)
				if (itemData && itemData._type)
				{
					switch(itemData._type) {
					    case ('server-group'):
					        url = '{{ url_for('dashboard.index') }}';
					        break;

					    case ('server'):
					    case ('coll-database'):
					    case ('coll-role'):
					    case ('role'):
					    case ('coll-tablespace'):
					    case ('tablespace'):
					    	url = '{{ url_for('dashboard.index') }}'
					    		+ treeHierarchy.server._id;
					    	break;

					    default:
					    	url = '{{ url_for('dashboard.index') }}'
						    		+ treeHierarchy.server._id
						    		+ '/' + treeHierarchy.database._id;
                            break;
					}
				}

			 	var dashboardPanel = pgBrowser.frames['dashboard'].panel;
				if (dashboardPanel) {
					var frame = $(dashboardPanel).data('embeddedFrame');

					if (frame) {
					    // Avoid unnecessary reloads
					    if (_.isUndefined(treeHierarchy.server) || _.isUndefined(treeHierarchy.server._id))
					        sid = -1
					    else
					        sid = treeHierarchy.server._id

					    if (_.isUndefined(treeHierarchy.database) || _.isUndefined(treeHierarchy.database._id))
					        did = -1
					    else
					        did = treeHierarchy.database._id

					    if (sid != $(dashboardPanel).data('sid') ||
					        did != $(dashboardPanel).data('did')) {
						    frame.openURL(url);

						    // Cache the current IDs for next time
					        $(dashboardPanel).data('sid', sid)
					        $(dashboardPanel).data('did', did)
						}
					}
				}
			}
	};

	return pgAdmin.Dashboard;
});


