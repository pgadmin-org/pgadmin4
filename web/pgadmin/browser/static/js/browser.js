/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import MainMenuFactory from './MainMenuFactory';
import _ from 'lodash';
import { checkMasterPassword, showQuickSearch } from '../../../static/js/Dialogs/index';
import { pgHandleItemError } from '../../../static/js/utils';
import { send_heartbeat, stop_heartbeat } from './heartbeat';
import getApiInstance from '../../../static/js/api_instance';
import usePreferences, { setupPreferenceBroadcast } from '../../../preferences/static/js/store';
import checkNodeVisibility from '../../../static/js/check_node_visibility';

define('pgadmin.browser', [
  'sources/gettext', 'sources/url_for', 'sources/pgadmin',
  'sources/csrf', 'pgadmin.authenticate.kerberos',
  'pgadmin.browser.utils', 'pgadmin.browser.messages',
  'pgadmin.browser.node', 'pgadmin.browser.collection', 'pgadmin.browser.activity',
  'pgadmin.browser.keyboard', 'sources/tree/pgadmin_tree_save_state',
], function(
  gettext, url_for, pgAdmin, csrfToken, Kerberos,
) {
  let pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};
  let select_object_msg = gettext('Please select an object in the tree view.');

  csrfToken.setPGCSRFToken(pgAdmin.csrf_token_header, pgAdmin.csrf_token);

  Kerberos.validate_kerberos_ticket();

  // Extend the browser class attributes
  _.extend(pgAdmin.Browser, {
    // The base url for browser
    URL: url_for('browser.index'),
    docker:null,
    // Reversed Engineer query for the selected database node object goes
    // here
    editor:null,
    // Left hand browser tree
    tree:null,
    // list of script to be loaded, when a certain type of node is loaded
    // It will be used to register extensions, tools, child node scripts,
    // etc.
    scripts: {},
    // Standard Widths and Height for dialogs in px
    stdW: {
      sm: 500,
      md: 700,
      lg: 900,
      default: 500,
      // If you change above values then make sure to update
      // calc method logic
      calc: (passed_width) => {
        let iw = window.innerWidth;
        if(iw > passed_width)
          return passed_width;
        else if (iw > pgAdmin.Browser.stdW.lg)
          return pgAdmin.Browser.stdW.lg;
        else if (iw > pgAdmin.Browser.stdW.md)
          return pgAdmin.Browser.stdW.md;
        else if (iw > pgAdmin.Browser.stdW.sm)
          return pgAdmin.Browser.stdW.sm;
        else
          // if avilable screen resolution is still
          // less then return the width value as it
          return iw;
      },
    },
    stdH: {
      sm: 200,
      md: 400,
      lg: 550,
      default: 550,
      // If you change above values then make sure to update
      // calc method logic
      calc: (passed_height) => {
        // We are excluding sm as it is too small for dialog
        let ih = window.innerHeight;
        if (ih > passed_height)
          return passed_height;
        else if (ih > pgAdmin.Browser.stdH.lg)
          return pgAdmin.Browser.stdH.lg;
        else if (ih > pgAdmin.Browser.stdH.md)
          return pgAdmin.Browser.stdH.md;
        else
          // if avilable screen resolution is still
          // less then return the height value as it
          return ih;
      },
    },
    // Default panels
    panels: {},
    // We also support showing dashboards, HTML file, external URL
    frames: {},
    /* Menus */
    // add_menus(...) will register all the menus
    // in this container
    all_menus_cache: {
      // All context menu goes here under certain menu types.
      // i.e. context: {'server': [...], 'server-group': [...]}
      context: {},
      // File menus
      file: {},
      // Edit menus
      edit: {},
      // Object menus
      object: {},
      // Management menus
      management: {},
      // Tools menus
      tools: {},
      // Help menus
      help: {},
    },
    MainMenus: [],
    BrowserContextMenu: [],

    menu_categories: {
      /* name, label (pair) */
      'register': {
        name: 'register',
        label: gettext('Register'),
        priority: 1,
        /* separator above this menu */
        above: false,
        below: true,
        /* icon: 'fa fa-magic', */
        single: true,
      },
      'create': {
        name: 'create',
        label: gettext('Create'),
        priority: 2,
        /* separator above this menu */
        above: false,
        below: true,
        /* icon: 'fa fa-magic', */
        single: true,
      },
    },
    // A callback to load/fetch a script when a certain node is loaded
    register_script: function(n, m, p) {
      let scripts = this.scripts;
      scripts[n] = _.isArray(scripts[n]) ? scripts[n] : [];
      scripts[n].push({'name': m, 'path': p, loaded: false});
    },
    masterpass_callback_queue: [],
    // Enable/disable menu options
    enable_disable_menus: function(item) {
      MainMenuFactory.enableDisableMenus(item);
    },
    init: function() {
      let obj=this;
      if (obj.initialized) {
        return;
      }
      obj.initialized = true;

      // Cache preferences
      usePreferences.getState().cache();
      setupPreferenceBroadcast();

      setTimeout(function() {
        obj?.editor?.setValue('-- ' + select_object_msg);
        obj?.editor?.refresh();
      }, 10);

      // Register scripts and add menus
      pgBrowser.utils.registerScripts(this);

      // Ping the server every 5 minutes
      setInterval(function() {
        getApiInstance().post(
          url_for('misc.cleanup')
        ).then(()=> {
          /*This is intentional (SonarQube)*/
        }).catch(function() {
          /*This is intentional (SonarQube)*/
        });
      }, 300000);

      obj.Events.on(
        'pgadmin:server:connected', send_heartbeat.bind(obj)
      );

      obj.Events.on(
        'pgadmin:server:disconnect', stop_heartbeat.bind(obj)
      );

      obj.check_corrupted_db_file();
      obj.Events.on('pgadmin:browser:tree:add', obj.onAddTreeNode.bind(obj));
      obj.Events.on('pgadmin:browser:tree:update', obj.onUpdateTreeNode.bind(obj));
      obj.Events.on('pgadmin:browser:tree:refresh', obj.onRefreshTreeNodeReact.bind(obj));
      obj.Events.on('pgadmin-browser:tree:loadfail', obj.onLoadFailNode.bind(obj));
      obj.bind_beforeunload();

      /* User UI activity */
      obj.log_activity(); /* The starting point */
      obj.register_to_activity_listener(document);
      obj.start_inactivity_timeout_daemon();
    },
    uiloaded: function() {
      this.set_master_password('');
      this.check_version_update();
    },
    check_corrupted_db_file: function() {
      getApiInstance().get(
        url_for('browser.check_corrupted_db_file')
      ).then(({data: res})=> {
        if(res.data.length > 0) {

          pgAdmin.Browser.notifier.alert(
            'Warning',
            'pgAdmin detected unrecoverable corruption in it\'s SQLite configuration database. ' +
            'The database has been backed up and recreated with default settings. '+
            'It may be possible to recover data such as query history manually from '+
            'the original/corrupt file using a tool such as DB Browser for SQLite if desired.'+
            '<br><br>Original file: ' + res.data + '<br>Replacement file: ' +
            res.data.substring(0, res.data.length - 14),
          );
        }
      }).catch(function(error) {
        pgAdmin.Browser.notifier.alert(error);
      });
    },
    check_master_password: function(on_resp_callback) {
      getApiInstance().get(
        url_for('browser.check_master_password')
      ).then(({data: res})=> {
        if(on_resp_callback) {
          if(res.data) {
            on_resp_callback(true);
          } else {
            on_resp_callback(false);
          }
        }
      }).catch(function(error) {
        pgAdmin.Browser.notifier.pgRespErrorNotify(error);
      });
    },

    reset_master_password: function() {
      let self = this;
      getApiInstance().delete(
        url_for('browser.set_master_password')
      ).then(({data: res})=> {
        if(!res.data) {
          self.set_master_password('');
        }
      }).catch(function(error) {
        pgAdmin.Browser.notifier.pgRespErrorNotify(error);
      });
    },

    set_master_password: function(password='',
      set_callback=()=>{/*This is intentional (SonarQube)*/},
      cancel_callback=()=>{/*This is intentional (SonarQube)*/}) {
      let data=null, self = this;

      data = {
        'password': password,
      };

      self.masterpass_callback_queue.push(set_callback);
      // Check master passowrd.
      checkMasterPassword(data, self.masterpass_callback_queue, cancel_callback);
    },

    check_version_update: function() {
      getApiInstance().get(
        url_for('misc.upgrade_check')
      ).then((res)=> {
        const data = res.data.data;
        if(data.outdated) {
          pgAdmin.Browser.notifier.warning(
            `
            ${gettext('You are currently running version %s of %s, <br/>however the current version is %s.', data.current_version, data.product_name, data.upgrade_version)}
            <br/><br/>
            ${gettext('Please click <a href="%s" target="_new" style="color:inherit">here</a> for more information.', data.download_url)}
            `,
            null
          );
        }

      }).catch(function() {
        // Suppress any errors
      });
    },

    bind_beforeunload: function() {
      window.addEventListener('beforeunload', function(e) {
        /* Can open you in new tab */
        const prefStore = usePreferences.getState();
        let tree_save_interval = prefStore.getPreferences('browser', 'browser_tree_state_save_interval'),
          confirm_on_refresh_close = prefStore.getPreferences('browser', 'confirm_on_refresh_close');

        if (!_.isUndefined(tree_save_interval) && tree_save_interval.value !== -1)
          pgAdmin.Browser.browserTreeState.save_state();

        if(!_.isUndefined(confirm_on_refresh_close) && confirm_on_refresh_close.value) {
          /* This message will not be displayed in Chrome, Firefox, Safari as they have disabled it*/
          let msg = gettext('Are you sure you want to close the %s browser?', pgBrowser.utils.app_name);
          if(e.originalEvent?.returnValue) {
            e.originalEvent.returnValue = msg;
          }
          return msg;
        }
      });
    },

    add_menu_category: function({name, ...options}) {
      this.menu_categories[name] = {
        name: name,
        label: '(No Label)',
        priority: 10,
        icon: '',
        above: false,
        below: false,
        parent: null,
        isCategory: true,
        ...options,
      };
    },

    // Add menus of module/extension at appropriate menu
    add_menus: function(menus) {
      const self = this;
      let allMenus = this.all_menus_cache;

      _.each(menus, function(m) {
        _.each(m.applies, function(a) {
          /* We do support menu type only from this list */
          if(['context', 'file', 'edit', 'object','management', 'tools', 'help'].indexOf(a) > -1){
            // If current node is not visible in browser tree
            // then return from here
            if(!checkNodeVisibility(m.node)) {
              return;
            } else if(_.has(m, 'module') && !_.isUndefined(m.module)) {
              // If module to which this menu applies is not visible in
              // browser tree then also we do not display menu
              if(!checkNodeVisibility(m.module.type)) {
                return;
              }
            }
            const getFullPath = (currPath, currMenu)=>{
              if(currMenu.node) {
                return currPath.concat([currMenu.node]);
              } else if((currMenu.category??'common') != 'common') {
                const currCat = self.menu_categories[currMenu.category];
                if(currCat?.category) {
                  return getFullPath(currPath.concat([currMenu.category]), currCat);
                }
                return [currMenu.category].concat(currPath);
              } else {
                return currPath;
              }
            };

            let get_menuitem_obj = function(_m) {
              let enable = _m.enable;
              if(_m.enable == '') {
                enable = true;
              } else if(_.isString(_m.enable) && _m.enable.toLowerCase() == 'false') {
                enable = false;
              }

              // This is to handel quick search callback
              if(_m.name == 'mnu_quick_search_help') {
                _m.callback = () => {
                  showQuickSearch();
                };
              }

              return {
                name: _m.name,
                label: _m.label,
                module: _m.module,
                category: _m.category,
                callback: typeof _m.module == 'object' && _m.module[_m.callback] && _m.callback in _m.module[_m.callback] ? _m.module[_m.callback] : _m.callback,
                priority: _m.priority,
                data: _m.data,
                url: _m.url || '#',
                target: _m.target,
                icon: _m.icon,
                enable: enable || true,
                node: _m.node,
                checked: _m.checked,
                below: _m.below,
                applies: _m.applies,
              };
            };

            const menuPath = [a].concat(getFullPath([], m)).concat([m.name]);
            const _menus = _.set(allMenus, menuPath, get_menuitem_obj(m));

            if(m.menu_items) {
              let sub_menu_items = [];

              for(let mnu_val of m.menu_items) {
                sub_menu_items.push(get_menuitem_obj(mnu_val));
              }
              _menus[m.name]['menu_items'] = sub_menu_items;
            }
          } else  {
            console.warn(
              'Developer warning: Category \'' +
                  a +
                  '\' is not supported!\nSupported categories are: context, file, edit, object, tools, management, help'
            );
          }
        });
      });
    },
    _findTreeChildNode: function(_i, _d, _o) {
      let loaded = _o.t.wasLoad(_i),
        onLoad = function() {
          let items = _o.t.children(_i),
            i, d, n, idx = 0, size = items.length;
          for (; idx < size; idx++) {
            i = items[idx];
            d = _o.t.itemData(i);
            if (d._type === _d._type) {
              if (!_o.hasId || d._id == _d._id) {
                _o.i = i;
                _o.d = _d;
                _o.pathOfTreeItems.push({coll: false, item: i, d: _d});

                _o.success();
                return;
              }
            } else {
              n = _o.b.Nodes[d._type];
              // Are we looking at the collection node for the given node?
              if (
                n?.collection_node && d.nodes &&
                  _.indexOf(d.nodes, _d._type) != -1
              ) {
                _o.i = i;
                _o.d = null;
                _o.pathOfTreeItems.push({coll: true, item: i, d: d});

                // Set load to false when the current collection node's inode is false
                if (!_o.t.isInode(i)) {
                  _o.load = false;
                }
                _o.b._findTreeChildNode(i, _d, _o);
                return;
              }
            }
          }
          _o.notFound && typeof(_o.notFound) == 'function' &&
            _o.notFound(_d);
        };

      if (!loaded && _o.load) {
        _o.t.open(_i).then(
          () => {
            onLoad();
          },
          () => {
            let fail = _o?.o?.fail;
            if (fail && typeof(fail) == 'function') {
              fail.apply(_o.t, []);
            }
          }
        );
      } else if (loaded) {
        onLoad();
      } else {
        _o.notFound && typeof(_o.notFound) == 'function' &&
          _o.notFound(_d);
      }
    },

    onAddTreeNode: function(_data, _hierarchy, _opts) {
      let ctx = {
          b: this, // Browser
          d: null, // current parent
          hasId: true,
          i: null, // current item
          p: _.toArray(_hierarchy || {}).sort(
            function(a, b) {
              if (a.priority === b.priority) {
                return 0;
              }
              return (a.priority < b.priority ? -1 : 1);
            }
          ), // path of the parent
          pathOfTreeItems: [], // path Item
          t: this.tree, // Tree Api
          o: _opts,
        },
        traversePath = function() {
          let _ctx = this, data;

          _ctx.success = traversePath;
          if (_ctx.p.length) {
            data = _ctx.p.shift();
            // This is the parent node.
            // Replace the parent-id of the data, which could be different
            // from the given hierarchy.
            if (!_ctx.p.length) {
              data._id = _data._pid;
              _ctx.success = addItemNode;
            }
            _ctx.b._findTreeChildNode(
              _ctx.i, data, _ctx
            );
            // if parent node is null
            if (!_data._pid) {
              addItemNode.apply(_ctx, arguments);
            }
          }
          return true;
        }.bind(ctx),
        addItemNode = function() {
          // Append the new data in the tree under the current item.
          // We may need to pass it to proper collection node.
          let _ctx = this,
            first = (_ctx.i || this.t.wasLoad(_ctx.i)) &&
            this.t.first(_ctx.i),
            findChildNode = function(success, notFound) {
              let __ctx = this;
              __ctx.success = success;
              __ctx.notFound = notFound;

              __ctx.b._findTreeChildNode(__ctx.i, _data, __ctx);
            }.bind(_ctx),
            selectNode = function() {
              this.t.openPath(this.i);
              this.t.select(this.i);
              if (typeof(_ctx?.o?.success) == 'function') {
                _ctx.o.success.apply(_ctx.t, [_ctx.i, _data]);
              }
            }.bind(_ctx),
            addNode = function() {
              let __ctx = this,
                items = __ctx.t.children(__ctx.i),
                s = 0, e = items.length - 1, i,
                linearSearch = function() {
                  while (e >= s) {
                    i = items[s];
                    let d = __ctx.t.itemData(i);
                    if (d._type === 'column') {
                      if (pgAdmin.numeric_comparator(d._id, _data._id) == 1)
                        return true;
                    } else if (pgAdmin.natural_sort(d._label, _data._label) == 1)
                      return true;
                    s++;
                  }
                  //when the current element is greater than the end element
                  if (e != items.length - 1) {
                    i = items[e+1];
                    return true;
                  }
                  i = null;
                  return false;
                },
                binarySearch = function() {
                  let d, m;
                  // Binary search only outperforms Linear search for n > 44.
                  // Reference:
                  // https://en.wikipedia.org/wiki/Binary_search_algorithm#cite_note-30
                  //
                  // We will try until it's half.
                  while (e - s > 22) {
                    i = items[s];
                    d = __ctx.t.itemData(i);
                    if (d._type === 'column') {
                      if (pgAdmin.numeric_comparator(d._id, _data._id) != -1)
                        return true;
                    } else if (pgAdmin.natural_sort(d._label, _data._label) != -1)
                      return true;
                    i = items[e];
                    d = __ctx.t.itemData(i);
                    let result;
                    if (d._type === 'column') {
                      result = pgAdmin.numeric_comparator(d._id, _data._id);
                    } else {
                      result = pgAdmin.natural_sort(d._label, _data._label);
                    }
                    if (result !=1) {
                      if (e != items.length - 1) {
                        i = items[e+1];
                        return true;
                      }
                      i = null;
                      return false;
                    }
                    m = s + Math.round((e - s) / 2);
                    i = items[m];
                    d = __ctx.t.itemData(i);
                    if(d._type === 'column'){
                      result = pgAdmin.numeric_comparator(d._id, _data._id);
                    } else {
                      result = pgAdmin.natural_sort(d._label, _data._label);
                    }
                    //result will never become 0 because of remove operation
                    //which happens with updateTreeNode
                    if (result == 0)
                      return true;

                    if (result == -1) {
                      s = m + 1;
                      e--;
                    } else {
                      s++;
                      e = m - 1;
                    }
                  }
                  return linearSearch();
                };

              if (binarySearch()) {
                __ctx.t.before(i, _data).then((_item) => {
                  if (typeof(__ctx?.o?.success) == 'function') {
                    __ctx.o.success.apply(__ctx.t, [i, _data]);
                  } else {
                    __ctx.t.select(_item);
                  }
                }, () => {
                  console.warn('Failed to add before...', arguments);
                  if (typeof(__ctx.o?.fail) == 'function') {
                    __ctx.o.fail.apply(__ctx.t, [i, _data]);
                  }
                });
              } else {
                let _append = function() {
                  let ___ctx = this,
                    _parent_data = ___ctx.t.itemData(___ctx.i);

                  ___ctx.t.append(___ctx.i, _data).then(
                    (_i) => {
                      // Open the item path only if its parent is loaded
                      // or parent type is same as nodes
                      if(
                        ___ctx.t.wasLoad(___ctx.i) &&
                          _parent_data &&  _parent_data._type.search(
                          _data._type
                        ) > -1
                      ) {
                        ___ctx.t.open(___ctx.i);
                        ___ctx.t.select(_i);
                      } else if (_parent_data) {
                        // Unload the parent node so that we'll get
                        // latest data when we try to expand it
                        ___ctx.t.unload(___ctx.i).then(
                          () => {
                            ___ctx.t.open(___ctx.i);
                          }
                        );
                      }
                      if (typeof(___ctx?.o?.success) == 'function') {
                        ___ctx.o.success.apply(___ctx.t, [_i, _data]);
                      }
                    },
                    () => {
                      console.warn('Failed to append...', arguments);
                      if (typeof(___ctx?.o?.fail) == 'function') {
                        ___ctx.o.fail.apply(___ctx.t, [___ctx.i, _data]);
                      }
                    }
                  );
                }.bind(__ctx);

                if (__ctx.i && !__ctx.t.isInode(__ctx.i)) {
                  __ctx.t.setInode(__ctx.i).then(
                    () => {
                      _append();
                    }
                  );
                } else {
                  // Handle case for node without parent i.e. server-group
                  // or if parent node's inode is true.
                  _append();
                }
              }
            }.bind(_ctx);

          // Parent node do not have any children, let me unload it.
          if (!first && _ctx.t.wasLoad(_ctx.i)) {
            _ctx.t.unload(_ctx.i).then(() => {
              findChildNode(
                selectNode,
                function() {
                  let o = this && this.o;
                  if (typeof(o?.fail) == 'function') {
                    o.fail.apply(this.t, [this.i, _data]);
                  }
                }.bind(this)
              );
            },
            () => {
              let o = this && this.o;
              if (typeof(o?.fail) == 'function') {
                o.fail.apply(this.t, [this.i, _data]);
              }
            });
            return;
          }

          // We can find the collection node using _findTreeChildNode
          // indirectly.
          findChildNode(selectNode, addNode);
        }.bind(ctx);

      if (!ctx.t.wasInit() || !_data) {
        return;
      }

      traversePath();
    },

    onUpdateTreeNode: function(_old, _new, _hierarchy, _opts) {
      let ctx = {
          b: this, // Browser
          d: null, // current parent
          i: null, // current item
          hasId: true,
          p: _.toArray(_hierarchy || {}).sort(
            function(a, b) {
              if (a.priority === b.priority) {
                return 0;
              }
              return (a.priority < b.priority ? -1 : 1);
            }
          ), // path of the old object
          pathOfTreeItems: [], // path items
          t: this.tree, // Tree Api
          o: _opts,
          load: true,
          old: _old,
          new: _new,
          op: null,
        },
        errorOut = function() {
          let fail = this.o?.fail;
          if (fail && typeof(fail) == 'function') {
            fail.apply(this.t, [this.i, _new, _old]);
          }
        }.bind(ctx),
        deleteNode = function() {
          let self = this,
            pathOfTreeItems = this.pathOfTreeItems,
            findParent = function() {
              if (pathOfTreeItems.length) {
                pathOfTreeItems.pop();
                let length = pathOfTreeItems.length;
                this.i = (length && pathOfTreeItems[length - 1].item) || null;
                this.d = (length && pathOfTreeItems[length - 1].d) || null;

                // It is a collection item, let's find the node item
                if (length && pathOfTreeItems[length - 1].coll) {
                  pathOfTreeItems.pop();
                  length = pathOfTreeItems.length;
                  this.i = (length && pathOfTreeItems[length - 1].item) || null;
                  this.d = (length && pathOfTreeItems[length - 1].d) || null;
                }
              } else {
                this.i = null;
                this.d = null;
              }
            }.bind(this);

          let _item_parent = (this.i
            && this.t.hasParent(this.i)
              && this.t.parent(this.i)) || null,
            _item_grand_parent = _item_parent ?
              (this.t.hasParent(_item_parent)
              && this.t.parent(_item_parent) &&
              _item_parent.root != this.t.parent(_item_parent))
              : null;

          // Remove the current node first.
          if (
            this.i && this.d && this.old._id == this.d._id &&
              this.old._type == this.d._type
          ) {
            let _parent = this.t.parent(this.i) || null;

            // If there is no parent then just update the node
            if(this.t.isRootNode(_parent) ||
             (_parent && _parent.length == 0 && ctx.op == 'UPDATE')) {
              //Update node if browser has single child node.
              if(this.t.children().length === 1) {
                updateNode();
              } else {
                let that = this;
                this.t.remove(this.i).then(() => {
                  that.t.before(that.i, that.new).then((new_item) => {
                    that.t.select(new_item);
                  }, () => {
                    console.warn('Failed to add before..', arguments);
                  });
                });
              }
            } else {
              let postRemove = function() {
                // If item has parent but no grand parent
                if (_item_parent.path !== '/browser' && !_item_grand_parent) {
                  let parent = null;
                  // We need to search in all parent siblings (eg: server groups)
                  let parents = this.t.siblings(this.i) || [];
                  parents.push(this.i);
                  _.each(parents, function (p) {
                    let d = self.t.itemData(p);
                    // If new server group found then assign it parent
                    if(d._id == self.new._pid) {
                      parent = p;
                      self.pathOfTreeItems.push({coll: true, item: parent, d: d});
                    }
                  });

                  if (parent) {
                    this.load = true;

                    this.success = function() {
                      addItemNode();
                    };
                    // We can refresh the collection node, but - let's not bother about
                    // it right now.
                    this.notFound = errorOut;

                    let loaded = this.t.wasLoad(parent),
                      onLoad = function() {
                        self.i = parent;
                        self.pathOfTreeItems.push({coll: false, item: parent, d: self.d});
                        self.success();
                      };

                    if (!loaded && self.load) {
                      self.t.open(parent).then(
                        () => {
                          onLoad();
                        },
                        () => {
                          let fail = self?.o?.fail;
                          if (
                            fail && typeof(fail) == 'function'
                          ) {
                            fail.apply(self.t, []);
                          }
                        }
                      );
                    } else {
                      onLoad();
                    }
                  }
                } else {
                  // This is for rest of the nodes
                  let _parentData = this.d;
                  // Find the grand-parent, or the collection node of parent.
                  findParent();

                  if (this.i) {
                    this.load = true;

                    this.success = function() {
                      addItemNode();
                    };
                    // We can refresh the collection node, but - let's not bother about
                    // it right now.
                    this.notFound = errorOut;

                    // Find the new parent
                    this.b._findTreeChildNode(
                      this.i, {_id: this.new._pid, _type: _parentData._type}, this
                    );
                  } else {
                    addItemNode();
                  }
                }
              }.bind(this);

              this.t.remove(this.i).then(() => {
                findParent();
                if (_item_parent && !_item_grand_parent && _parent
                    && self.t.children(_parent).length == 0) {
                  self.t.unload(_parent).then( () => { setTimeout(postRemove); });
                }
                else {
                  setTimeout(postRemove);
                }
                return true;
              });
            }

          }
          errorOut();

        }.bind(ctx),
        findNewParent = function(_d) {
          let findParent = function() {
            let pathOfTreeItems = this.pathOfTreeItems;

            if (pathOfTreeItems.length) {
              pathOfTreeItems.pop();
              let length = pathOfTreeItems.length;
              this.i = (length && pathOfTreeItems[length - 1].item) || null;
              this.d = (length && pathOfTreeItems[length - 1].d) || null;

              // It is a collection item, let's find the node item
              if (length && pathOfTreeItems[length - 1].coll) {
                pathOfTreeItems.pop();
                length = pathOfTreeItems.length;
                this.i = (length && pathOfTreeItems[length - 1].item) || null;
                this.d = (length && pathOfTreeItems[length - 1].d) || null;
              }
            } else {
              this.i = null;
              this.d = null;
            }
          }.bind(this);

          // old parent was not found, can we find the new parent?
          if (this.i) {
            this.load = true;
            this.success = function() {
              addItemNode();
            };

            if (_d._type == this.old._type) {
              // We were already searching the old object under the parent.
              findParent();
              _d = this.d;
              // Find the grand parent
              findParent();
            }
            _d = this.new._pid;

            // We can refresh the collection node, but - let's not bother about
            // it right now.
            this.notFound = errorOut;

            // Find the new parent
            this.b._findTreeChildNode(this.i, _d, this);
          } else {
            addItemNode();
          }
        }.bind(ctx),
        updateNode = function() {
          if (
            this.i && this.d && this.new._type == this.d._type
          ) {
            let self = this,
              _id = this.d._id;
            if (this.new._id != this.d._id) {
              // Found the new oid, update its node_id
              let node_data = this.t.itemData(ctx.i);
              node_data._id = _id = this.new._id;
            }
            if (this.new._id == _id) {
              // Found the current
              _.extend(this.d, this.new);
              this.t.update(ctx.i, this.d);
              this.t.setLabel(ctx.i, {label: this.new.label});
              this.t.addIcon(ctx.i, {icon: this.new.icon});
              this.t.setId(ctx.i, {id: this.new.id});
              this.t.openPath(this.i);
              this.t.deselect(this.i);

              // select tree item
              self.t.select(self.i);
            }
          }
          let success = this.o?.success;
          if (success && typeof(success) == 'function') {
            success.apply(this.t, [this.i, _old, _new]);
          }
        }.bind(ctx),
        traversePath = function() {
          let _ctx = this, data;

          _ctx.success = traversePath;
          if (_ctx.p.length) {
            data = _ctx.p.shift();
            // This is the node, we can now do the required operations.
            // We should first delete the existing node, if the parent-id is
            // different.
            if (!_ctx.p.length) {
              if (_ctx.op == 'RECREATE') {
                _ctx.load = false;
                _ctx.success = deleteNode;
                _ctx.notFound = findNewParent;
              } else {
                _ctx.success = updateNode;
                _ctx.notFound = errorOut;
              }
            }
            _ctx.b._findTreeChildNode(
              _ctx.i, data, _ctx
            );
          } else if (_ctx.p.length == 1) {
            _ctx.notFound = findNewParent;
          }
          return true;
        }.bind(ctx),
        addItemNode = function() {
          let _ctx = this,
            first = (_ctx.i || this.t.wasLoad(_ctx.i)) &&
            this.t.first(_ctx.i),
            findChildNode = function(success, notFound) {
              let __ctx = this;
              __ctx.success = success;
              __ctx.notFound = notFound;

              __ctx.b._findTreeChildNode(__ctx.i, _new, __ctx);
            }.bind(_ctx),
            selectNode = function() {
              this.t.openPath(this.i);
              this.t.select(this.i);
              if (
                _ctx.o?.success && typeof(_ctx.o?.success) == 'function'
              ) {
                _ctx.o.success.apply(_ctx.t, [_ctx.i, _new]);
              }
            }.bind(_ctx),
            addNode = function() {
              let __ctx = this,
                items = __ctx.t.children(__ctx.i),
                s = 0, e = items.length - 1, i,
                linearSearch = function() {
                  while (e >= s) {
                    i = items[s];
                    let d = __ctx.t.itemData(i);
                    if (d._type === 'column') {
                      if (pgAdmin.numeric_comparator(d._id, _new._id) == 1)
                        return true;
                    } else if (pgAdmin.natural_sort(d._label, _new._label) == 1)
                      return true;
                    s++;
                  }
                  if (e != items.length - 1) {
                    i = items[e+1];
                    return true;
                  }
                  i = null;
                  return false;
                },
                binarySearch = function() {
                  while (e - s > 22) {
                    i = items[s];
                    let d = __ctx.t.itemData(i);
                    if (d._type === 'column') {
                      if (pgAdmin.numeric_comparator(d._id, _new._id) != -1)
                        return true;
                    } else if (pgAdmin.natural_sort(d._label, _new._label) != -1)
                      return true;
                    i = items[e];
                    d = __ctx.t.itemData(i);
                    let result;
                    if (d._type === 'column') {
                      result = pgAdmin.numeric_comparator(d._id, _new._id);
                    } else {
                      result = pgAdmin.natural_sort(d._label, _new._label);
                    }
                    if (result !=1) {
                      if (e != items.length - 1) {
                        i = items[e+1];
                        return true;
                      }
                      i = null;
                      return false;
                    }
                    let m = s + Math.round((e - s) / 2);
                    i = items[m];
                    d = __ctx.t.itemData(i);
                    if(d._type === 'column'){
                      result = pgAdmin.numeric_comparator(d._id, _new._id);
                    } else {
                      result = pgAdmin.natural_sort(d._label, _new._label);
                    }
                    //result will never become 0 because of remove operation
                    //which happens with updateTreeNode
                    if (result == 0)
                      return true;

                    if (result == -1) {
                      s = m + 1;
                      e--;
                    } else {
                      s++;
                      e = m - 1;
                    }
                  }
                  return linearSearch();
                };

              if (binarySearch()) {
                __ctx.t.before(i, _new).then((new_item) => {
                  __ctx.t.openPath(new_item);
                  __ctx.t.select(new_item);
                  if (typeof(__ctx?.o?.success) == 'function') {
                    __ctx.o.success.apply(__ctx.t, [i, _old, _new]);
                  }
                }, () => {
                  console.warn('Failed to add before..', arguments);
                  if (typeof(__ctx?.o?.fail) == 'function') {
                    __ctx.o.fail.apply(__ctx.t, [i, _old, _new]);
                  }
                });
              } else {
                let _appendNode = function() {
                  __ctx.t.append(__ctx.i, _new).then(
                    (new_item) => {
                      __ctx.t.openPath(new_item);
                      __ctx.t.select(new_item);
                      if (typeof(__ctx?.o?.success) == 'function') {
                        __ctx.o.success.apply(__ctx.t, [__ctx.i, _old, _new]);
                      }
                    },
                    () => {
                      console.warn('Failed to append...', arguments);
                      if (typeof(__ctx?.o?.fail) == 'function') {
                        __ctx.o.fail.apply(__ctx.t, [__ctx.i, _old, _new]);
                      }
                    },
                  );
                };

                // If the current node's inode is false
                if (__ctx.i && !__ctx.t.isInode(__ctx.i)) {
                  __ctx.t.setInode(__ctx.i, {success: _appendNode});
                  // Open the collection node.
                  pgBrowser.tree.open(__ctx.i);
                } else {
                  // Handle case for node without parent i.e. server-group
                  // or if parent node's inode is true.
                  _appendNode();
                }

              }
            }.bind(_ctx);

          // Parent node do not have any children, let me unload it.
          if (!first && _ctx.t.wasLoad(_ctx.i)) {
            _ctx.t.unload(_ctx.i).then( () => {
              findChildNode(
                selectNode,
                function() {
                  let o = this && this.o;
                  if (typeof(o?.fail) == 'function') {
                    o.fail.apply(this.t, [this.i, _old, _new]);
                  }
                }
              );
            },
            () => {
              let o = this && this.o;
              if (typeof(o?.fail) == 'function') {
                o.fail.apply(this.t, [this.i, _old, _new]);
              }
            }
            );
            return;
          }

          // We can find the collection node using _findTreeChildNode
          // indirectly.
          findChildNode(selectNode, addNode);
        }.bind(ctx);

      if (!ctx.t.wasInit() || !_new || !_old) {
        return;
      }
      ctx.pathOfTreeItems.push(_old);
      _new._label = _new.label;
      _new.label = _.escape(_new.label);

      // We need to check if this is collection node and have
      // children count, if yes then add count with label too
      if(ctx.b.Nodes[_new._type].is_collection) {
        if ('collection_count' in _old && _old['collection_count'] > 0) {
          _new.label = _.escape(_new._label) +
            ' <span>(' + _old['collection_count'] + ')</span>';
        }
      }

      // If server icon/background changes then also we need to re-create it
      if ((
        _old._type == 'server' && _new._type == 'server' && (
          _old._pid != _new._pid || _old.icon != _new.icon
        )) || _old._pid != _new._pid || _old._id != _new._id
      ) {
        ctx.op = 'RECREATE';
        traversePath();
      } else {
        ctx.op = 'UPDATE';
        traversePath();
      }
    },

    onRefreshTreeNodeReact: function(_i, _opts) {
      this.tree.refresh(_i).then(() =>{
        if (_opts?.success) _opts.success();
      });
    },

    onRefreshTreeNode: function(_i, _opts) {
      let _d = _i && this.tree.itemData(_i),
        n = this.Nodes[_d?._type],
        ctx = {
          b: this, // Browser
          d: _d, // current parent
          i: _i, // current item
          p: null, // path of the old object
          pathOfTreeItems: [], // path items
          t: this.tree, // Tree Api
          o: _opts,
        },
        isOpen,
        idx = -1;

      this.Events.trigger('pgadmin-browser:tree:refreshing', _i, _d, n);

      if (!n) {
        _i = null;
        ctx.i = null;
        ctx.d = null;
      } else {
        isOpen = (this.tree.isInode(_i) && this.tree.isOpen(_i));
      }

      ctx.branch = ctx.t.serialize(
        _i, {}, function(i, el, d) {
          idx++;
          if (!idx || (d.inode && d.open)) {
            return {
              _id: d._id, _type: d._type, branch: d.branch, open: d.open,
            };
          }
        });

      if (!n) {
        ctx.t.destroy({
          success: function() {
            ctx.t = ctx.b.tree;
            ctx.i = null;
            ctx.b._refreshNode(ctx, ctx.branch);
          },
          error: function() {
            let fail = _opts.o?.fail || _opts?.fail;

            if (typeof(fail) == 'function') {
              fail();
            }
          },
        });
        return;
      }

      let api = getApiInstance();
      let fetchNodeInfo = function(__i, __d, __n) {
        let info = __n.getTreeNodeHierarchy(__i),
          url = __n.generate_url(__i, 'nodes', __d, true);

        api.get(
          url
        ).then(({data: res})=> {
          // Node information can come as result/data
          let newData = res.result || res.data;

          newData._label = newData.label;
          newData.label = _.escape(newData.label);

          ctx.t.setLabel(ctx.i, {label: newData.label});
          ctx.t.addIcon(ctx.i, {icon: newData.icon});
          ctx.t.setId(ctx.i, {id: newData.id});
          if (newData.inode)
            ctx.t.setInode(ctx.i, {inode: true});

          // This will update the tree item data.
          let itemData = ctx.t.itemData(ctx.i);
          _.extend(itemData, newData);

          if (
            __n.can_expand && typeof(__n.can_expand) == 'function'
          ) {
            if (!__n.can_expand(itemData)) {
              ctx.t.unload(ctx.i);
              return;
            }
          }
          ctx.b._refreshNode(ctx, ctx.branch);
          let success = (ctx?.o?.success) || ctx.success;
          if (success && typeof(success) == 'function') {
            success();
          }
        }).catch(function(error) {
          if (!pgHandleItemError(
            error, {item: __i, info: info}
          )) {
            if(error.response.headers['content-type'] == 'application/json') {
              let jsonResp = error.response.data ?? {};
              if(error.response.status == 410 && jsonResp.success == 0) {
                let parent = ctx.t.parent(ctx.i);

                ctx.t.remove(ctx.i, {
                  success: function() {
                    if (parent) {
                    // Try to refresh the parent on error
                      try {
                        pgBrowser.Events.trigger(
                          'pgadmin:browser:tree:refresh', parent
                        );
                      } catch (e) { console.warn(e.stack || e); }
                    }
                  },
                });
              }
            }

            pgAdmin.Browser.notifier.pgNotifier('error', error, gettext('Error retrieving details for the node.'), function (msg) {
              if (msg == 'CRYPTKEY_SET') {
                fetchNodeInfo(__i, __d, __n);
              } else {
                console.warn(arguments);
              }
            });
          }
        });
      };

      if (n?.collection_node) {
        let p = ctx.i = this.tree.parent(_i),
          unloadNode = function() {
            this.tree.unload(_i, {
              success: function() {
                _i = p;
                _d = ctx.d = ctx.t.itemData(ctx.i);
                n = ctx.b.Nodes[_d._type];
                _i = p;
                fetchNodeInfo(_i, _d, n);
              },
              fail: function() { console.warn(arguments); },
            });
          }.bind(this);
        if (!this.tree.isInode(_i)) {
          this.tree.setInode(_i, { success: unloadNode });
        } else {
          unloadNode();
        }
      } else if (isOpen) {
        this.tree.unload(_i, {
          success: fetchNodeInfo.bind(this, _i, _d, n),
          fail: function() {
            console.warn(arguments);
          },
        });
      } else if (!this.tree.isInode(_i) && _d.inode) {
        this.tree.setInode(_i, {
          success: fetchNodeInfo.bind(this, _i, _d, n),
          fail: function() {
            console.warn(arguments);
          },
        });
      } else {
        fetchNodeInfo(_i, _d, n);
      }
    },

    onLoadFailNode: function(_nodeData) {
      let self = this,
        isSelected = self.tree.isSelected(_nodeData);

      /** Check if master password set **/
      self.check_master_password((is_set)=>{
        if(!is_set) {
          self.set_master_password('', ()=>{
            if(isSelected) { self.tree.select(_nodeData); }
            self.tree.open(_nodeData);
          });
        }
      });
    },

    removeChildTreeNodesById: function(_parentNode, _collType, _childIds) {
      let tree_local = pgBrowser.tree, childNode, childNodeData;
      if(_parentNode && _collType) {
        let children = tree_local.children(_parentNode),
          idx = 0, size = children.length;

        _parentNode = null;

        for (; idx < size; idx++) {
          childNode = children[idx];
          childNodeData = tree_local.itemData(childNode);

          if (childNodeData._type == _collType) {
            _parentNode = childNode;
            break;
          }
        }
      }

      if (_parentNode) {
        let children = tree_local.children(_parentNode),
          idx = 0, size = children.length;

        for (; idx < size; idx++) {
          childNode = children[idx];
          childNodeData = tree_local.itemData(childNode);

          if (_childIds.indexOf(childNodeData._id) != -1) {
            pgBrowser.removeTreeNode(childNode, false, _parentNode);
          }
        }
        return true;
      }
      return false;
    },

    removeTreeNode: function(_node, _selectNext, _parentNode) {
      let tree_local = pgBrowser.tree,
        nodeToSelect = null;

      if (!_node)
        return false;

      if (_selectNext) {
        nodeToSelect = tree_local.next(_node);
        if (!nodeToSelect) {
          nodeToSelect = tree_local.prev(_node);

          if (!nodeToSelect) {
            if (!_parentNode) {
              nodeToSelect = tree_local.parent(_node);
            } else {
              nodeToSelect = _parentNode;
            }
          }
        }
        if (nodeToSelect)
          tree_local.select(nodeToSelect);
      }

      tree_local.remove(_node);
      return true;
    },

    findSiblingTreeNode: function(_node, _id) {
      let tree_local = pgBrowser.tree,
        parentNode = tree_local.parent(_node),
        siblings = tree_local.children(parentNode),
        idx = 0, nodeData, node;

      for(; idx < siblings.length; idx++) {
        node = siblings[idx];
        nodeData = tree_local.itemData(node);

        if (nodeData && nodeData._id == _id)
          return node;
      }
      return null;
    },

    findParentTreeNodeByType: function(_node, _parentType) {
      let tree_local = pgBrowser.tree,
        nodeData,
        node = _node;

      do {
        nodeData = tree_local.itemData(node);
        if (nodeData && nodeData._type == _parentType)
          return node;
        node = tree_local.hasParent(node) ? tree_local.parent(node) : null;
      } while (node);

      return null;
    },

    findChildCollectionTreeNode: function(_node, _collType) {
      let tree_local = pgBrowser.tree,
        nodeData, idx = 0,
        node,
        children = _node && tree_local.children(_node);

      if (!children?.length)
        return null;

      for(; idx < children.length; idx++) {
        node = children[idx];
        nodeData = tree_local.itemData(node);

        if (nodeData && nodeData._type == _collType)
          return node;
      }
      return null;
    },

    addChildTreeNodes: function(_treeHierarchy, _node, _type, _arrayIds, _callback) {
      let api = getApiInstance();
      let module = _type in pgBrowser.Nodes && pgBrowser.Nodes[_type],
        childTreeInfo = _arrayIds.length && _.extend(
          {}, _.mapValues(_treeHierarchy, function(_val) {
            _val.priority -= 1; return _val;
          })),
        arrayChildNodeData = [],
        fetchNodeInfo = function(__callback) {
          if (!_arrayIds.length) {
            if (__callback) {
              __callback();
            }
            return;
          }

          let childDummyInfo = {
              '_id': _arrayIds.pop(), '_type': _type, 'priority': 0,
            },
            childNodeUrl;

          childTreeInfo[_type] = childDummyInfo;
          childNodeUrl = module.generate_url(
            null, 'nodes', childDummyInfo, true, childTreeInfo
          );

          _node = _node || arguments[1];

          api.get(
            childNodeUrl
          ).then(({data: res})=> {
            if (res.success) {
              arrayChildNodeData.push(res.data);
            }
            fetchNodeInfo(_callback);
          }).catch(function(error) {
            pgAdmin.Browser.notifier.pgRespErrorNotify(error);
            fetchNodeInfo(_callback);
          });
        };


      if (!module) {
        console.warn(
          'Developer: Couldn\'t find the module for the given child: ',
          _.clone(arguments)
        );
        return;
      }

      if (pgBrowser.tree.wasLoad(_node) || pgBrowser.tree.isLeaf(_node)) {
        fetchNodeInfo(function() {
          _.each(arrayChildNodeData, function(_nodData) {
            pgBrowser.Events.trigger(
              'pgadmin:browser:tree:add', _nodData, _treeHierarchy
            );
          });

          _callback?.();
        });
      } else {
        _callback?.();
      }
    },

    _refreshNode: function(_ctx, _d) {
      let traverseNodes = function(__d) {
        let __ctx = this, idx = 0, ctx, d,
          size = __d?.branch?.length || 0,
          findNode = function(i_findNode, d_findNode, ctx_findNode) {
            setTimeout(
              function() {
                ctx_findNode.b._findTreeChildNode(i_findNode, d_findNode, ctx_findNode);
              }, 0
            );
          };

        for (; idx < size; idx++) {
          d = __d.branch[idx];
          let n = __ctx.b.Nodes[d._type];
          ctx = {
            b: __ctx.b,
            t: __ctx.t,
            pathOfTreeItems: [],
            i: __ctx.i,
            d: d,
            select: __ctx.select,
            hasId: n && !n.collection_node,
            o: __ctx.o,
            load: true,
          };
          ctx.success = function() {
            this.b._refreshNode(this, this.d);
          }.bind(ctx);
          findNode(__ctx.i, d, ctx);
        }
      }.bind(_ctx, _d);

      if (!_d?.open)
        return;

      if (!_ctx.t.isOpen(_ctx.i)) {
        _ctx.t.open(_ctx.i, {
          unanimated: true,
          success: traverseNodes,
          fail: function() { /* Do nothing */ },
        });
      } else {
        traverseNodes();
      }

    },

    editor_shortcut_keys: {
      // Autocomplete sql command
      'Ctrl-Space': 'autocomplete',
      'Cmd-Space': 'autocomplete',

      'Alt-Up': 'goLineUp',
      'Alt-Down': 'goLineDown',

      // Move word by word left/right
      'Ctrl-Alt-Left': 'goGroupLeft',
      'Cmd-Alt-Left': 'goGroupLeft',
      'Ctrl-Alt-Right': 'goGroupRight',
      'Cmd-Alt-Right': 'goGroupRight',

      // Allow user to delete Tab(s)
      'Shift-Tab': 'indentLess',
    },
    editor_options: {
      tabSize: parseInt(pgBrowser.utils.tabSize),
      wrapCode: pgBrowser.utils.wrapCode,
      insert_pair_brackets: pgBrowser.utils.insertPairBrackets,
      brace_matching: pgBrowser.utils.braceMatching,
      indent_with_tabs: pgBrowser.utils.is_indent_with_tabs,
      highlightSelectionMatches:pgBrowser.utils.highlightSelectionMatches
    },
  });

  // Use spaces instead of tab
  if (pgBrowser.utils.useSpaces == 'True') {
    pgAdmin.Browser.editor_shortcut_keys.Tab = 'insertSoftTab';
  }

  return pgAdmin.Browser;
});
