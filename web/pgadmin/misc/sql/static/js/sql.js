define(
   ['underscore', 'jquery', 'pgadmin.browser'],
function(_, $, pgBrowser) {

  pgBrowser.ShowNodeSQL = pgBrowser.ShowNodeSQL || {};

  if (pgBrowser.ShowNodeSQL.initialized) {
    return pgBrowser.ShowNodeSQL;
  }

  _.extend(pgBrowser.ShowNodeSQL, {
    init: function() {
      if (this.initialized) {
        return;
      }
      this.initialized = true;
      _.bindAll(this, 'showSQL', 'sqlPanelVisibilityChanged');

      var sqlPanels = pgBrowser.docker.findPanels('sql');

      // We will listend to the visibility change of the SQL panel
      pgBrowser.Events.on('pgadmin-browser:panel-sql:' + wcDocker.EVENT.VISIBILITY_CHANGED, this.sqlPanelVisibilityChanged);

      // Hmm.. Did we find the SQL panel, and is it visible (openned)?
      // If that is the case - we need to listen the browser tree selection
      // events.
      if ((sqlPanels.length == 1 && sqlPanels[0].isVisible()) || sqlPanels.length != 1) {
        pgBrowser.Events.on('pgadmin-browser:tree:selected', this.showSQL);
      }
    },
    showSQL: function(item, data, node) {
      /**
       * We can't start fetching the SQL immediately, it is possible - the user
       * is just using keyboards to select the node, and just traversing
       * through. We will wait for some time before fetching the Reversed
       * Engineering SQL.
       **/
      if (this.timeout) {
        clearTimeout(this.timeout);
      }
      this.timeout =  setTimeout(
        function() {
          var sql = '-- No object selected!';
          if (node) {
            sql = '-- No SQL generated for the selected object.';
            if (node.hasSQL) {

              sql = '';
              var url = node.generate_url(item, 'sql', data, true);

              $.ajax({
                url: url,
                type:'GET',
                success: function(res) {
                  if (pgAdmin.Browser.editor.getValue() != res) {
                    pgAdmin.Browser.editor.setValue(res);
                  }
                },
                error:  function() {
                  // TODO:: Report this
                }
              });
            }
          }
          if (sql != '') {
            pgAdmin.Browser.editor.setValue(sql);
          }
        }, 400);
    },
    sqlPanelVisibilityChanged: function(panel) {
      if (panel.isVisible()) {
        var t = pgBrowser.tree,
            i = t.selected(),
            d = i && t.itemData(i),
            n = i && d && pgBrowser.Nodes[d._type];

        pgBrowser.ShowNodeSQL.showSQL.apply(pgBrowser.ShowNodeSQL, [i, d, n]);

        // We will start listening the tree selection event.
        pgBrowser.Events.on('pgadmin-browser:tree:selected', pgBrowser.ShowNodeSQL.showSQL);
      } else {
        // We don't need to listen the tree item selection event.
        pgBrowser.Events.off('pgadmin-browser:tree:selected', pgBrowser.ShowNodeSQL.showSQL);
      }
    }
  });

  return pgBrowser.ShowNodeSQL;
});
