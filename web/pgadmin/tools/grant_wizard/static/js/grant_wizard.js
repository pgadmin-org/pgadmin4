/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Grant Wizard
define([
  'sources/gettext', 'sources/url_for', 'jquery', 'underscore', 'backbone',
  'pgadmin.alertifyjs', 'pgadmin.backgrid', 'pgadmin.backform',
  'pgadmin.browser', 'pgadmin.browser.node',
  'tools/grant_wizard/static/js/menu_utils',
  'sources/utils',
  'sources/nodes/supported_database_node',
  'backgrid.select.all',
  'backgrid.filter', 'pgadmin.browser.server.privilege',
  'pgadmin.browser.wizard',
], function(
  gettext, url_for, $, _, Backbone, Alertify, Backgrid, Backform, pgBrowser,
  pgNode, menuUtils, commonUtils, supportedNodes
) {

  // if module is already initialized, refer to that.
  if (pgBrowser.GrantWizard) {
    return pgBrowser.GrantWizard;
  }

  /**
    It is sub model for field "Objects". It has fields
    for database object types such as Schemas, Views and
    Sequence etc.
  */
  var DatabaseObjectModel = pgNode.Model.extend({
    defaults: {
      selected: false,
      icon: 'icon-unknown',
      name: undefined,
      name_with_args: undefined,
      nspname: undefined,
      proargs: undefined,
      object_type: undefined,
      object_id: undefined,
    },
    idAttribute: 'object_id', // to uniquely identify a model object
    toJSON: function() {
      var d = pgNode.Model.prototype.toJSON.apply(this);
      delete d.icon;
      return d;
    },
    parse: function(res) {

      // Create unique object id
      res.object_id = res.name_with_args;

      // create name with args if its object is function
      if (!_.isUndefined(res.object_type) &&
        (res.object_type == 'Function' ||
          res.object_type == 'Trigger Function' ||
          res.object_type == 'Procedure'
        ))
        res.name_with_args = res.name + '(' + (typeof(res.proargs) != 'undefined' ? res.proargs : '') + ')';
      else
        res.name_with_args = res.name;

      return res;
    },

    validate: function() {

      /*
       * Triggers error messages for object types "selected"
       * if it is empty/undefined/null
       */
      var err = {},
        errmsg,
        node = this.get('objects').toJSON();
      if (_.isEmpty(node)) {
        err['selected'] = gettext('Please select any database object.');
        errmsg = err['selected'];
        this.errorModel.set('selected', errmsg);
        return errmsg;
      } else {
        this.errorModel.unset('selected');
      }
      return null;
    },
  });

  // Define columns for the Db Object Types grid
  var columns = [{
    name: 'selected',

    /*
    Override render method of Backgrid.Extension.SelectRowCell
    class. It has an issue: It doesn't mark rows checked if we move to next
    page and then go back to previous page. but it must show.
    so we handle this case by overriding the render method.
    */
    cell: Backgrid.Extension.SelectRowCell.extend({
      render: function() {

        // Do not use parent's render function. It set's tabindex to -1 on
        // checkboxes.

        var col = this.column.get('name');
        let id = `row-${_.uniqueId(col)}`;
        this.$el.empty().append(`
          <div class="custom-control custom-checkbox custom-checkbox-no-label">
            <input tabindex="-1" type="checkbox" class="custom-control-input" id="${id}" />
            <label class="custom-control-label" for="${id}">
              <span class="sr-only">Select All<span>
            </label>
          </div>
        `);
        this.delegateEvents();

        if (this.model && this.model.has(col)) {
          if (this.model.get(col)) {
            this.$el.parent().toggleClass('selected', true);
            this.model.trigger('backgrid:selected', this.model, true);
          }
        }
        return this;
      },
    }),

    headerCell: 'select-all',

  }, {
    name: 'object_type',
    label: gettext('Object Type'),
    editable: false,
    cell: Backgrid.Cell.extend({
      render: function() {

        // Override render to add icon to Db Object column
        Backgrid.Cell.prototype.render.apply(this, arguments);
        this.$el.addClass(this.model.get('icon')).css({
          'padding-left': '24px',
        });

        return this;
      },
    }),
  }, {
    name: 'nspname',
    label: gettext('Schema'),
    cell: 'string',
    editable: false,
  }, {
    name: 'name_with_args',
    label: gettext('Name'),
    cell: 'string',
    editable: false,
  }];

  // Create an Object GrantWizard of pgBrowser class
  pgBrowser.GrantWizard = {
    init: function() {
      if (this.initialized)
        return;

      this.initialized = true;

      // Define the nodes on which the menus to be appear
      var menus = [{
        name: 'grant_wizard_schema',
        module: this,
        applies: ['tools'],
        callback: 'start_grant_wizard',
        priority: 14,
        label: gettext('Grant Wizard...'),
        icon: 'fa fa-unlock-alt',
        enable: supportedNodes.enabled.bind(
          null, pgBrowser.treeMenu, menuUtils.supportedNodes
        ),
      }];

      // Add supported menus into the menus list
      for (var idx = 0; idx < menuUtils.supportedNodes.length; idx++) {
        menus.push({
          name: 'grant_wizard_schema_context_' + menuUtils.supportedNodes[idx],
          node: menuUtils.supportedNodes[idx],
          module: this,
          applies: ['context'],
          callback: 'start_grant_wizard',
          priority: 14,
          label: gettext('Grant Wizard...'),
          icon: 'fa fa-unlock-alt',
          enable: supportedNodes.enabled.bind(
            null, pgBrowser.treeMenu, menuUtils.supportedNodes
          ),
        });
      }
      pgBrowser.add_menus(menus);

      return this;
    },

    // Callback to draw Wizard Dialog
    start_grant_wizard: function() {

      // Declare Wizard dialog
      if (!Alertify.wizardDialog) {
        Alertify.dialog('wizardDialog', function factory() {

          // Generate wizard main container
          var $container = $('<div class=\'wizard_dlg\'></div>');
          return {
            main: function(title) {
              this.set('title', title);
            },
            setup: function() {
              return {
                // Set options for dialog
                options: {
                  frameless: true,
                  resizable: true,
                  autoReset: false,
                  maximizable: false,
                  closable: false,
                  closableByDimmer: false,
                  modal: false,
                  pinnable: false,
                },
              };
            },
            /**
              Returns a Paginator Class Object which is again to be rendered

              @class {Backgrid.Extension.Paginator}
              @param {Backbone.Collection} coll - from which data is fetched
              @return {Object} paginator
            */
            DbPaginator: function(coll) {
              var paginator = this.paginator = new Backgrid.Extension.Paginator({
                collection: coll,
                windowSize: 8,
              });
              return paginator;
            },

            /**
              Create new Filter which will filter the
              rendered grid for Select Type Tabular Data
              @param {Backbone.PageableCollection} coll
            */
            DbObjectFilter: function(coll) {
              var clientSideFilter = this.clientSideFilter = new Backgrid.Extension.ClientSideFilter({
                collection: coll,
                placeholder: gettext('Search by object type or name'),

                // The model fields to search for matches
                fields: ['object_type', 'name'],

                // How long to wait after typing has stopped before searching can start
                wait: 150,
              });
              return clientSideFilter;
            },

            //Enable Disable Next button of PrivilegePage
            updateButtons: function(modified) {
              if (!modified)
                $('.wizard-next').prop('disabled', true);
              else
                $('.wizard-next').prop('disabled', false);
            },

            /**
              Callback called when an errorModel is set
              with invalid value and errormsg is set into
              status bar element and next button is disabled
            */
            onSessionInvalid: function(msg) {
              $('.pg-prop-status-bar .alert-text').html(msg);
              $('.pg-prop-status-bar').css('visibility', 'visible');

              // Enable disable Next button
              this.updateButtons(false);
              return true;
            },

            /**
              Callback called when anything is set into model
              thus hide error msg element and enable next button
              status bar element and next button is disabled
            */
            onSessionValidated: function(sessHasChanged) {
              $('.pg-prop-status-bar .alert-text').empty();
              $('.pg-prop-status-bar').css('visibility', 'hidden');

              // Enable disable Next button
              this.updateButtons(sessHasChanged);
            },

            /**
              Remove/Delete objects, attributes
              in wizard on wizard close or finish
              to reclaim memory
            */
            releaseObjects: function() {
              var self = this;

              if (!_.isUndefined(self.dbObjectFilter)) {
                self.dbObjectFilter.remove();
                self.dbObjectFilter = undefined;
              }

              if (!_.isUndefined(self.clientSideFilter)) {
                self.clientSideFilter.remove();
                self.clientSideFilter = undefined;
              }

              // clear object priv array
              if (!_.isNull(self.obj_priv) &&
                !_.isUndefined(self.obj_priv)) {
                self.obj_priv = [];
                delete self.obj_priv;
              }

              // Delete Wizard Pages, clear model and cleanup view
              if (!_.isUndefined(self.dbObjectTypePage) &&
                !_.isNull(self.dbObjectTypePage)) {
                if (!_.isUndefined(self.dbObjectTypePage.get('model')) &&
                  !_.isNull(self.dbObjectTypePage.get('model'))) {
                  self.dbObjectTypePage.get('model').clear();
                  self.dbObjectTypePage.get('view').cleanup();
                  self.dbObjectTypePage = undefined;
                }
              }

              if (!_.isUndefined(self.privilegePage) &&
                !_.isNull(self.privilegePage)) {
                if (!_.isUndefined(self.privilegePage.get('model')) &&
                  !_.isNull(self.privilegePage.get('model'))) {
                  self.privilegePage.get('model').clear();
                  self.privilegePage.get('view').cleanup();
                  self.privilegePage = undefined;
                }
              }

              if (!_.isUndefined(self.reviewSQLPage) &&
                !_.isNull(self.reviewSQLPage)) {
                if (!_.isUndefined(self.reviewSQLPage.get('model')) &&
                  !_.isNull(self.reviewSQLPage.get('model'))) {
                  self.reviewSQLPage.get('model').clear();
                  self.reviewSQLPage = undefined;
                }
              }

              // Remove Sql control
              if (!_.isUndefined(self.sqlControl)) {
                self.sqlControl.remove();
              }

              // Clear privModel
              if (!_.isNull(self.privModel) &&
                !_.isUndefined(self.privModel)) {
                self.privModel.clear();
              }

              // Remove collection containing db object data
              if (!_.isNull(self.coll) &&
                !_.isUndefined(self.coll)) {
                self.coll.reset();
                self.coll = undefined;
              }
              // Delete Wizard
              if (!_.isNull(self.wizard) &&
                !_.isUndefined(self.wizard)) {
                self.wizard.collection.reset();
                self.wizard.curr_page = undefined;
              }

            },

            /**
              Every time a wizard is opened, this function
              is called everytime. It has Wizard Pages which
              are rendered by the Wizard Class:

              @class {pgBrowser.WizardPage} dbObjectType1 - This page
              @extends {Backbone.Model}
              renders a grid of Database Object Types such as
                Schemas, Views and Sequences etc.

              @class {pgBrowser.WizardPage} WizardPage2 - This page
              @extends {Backbone.Model}
              adds Privilege Control which provides grant privileges
              such as "Create, Insert, Delete, Update" so on the
              database objects selected on Wizard Pages.

              @class {pgBrowser.WizardPage} WizardPage3 - This page
              displays the generated GRANT SQL query for the Db
              objects selected with the specific privileges added to it.
              @extends {Backbone.Model}

              @class {Backbone.Collection} WizardCollection - It is the
              collection of wizard pages

              @class {pgBrowser.Wizard} wizard - Its task is:
              - Create a Wizard
              - Add Buttons, Callbacks to it.
              - Render WizardPages
              @extends {Backbone.View}

            */
            build: function() {
              this.elements.content.appendChild($container.get(0));
              Alertify.pgDialogBuild.apply(this);
            },

            //Returns list of Acls defined for nodes
            get_json_data: function(gid, sid, did) {
              return $.ajax({
                async: false,
                url: url_for(
                  'grant_wizard.acl', {
                    'sid': encodeURI(sid),
                    'did': encodeURI(did),
                  }
                ),
                dataType: 'json',
              });

            },

            prepare: function() {
              var that = this;
              $container.empty().append('<div class=\'grant_wizard_container\'></div>');

              // Define el for wizard view
              var el = $('.grant_wizard_container');

              // Extract the data from the selected tree node
              var t = pgBrowser.tree,
                i = t.selected(),
                d = this.d = i && i.length == 1 ? t.itemData(i) : undefined,
                info = this.info = pgBrowser.Node.getTreeNodeHierarchy(i);

              if(_.isUndefined(d))
                return;
              /**
                Generate a URL using:
                gid, did, sid(server id), node_id(node id),
                node_(node name), node_type(node type)
                and pass it to collection which will fetch Object Type properties.
              */
              var gid = info['server_group']._id,
                sid = info.server._id,
                did = info.database._id,
                node_id = d._id,

                /**
                  get node name only. used in mapping with object types defined
                  in allowed_acl.json
                 */
                node_type = d._type.replace('coll-', '').replace(
                  'materialized_', ''
                );

              // Fetch privileges specific to nodes
              var json_data = this.get_json_data(gid, sid, did);
              var privDict = JSON.parse(json_data.responseText);

              // Collection url to fetch database object types for objects field
              var baseUrl = url_for(
                  'grant_wizard.objects', {
                    'sid': encodeURI(sid),
                    'did': encodeURI(did),
                    'node_id': encodeURI(node_id),
                    'node_type': encodeURI(node_type),
                  }),
                // Model's save url
                saveUrl = url_for(
                  'grant_wizard.apply', {
                    'sid': encodeURI(sid),
                    'did': encodeURI(did),
                  }),
                Coll = Backbone.Collection.extend({
                  model: DatabaseObjectModel,
                  url: baseUrl,
                }),
                // Create instances of collection and filter
                coll = this.coll = new Coll(),
                self = this;

              // Generate encoded url based on wizard type
              this.msql_url = url_for(
                'grant_wizard.modified_sql', {
                  'sid': encodeURI(sid),
                  'did': encodeURI(did),
                });

              coll.comparator = function(model) {
                return model.get('object_type');
              };

              coll.sort();
              this.dbObjectFilter = this.DbObjectFilter(coll);
              coll.fullCollection = this.dbObjectFilter.shadowCollection;

              /**
                privArray holds objects selected which further helps
                in creating privileges Model
              */
              self.privArray = [];

              /**
                Override backgrid listener "backgrid:selected" to
                Add/Remove model to/from objects collection
              */
              coll.on('backgrid:selected', function(model, selected) {
                model.set('selected', selected);
                var object_type = model.get('object_type');
                switch (object_type) {
                case 'Function':
                  object_type = 'function';
                  break;
                case 'Trigger Function':
                  object_type = 'function';
                  break;
                case 'Procedure':
                  object_type = 'procedure';
                  break;
                case 'Table':
                  object_type = 'table';
                  break;
                case 'Sequence':
                  object_type = 'sequence';
                  break;
                case 'View':
                  object_type = 'table';
                  break;
                case 'Materialized View':
                  object_type = 'table';
                  break;
                default:
                  break;
                }

                /**
                  if a row (checkbox) is checked, add that model
                  into collection, when unchecked remove it from
                  model.

                  Also push/pop object type in/from privArray
                */
                if (selected) {
                  if (_.indexOf(self.privArray, object_type) == -1)
                    self.privArray.push(object_type);
                  newModel.get('objects').add(model, {
                    silent: true,
                  });
                } else {
                  var idx = self.privArray.indexOf(object_type);
                  if (idx != -1)
                    self.privArray.splice(idx, 1);
                  newModel.get('objects').remove(model);
                }

                // validate model on checkbox check/uncheck
                var msg = model.validate.call(newModel);

                /**
                  If no object type is selected, set error msg
                  and disable next button, else enable next button
                */
                if (msg)
                  self.onSessionInvalid.call(self, msg);
                else
                  self.onSessionValidated.call(self, true);
              });

              /**
                It is the main model with schema defined
                Every time a new wizard is opened,
                a new model should create.
              */
              var GrantWizardModel = pgNode.Model.extend({
                defaults: {
                  objects: undefined,
                  acl: undefined,
                },
                schema: [{
                  id: 'objects',
                  label: gettext('Objects'),
                  model: DatabaseObjectModel,
                  type: 'collection',
                  group: gettext('Objects'),
                },
                {
                  id: 'acl',
                  label: gettext('Privileges'),
                  model: pgBrowser.Node.PrivilegeRoleModel,
                  type: 'collection',
                  canAdd: true,
                  canDelete: true,
                  control: 'unique-col-collection',
                },
                ],
                urlRoot: saveUrl,
              });

              /**
                Create instance of GrantWizard Model, provide urlRoot
                node_info object, Generate fields objects
              */
              var newModel = new GrantWizardModel({}, {
                node_info: info,
              });

              /**
                Fetch data from server and set into grid
                and show/hide progress bar
              */
              $('.wizard-progress-bar p').show();

              var fetchAjaxHook = function() {
                $('.wizard-progress-bar p').removeClass('alert-danger').addClass('alert-info');
                $('.wizard-progress-bar p').text(gettext('Please wait while fetching records...'));
                coll.fetch({
                  success: function(c, xhr) {
                    $('.wizard-progress-bar p').html('');
                    $('.wizard-progress-bar').hide();
                    c.set(xhr.result, {parse: true});
                    // If some objects failed while fetching then we will notify the user
                    if (xhr && xhr.info && xhr.info !== '') {
                      $('.pg-prop-status-bar .alert-text').html(xhr.info);
                      $('.pg-prop-status-bar').css('visibility', 'visible');
                    }
                  },
                  error: function(model, xhr, options) {
                    // If the main request fails as whole then
                    $('.wizard-progress-bar p').removeClass('alert-info').addClass('alert-danger');
                    $('.wizard-progress-bar p').text(gettext('Unable to fetch the database objects'));

                    Alertify.pgNotifier(
                      options.textStatus, xhr,
                      gettext('Unable to fetch the database objects'),
                      function(msg) {
                        if(msg === 'CRYPTKEY_SET') {
                          fetchAjaxHook();
                        } else {
                          $('.wizard-progress-bar p').removeClass('alert-info').addClass('alert-danger');
                          $('.wizard-progress-bar p').text(msg);
                        }
                      }
                    );
                  },
                  reset: true,
                }, this);
              };
              fetchAjaxHook();

              //////////////////////////////////////////////////////////////////////
              //                                                                  //
              //            Wizard Page for Db Object Type                        //
              //                                                                  //
              //////////////////////////////////////////////////////////////////////

              /**
                Create wizard page. It renders a grid of
                Database Object Types such as
                Schemas, Views and Sequences etc.
                Set default values
              */
              var dbObjectTypePage = self.dbObjectTypePage = new pgBrowser.WizardPage({
                id: 1,
                page_title: gettext('Object Selection (step 1 of 3)'),
                disable_prev: true,
                disable_next: true,
                show_description: '',
                show_progress_bar: gettext('Please wait while fetching records...'),
                model: newModel,
                view: new(function() {

                  // Set page Instance
                  var pageView = this;

                  _.extend(pageView, {

                    // Remove grid if it is before render
                    cleanup: function() {
                      if (this.grid) {
                        this.grid.remove();
                        delete this.grid;
                        this.grid = null;
                      }

                      // Remove grid element if exists
                      if (this.el) {
                        $(this.el).remove();
                        delete this.el;
                      }
                    },

                    // Delete grid before render
                    grid: null,

                    render: function() {

                      // Create a grid container
                      var gridBody =
                        $(`
                        <div class="db_objects_container pg-el-xs-12">
                          <div class="db_objects_header d-flex py-1">
                            <div>` + gettext('Please select the objects to grant privileges to from the list below.') + `</div>
                            <div class="db_objects_filter ml-auto">
                              <div class="input-group">
                                <div class="input-group-prepend">
                                  <span class="input-group-text fa fa-search" id="labelSearch"></span>
                                </div>
                                <input type="search" class="form-control" id="txtGridSearch" placeholder="` + gettext('Search') + '" aria-label="' + gettext('Search') + `" aria-describedby="labelSearch">
                              </div>
                            </div>
                          </div>
                          <div class="db_objects_grid"></div>
                        </div>`);

                      // Remove grid if exits before render
                      if (this.grid) {
                        this.cleanup();
                      }

                      // Initialize a new Grid instance
                      this.grid = new Backgrid.Grid({
                        columns: _.clone(columns),
                        collection: coll,
                        className: 'backgrid presentation table table-bordered table-hover object_type_table',
                      });

                      // Render selection Type grid and paginator
                      gridBody.find('.db_objects_grid').append(this.grid.render().$el);

                      // Render Search Filter
                      self.clientSideFilter.setCustomSearchBox(gridBody.find('#txtGridSearch'));

                      // Assign gridBody content to page element
                      this.el = gridBody;

                      /**
                        Fetch selected models from collection and
                        make rows checked in grid
                      */
                      newModel.get('objects').each(function(m) {
                        var model = coll.get(m.get('object_id'));
                        if (model) {
                          coll.trigger('backgrid:selected', model, true);
                        }
                      });

                      // Refresh grid to re render rows.
                      coll.trigger('backgrid:refresh');

                      return this;
                    },
                  });
                }),

                beforeNext: function(obj) {
                  var ctx = this;
                  obj.options.disable_next = true;

                  /**
                    Enable/Disable next button of privilegePage if objects
                    are present in model
                  */
                  if (!_.isNull(newModel.get('acl')) &&
                    !_.isUndefined(newModel.get('acl'))) {
                    if (newModel.get('acl').length > 0)
                      obj.collection.at(1).set('disable_next', false);
                  }

                  // Clean the view
                  if (ctx.view) {
                    ctx.view.cleanup();
                    delete ctx.view;
                    ctx.view = null;
                  }
                  return true;
                },

              });

              //////////////////////////////////////////////////////////////////////
              //                                                                  //
              //            Wizard Page for Privilege Control                     //
              //                                                                  //
              //////////////////////////////////////////////////////////////////////

              // Wizard for Privelege control
              var privilegePage = self.privilegePage = new pgBrowser.WizardPage({
                id: 2,
                page_title: gettext('Privilege Selection (step 2 of 3)'),
                show_description: gettext('Please add the required privileges for the selected objects.'),
                disable_next: true,
                model: newModel,

                // Create a view function object
                view: new(function() {
                  var pageView = this;
                  _.extend(pageView, {

                    // Render Privelege control to generate its html markup
                    render: function() {

                      var obj_priv = [];
                      self.privArray = _.uniq(self.privArray);
                      _.each(self.privArray, function(priv) {
                        self.obj_priv = obj_priv = _.union(obj_priv, privDict[priv].acl);
                      });

                      /**
                        Define PrivModel and its instance.
                        Privileges array is generated based on
                        the type of nodes selected.
                       */
                      var PrivModel = pgNode.Model.extend({
                        defaults: {
                          acl: undefined,
                        },
                        schema: [{
                          id: 'acl',
                          label: gettext('Privileges'),
                          model: pgBrowser.Node.PrivilegeRoleModel.extend({

                            // privileges are selected based on node clicked
                            privileges: obj_priv,
                          }),
                          uniqueCol: ['grantee', 'grantor'],
                          editable: true,
                          type: 'collection',
                          canAdd: true,
                          canDelete: true,
                          control: 'unique-col-collection',
                        } ],
                      });

                      /**
                        When privelege control is re-rendered, in order to
                        render privileges based on object type selected,
                        delete privileges from privModel which are now not
                        present in object privileges array(object_priv)
                       */
                      var data = {};
                      if (self.privModel) {
                        data = self.privModel.toJSON();
                        var rolePrivs = data['acl'];
                        if (!_.isUndefined(rolePrivs) && rolePrivs.length > 0) {
                          for (var idx in rolePrivs) {
                            var rolePriv = (rolePrivs[idx])['privileges'],
                              removeIdx = [],
                              j;

                            for (j in rolePriv) {
                              var p = rolePriv[j];
                              if (_.indexOf(obj_priv, p['privilege_type']) == -1) {
                                removeIdx.push(j);
                              }
                            }

                            for (j in removeIdx) {
                              rolePriv.splice(j, 1);
                            }
                          }
                        } else {
                          console.warn('Acls are not defined');
                        }
                      }

                      // Instantiate privModel
                      self.privModel = new PrivModel(data, {
                        node_info: self.info,
                      });

                      /*
                      To track changes into model, start new session
                      and Add event listener for privileges control
                      */
                      self.privModel.startNewSession();
                      self.privModel.on('pgadmin-session:valid', self.onSessionValidated.bind(self));
                      self.privModel.on('pgadmin-session:invalid', self.onSessionInvalid.bind(self));

                      /**
                        Create Field Object which has properties like
                        node_data, node_info which is required for rendering
                        Privilege control
                        */
                      var fields = Backform.generateViewSchema(
                        self.info, self.privModel, 'create', self.d._type, self.d
                      );
                      var privilegesField = new Backform.Field(fields[0].fields[0]);

                      this.privControl = new(privilegesField.get('control'))({
                        field: privilegesField,
                        model: self.privModel,
                      });

                      return {
                        el: this.privControl.render().$el,
                      };
                    },

                    // Remove the privilege control
                    cleanup: function() {
                      if (this.privControl) {
                        this.privControl.remove();
                        delete this.privControl;
                        this.privControl = null;
                      }
                    },
                  });
                }),

                beforePrev: function(wizardObj) {

                  // Remove the privilege control
                  if (this.view) {
                    this.view.cleanup();
                    delete this.view;
                    this.view = null;
                  }

                  /**
                    Enable/Disable next button of DbObjectType page if objects
                    are present in model
                   */
                  var objectsModel = newModel.get('objects');

                  if (!_.isUndefined(objectsModel) && !_.isEmpty(objectsModel) &&
                    objectsModel.length > 0) {
                    wizardObj.collection.at(0).set('disable_next', false);

                    // Don't show progress bar
                    wizardObj.collection.at(0).set('show_progress_bar', '');
                  }

                  /**
                    We're re-rendering the controls as they are deleted
                    before heading to next page
                    Refresh Backgrid to re-render the elements selected
                    re-render Filter
                  */
                  newModel.trigger('backgrid:refresh', newModel, false);
                  self.clientSideFilter.render();
                  return true;
                },

                beforeNext: function() {
                  return true;
                },

                onNext: function() {

                  // Assign acls of privModel to main model newModel
                  if (!_.isUndefined(self.privModel)) {
                    newModel.set({
                      'acl': self.privModel.get('acl'),
                    });
                  }

                  // Remove the privilege control
                  if (this.view) {
                    this.view.cleanup();
                    delete this.view;
                    this.view = null;
                  }

                  // Enable finish button
                  self.wizard.options.disable_finish = false;

                  /**
                    triggers to get SQL queries data to render
                    into the reviewSQLPage
                  */
                  newModel.trigger('pgadmin-wizard:nextpage:sql', {
                    'node_type': node_type,
                  });
                },
              });


              //////////////////////////////////////////////////////////////////////
              //                                                                  //
              //            Review SQL Query Page                                 //
              //                                                                  //
              //////////////////////////////////////////////////////////////////////

              //Create SqlField Object
              var sqlField = new Backform.Field({
                  id: 'sqltab',
                  label: gettext('Sql Tab'),

                  /**
                    Extend 'SqlTabControl' to define new
                    function 'onWizardNextPageChange'
                    which gets triggered on next button
                    click to fetch generated SQL query
                    for the selected db objects.
                  */
                  control: Backform.SqlTabControl.extend({
                    initialize: function() {

                      // Initialize parent class
                      Backform.SqlTabControl.prototype.initialize.apply(this, arguments);

                      this.msql_url = self.msql_url;

                      // define trigger events for prev and next page
                      this.model.on('pgadmin-wizard:nextpage:sql', this.onWizardNextPageChange, this);
                      this.model.on('pgadmin-wizard:prevpage:sql', this.onWizardPrevPageChange, this);
                    },

                    // This method fetches the modified SQL for the wizard
                    onWizardNextPageChange: function() {

                      var ctx = this;

                      // Fetches modified SQL
                      $.ajax({
                        url: this.msql_url,
                        type: 'POST',
                        cache: false,
                        data: JSON.stringify(ctx.model.toJSON(true)),
                        dataType: 'json',
                        contentType: 'application/json',
                      }).done(function(res) {
                        ctx.sqlCtrl.clearHistory();
                        ctx.sqlCtrl.setValue(res.data);
                        ctx.sqlCtrl.refresh();
                      }).fail(function() {
                        ctx.model.trigger('pgadmin-view:msql:error');
                      }).always(function() {
                        ctx.model.trigger('pgadmin-view:msql:fetched');
                      });
                    },

                    remove: function() {

                      // Clear html dom elements of CodeMirror sql tab
                      self.sqlControl.unbind(); // Unbind all local event bindings
                      var cmElem = self.sqlControl.sqlCtrl.getWrapperElement();
                      $(cmElem).remove();
                      self.sqlControl.sqlCtrl = undefined;
                    },

                  }),
                }),

                /**
                  Create sqlField view instance
                  to render it into wizard page
                */
                sqlControl = self.sqlControl = new(sqlField.get('control'))({
                  field: sqlField,
                  model: newModel,
                });

              // Wizard for SQL tab control
              var reviewSQLPage = self.reviewSQLPage = new pgBrowser.WizardPage({
                id: 3,
                page_title: gettext('Final (Review Selection) (step 3 of 3)'),
                show_description: gettext('The SQL below will be executed on the ' +
                  'database server to grant the selected privileges. ' +
                  'Please click on <strong>Finish</strong> to complete the process.'),
                model: newModel,
                view: new(function() {

                  // Render SqlTab control to generate its html markup
                  var sqlCtrlHtml = sqlControl.render().$el;
                  sqlCtrlHtml.addClass('h-100');
                  this.render = function() {
                    return {
                      el: sqlCtrlHtml,
                    };
                  };
                }),

                beforePrev: function(wizardObj) {

                  /**
                    Enable next button if privilege
                    model is not empty else disable
                    next button
                   */
                  var aclModel = newModel.get('acl');

                  if (!_.isUndefined(wizardObj.collection) &&
                    wizardObj.collection.models.length > 0) {
                    if (!_.isUndefined(aclModel) && !_.isEmpty(aclModel) &&
                      aclModel.length > 0) {
                      wizardObj.collection.at(1).set('disable_next', false);
                    } else {
                      wizardObj.collection.at(1).set('disable_next', true);
                    }

                    return true;
                  }
                },
              });


              // Create Wizard Collection of Wizard Pages
              var WizardCollection = Backbone.Collection.extend({
                model: pgBrowser.WizardPage,
              });

              // It holds all the wizard pages to be rendered
              this.wizardCollection = new WizardCollection(
                [dbObjectTypePage, privilegePage, reviewSQLPage]
              );

              /**
                Create wizard which has following operations:
                - renders wizard pages
                - defines the first page to render in wizard
                - Save the model on finishbutton
                - Remove wizard on cancel button
                */
              self.wizard = new(pgBrowser.Wizard.extend({
                options: {
                  title: gettext('Grant Wizard'),
                  /* Main Wizard Title */
                  width: '',
                  height: '',
                  curr_page: 0,
                  show_left_panel: false,
                  show_header_cancel_btn: true,
                  show_header_maximize_btn: true,
                  disable_finish: true,
                  dialog_api: that,
                  wizard_help: url_for(
                    'help.static', {
                      'filename': 'grant_wizard.html',
                    }
                  ),
                },

                // Callback for finish button
                onFinish: function() {
                  var m = newModel,
                    grant_data = m.toJSON('GET');

                  // Save model
                  if (grant_data && !_.isEmpty(grant_data) && !_.isUndefined(grant_data.objects)) {
                    m.save({}, {
                      attrs: grant_data,
                      validate: false,
                      cache: false,
                      success: function() {

                        // Release wizard objects
                        self.releaseObjects();
                        self.close();
                      },
                      error: function(model, jqxhr) {
                        Alertify.pgNotifier(
                          'error', jqxhr,
                          gettext('Error saving properties')
                        );

                        // Release wizard objects
                        self.releaseObjects();
                        self.close();
                      },
                    });
                  }
                },

                // Callback for cancel button
                onCancel: function() {

                  // Release wizard objects
                  self.releaseObjects();
                  self.close();
                },
              }))({
                collection: this.wizardCollection,
                el: el,
                model: newModel,
              });

              // Render wizard
              self.wizard.render();
            },
          };
        });
      }
      // Call Grant Wizard Dialog and set dimensions for wizard
      Alertify.wizardDialog(true).resizeTo(pgBrowser.stdW.lg,pgBrowser.stdH.lg);
    },
  };

  return pgBrowser.GrantWizard;
});
