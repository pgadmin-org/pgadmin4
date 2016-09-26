define([
  'underscore', 'underscore.string', 'jquery', 'pgadmin.browser',
  'alertify', 'pgadmin.alertifyjs', 'pgadmin.browser.messages',
], function(_, S, $, pgBrowser, Alertify) {

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

      this.sqlPanels = sqlPanels = pgBrowser.docker.findPanels('sql');

      // We will listend to the visibility change of the SQL panel
      pgBrowser.Events.on(
        'pgadmin-browser:panel-sql:' + wcDocker.EVENT.VISIBILITY_CHANGED,
        this.sqlPanelVisibilityChanged
      );

      pgBrowser.Events.on(
        'pgadmin:browser:node:updated', function() {
          if (this.sqlPanels && this.sqlPanels.length) {
            $(this.sqlPanels[0]).data('node-prop', '');
            this.sqlPanelVisibilityChanged(this.sqlPanels[0]);
          }
        }, this
      );

      // Hmm.. Did we find the SQL panel, and is it visible (opened)?
      // If that is the case - we need to listen the browser tree selection
      // events.
      if (sqlPanels.length == 0) {
        pgBrowser.Events.on(
          'pgadmin-browser:panel-sql:' + wcDocker.EVENT.INIT,
          function() {
            if ((sqlPanels[0].isVisible()) || sqlPanels.length != 1) {
              pgBrowser.Events.on(
                'pgadmin-browser:tree:selected', this.showSQL
              );
            }
          }.bind(this)
          );
      }
      else {
        if ((sqlPanels[0].isVisible()) || sqlPanels.length != 1) {
          pgBrowser.Events.on('pgadmin-browser:tree:selected', this.showSQL);
        }
      }
    },
    showSQL: function(item, data, node) {
      /**
       * We can't start fetching the SQL immediately, it is possible - the user
       * is just using keyboards to select the node, and just traversing
       * through. We will wait for some time before fetching the Reversed
       * Engineering SQL.
       **/
      this.timeout && clearTimeout(this.timeout);

      this.timeout =  setTimeout(
        function() {
          var sql = '';
          if (node) {
            sql = '-- ' + pgBrowser.messages.NODE_HAS_NO_SQL;
            var self = this,
                n_type = data._type,
                n_value = -1,
                treeHierarchy = node.getTreeNodeHierarchy(item);

            // Avoid unnecessary reloads
            if (_.isEqual($(this.sqlPanels[0]).data('node-prop'), treeHierarchy)) {
              return;
            }
            // Cache the current IDs for next time
            $(this.sqlPanels[0]).data('node-prop', treeHierarchy);

            if (node.hasSQL) {

              sql = '';
              var url = node.generate_url(item, 'sql', data, true),
                  timer;

              $.ajax({
                url: url,
                type:'GET',
                beforeSend: function(jqXHR, settings) {
                  // Generate a timer for the request
                  timer = setTimeout(function(){
                  // notify user if request is taking longer than 1 second

                    pgAdmin.Browser.editor.setValue(pgBrowser.messages['LOADING_MESSAGE']);
                  }, 1000);
                },
                success: function(res) {
                  if (pgAdmin.Browser.editor.getValue() != res) {
                    pgAdmin.Browser.editor.setValue(res);
                  }
                  clearTimeout(timer);
                },
                error: function(xhr, error, message) {
                  var _label = treeHierarchy[n_type].label;
                  pgBrowser.Events.trigger(
                    'pgadmin:node:retrieval:error', 'sql', xhr, error, message, item
                  );
                  if (
                    !Alertify.pgHandleItemError(xhr, error, message, {
                      item: item, info: treeHierarchy
                    })
                  ) {
                    Alertify.pgNotifier(
                      error, xhr,
                      S(
                        pgBrowser.messages['ERR_RETRIEVAL_INFO']
                      ).sprintf(message || _label).value(),
                      function() {
                        console.log(arguments);
                      }
                    );
                  }
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
