define(
  ['jquery', 'alertify', 'pgadmin', 'underscore', 'backform', 'pgadmin.browser', 'pgadmin.backform'],

  // This defines the Preference/Options Dialog for pgAdmin IV.
  function($, alertify, pgAdmin, _, Backform, pgBrowser) {
    pgAdmin = pgAdmin || window.pgAdmin || {};

    /*
     * Hmm... this module is already been initialized, we can refer to the old
     * object from here.
     */
    if (pgAdmin.Preferences)
        return pgAdmin.Preferences;

    pgAdmin.Preferences = {
      init: function() {
        if (this.initialized)
          return;

        this.initialized = true;

        // Declare the Preferences dialog
        alertify.dialog('preferencesDlg', function() {

          var jTree,         // Variable to create the aci-tree
              controls = [], // Keep tracking of all the backform controls
                             // created by the dialog.
              // Dialog containter
              $container = $("<div class='preferences_dialog'></div>");


          /*
           * Preference Model
           *
           * This model will be used to keep tracking of the changes done for
           * an individual option.
           */
          var PreferenceModel = Backbone.Model.extend({
            idAttribute: 'id',
            defaults: {
              id: undefined,
              value: undefined
            }
          });

          /*
           * Preferences Collection object.
           *
           * We will use only one collection object to keep track of all the
           * preferences.
           */
          var changed = {},
              preferences = this.preferences = new (Backbone.Collection.extend({
                model: PreferenceModel,
                url: "{{ url_for('preferences.preferences') }}",
                updateAll: function() {
                  // We will send only the modified data to the server.
                  for (var key in changed) {
                    this.get(key).save();
                  }
                  return true;
                }
              }))(null);

          preferences.on('reset', function() {
            // Reset the changed variables
            changed = {};
          });

          preferences.on('change', function(m) {
            var id = m.get('id');
            if (!(id in changed)) {
              // Keep track of the original value
              changed[id] = m._previousAttributes.value;
            } else if (_.isEqual(m.get('value'), changed[id])) {
              // Remove unchanged models.
              delete changed[id];
            }
          });

          /*
           * Function: renderPreferencePanel
           *
           * Renders the preference panel in the content div based on the given
           * preferences.
           */
          var renderPreferencePanel = function(prefs) {
            /*
             * Clear the existing html in the preferences content
             */
            var content = $container.find('.preferences_content');
            content.empty();

            /*
             * We should clean up the existing controls.
             */
            if (controls) {
              _.each(controls, function(c) {
                c.remove();
              });
            }
            controls = [];

            /*
             * We will create new set of controls and render it based on the
             * list of preferences using the Backform Field, Control.
             */
            _.each(prefs, function(p) {

              var m = preferences.get(p.id);
              m.errorModel = new Backbone.Model();
              var f = new Backform.Field(
                    _.extend({}, p, {id: 'value', name: 'value'})
                    ),
                  cntr = new (f.get("control")) ({
                    field: f,
                    model: m
                  });
                  content.append(cntr.render().$el);

                  // We will keep track of all the controls rendered at the
                  // moment.
                  controls.push(cntr);
            });

          };

          /*
           * Function: dialogContentCleanup
           *
           * Do the dialog container cleanup on openning.
           */

          var dialogContentCleanup = function() {
              // Remove the existing preferences
              if (!jTree)
                return;

              /*
               * Remove the aci-tree (mainly to remove the jquery object of
               * aciTree from the system for this container).
               */
              try {
                jTreeApi = jTree.aciTree('destroy');
              } catch(ex) {
                // Sometimes - it fails to destroy the tree properly and throws
                // exception.
              }
              jTree.off('acitree', treeEventHandler);

              // We need to reset the data from the preferences too
              preferences.reset();

              /*
               * Clean up the existing controls.
               */
              if (controls) {
                _.each(controls, function(c) {
                  c.remove();
                });
              }
              controls = [];

              // Remove all the objects now.
              $container.empty();
            },
            /*
             * Function: selectFirstCategory
             *
             * Whenever a user select a module instead of a category, we should
             * select the first categroy of it.
             */
            selectFirstCategory = function(api, item) {
              var  data = item ? api.itemData(item) : null;

              if (data && data.preferences) {
                  api.select(item);
                  return;
              }
              item = api.first(item);
              selectFirstCategory(api, item);
            },
            /*
             * A map on how to create controls for each datatype in preferences
             * dialog.
             */
            getControlMappedForType = function(p) {
              switch(p.type) {
                case 'text':
                    return 'input';
                case 'boolean':
                  p.options = {
                      onText: '{{ _('True') }}',
                      offText: '{{ _('False') }}',
                      onColor: 'success',
                      offColor: 'default',
                      size: 'mini'
                    };
                  return 'switch';
                case 'node':
                    p.options = {
                      onText: '{{ _('Show') }}',
                      offText: '{{ _('Hide') }}',
                      onColor: 'success',
                      offColor: 'default',
                      size: 'mini'
                    };
                    return 'switch';
                case 'integer':
                  return 'integer';
                case 'numeric':
                  return 'numeric';
                case 'date':
                  return 'datepicker';
                case 'datetime':
                  return 'datetimepicker';
                case 'options':
                  var opts = [];
                  // Convert the array to SelectControl understandable options.
                  _.each(p.options, function(o) {
                    opts.push({'label': o, 'value': o});
                  });
                  p.options = opts;
                  return 'select2';
                case 'multiline':
                  return 'textarea';
                case 'switch':
                  return 'switch';
                default:
                    if (console && console.log) {
                      // Warning for developer only.
                       console.log(
                         "Hmm.. We don't know how to render this type - ''" + type + "' of control."
                       );
                    }
                  return 'input';
              }
            },
            /*
             * function: treeEventHandler
             *
             * It is basically a callback, which listens to aci-tree events,
             * and act accordingly.
             *
             * + Selection of the node will existance of the preferences for
             *   the selected tree-node, if not pass on to select the first
             *   category under a module, else pass on to the render function.
             *
             * + When a new node is added in the tree, it will add the relavent
             *   preferences in the preferences model collection, which will be
             *   called during initialization itself.
             *
             *
             */
            treeEventHandler = function(event, api, item, eventName) {
              // Look for selected item (if none supplied)!
              item = item || api.selected();

              // Event tree item has itemData
              var d = item ? api.itemData(item) : null;

              /*
               * boolean (switch/checkbox), string, enum (combobox - enumvals),
               * integer (min-max), font, color
               */
              switch (eventName) {
                case "selected":
                  if (!d)
                    return true;

                  if (d.preferences) {
                    /*
                     * Clear the existing html in the preferences content
                     */
                    renderPreferencePanel(d.preferences);

                    return true;
                  } else{
                    selectFirstCategory(api, item);
                  }
                  break;
                case 'added':
                  if (!d)
                    return true;

                  // We will add the preferences in to the preferences data
                  // collection.
                  if (d.preferences && _.isArray(d.preferences)) {
                    _.each(d.preferences, function(p) {
                      preferences.add({
                        'id': p.id, 'value': p.value, 'cid': d.id, 'mid': d.mid
                      });
                      /*
                       * We don't know until now, how to render the control for
                       * this preference.
                       */
                      if (!p.control) {
                        p.control = getControlMappedForType(p);
                      }
                      if (p.help_str) {
                        p.helpMessage = p.help_str;
                      }
                    });
                  }
                  d.sortable = false;
                  break;
                case 'loaded':
                  // Let's select the first category from the prefrences.
                  // We need to wait for sometime before all item gets loaded
                  // properly.
                  setTimeout(
                    function() {
                      selectFirstCategory(api, null);
                    }, 300);
                  break;
              }
              return true;
          };

          // Dialog property
          return {
            main: function() {

              // Remove the existing content first.
              dialogContentCleanup();

              $container.append(
                "<div class='pg-el-xs-3 preferences_tree aciTree'></div>"
              ).append(
                "<div class='pg-el-xs-9 preferences_content'>" +
                " {{ _('Category is not selected.')|safe }}" +
                "</div>"
              );

              // Create the aci-tree for listing the modules and categories of
              // it.
              jTree = $container.find('.preferences_tree');
              jTree.on('acitree', treeEventHandler);

              jTree.aciTree({
                selectable: true,
                expand: true,
                ajax: {
                  url: "{{ url_for('preferences.preferences') }}"
                }
              });

              this.show();
            },
            setup: function() {
              return {
                buttons:[{
                    text: '', key: 27, className: 'btn btn-default pull-left fa fa-lg fa-question',
                    attrs:{name:'dialog_help', type:'button', label: '{{ _('Preferences') }}',
                    url: '{{ url_for('help.static', filename='preferences.html') }}'}
                  },{
                    text: "{{ _('OK') }}", key: 13, className: "btn btn-primary fa fa-lg fa-save pg-alertify-button"
                  },{
                    text: "{{ _('Cancel') }}", className: "btn btn-danger fa fa-lg fa-times pg-alertify-button"
                  }
                ],
                focus: { element: 0 },
                options: {
                  padding: !1,
                  overflow: !1,
                  title: '{{ _('Preferences')|safe }}',
                  closableByDimmer: false,
                  modal:false
                }
              };
            },
            callback: function(e) {
              if (e.button.element.name == "dialog_help") {
                  e.cancel = true;
                  pgBrowser.showHelp(e.button.element.name, e.button.element.getAttribute('url'),
                    null, null, e.button.element.getAttribute('label'));
                  return;
               }

              if (e.button.text == "{{ _('OK') }}"){
                preferences.updateAll();
              }
            },
            build: function() {
              this.elements.content.appendChild($container.get(0));
              alertify.pgDialogBuild.apply(this)
            },
            hooks: {
              onshow: function() {
                $(this.elements.body).addClass('pgadmin-preference-body');
              }
            }
          };
        });

      },
      show: function() {
        alertify.preferencesDlg(true).resizeTo('60%', '60%');
      }
    };

    return pgAdmin.Preferences;
  });
