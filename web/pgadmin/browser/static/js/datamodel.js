/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([
  'underscore', 'sources/pgadmin', 'jquery', 'backbone', 'sources/utils',
], function(_, pgAdmin, $, Backbone, pgadminUtils) {
  var pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};

  pgBrowser.DataModel = Backbone.Model.extend({
    /*
     * Parsing the existing data
     */
    on_server: false,
    parse: function(res) {
      var self = this;
      if (res && _.isObject(res) && 'node' in res && res['node']) {
        self.tnode = _.extend({}, res.node);
        delete res.node;
      }
      var objectOp = function(schema) {
        if (schema && _.isArray(schema)) {
          _.each(schema, function(s) {
            var obj, val;
            switch (s.type) {
            case 'collection':
              obj = self.get(s.id);
              val = res[s.id];
              if (_.isArray(val) || _.isObject(val)) {
                if (!obj || !(obj instanceof Backbone.Collection)) {
                  obj = new(pgBrowser.Node.Collection)(val, {
                    model: ((_.isString(s.model) &&
                          s.model in pgBrowser.Nodes) ?
                      pgBrowser.Nodes[s.model].model : s.model),
                    top: self.top || self,
                    handler: self,
                    parse: true,
                    silent: true,
                    attrName: s.id,
                  });

                  /*
                     * Nested collection models may or may not have idAttribute.
                     * So to decide whether model is new or not set 'on_server'
                     * flag on such models.
                     */

                  self.set(s.id, obj, {
                    silent: true,
                    parse: true,
                    on_server: true,
                  });
                } else {
                  /*
                     * Nested collection models may or may not have idAttribute.
                     * So to decide whether model is new or not set 'on_server'
                     * flag on such models.
                     */
                  obj.reset(val, {
                    silent: true,
                    parse: true,
                    on_server: true,
                  });
                }
              } else {
                obj = null;
              }
              self.set(s.id, obj, {
                silent: true,
              });
              res[s.id] = obj;
              break;
            case 'model':
              obj = self.get(s.id);
              val = res[s.id];
              if (!_.isUndefined(val) && !_.isNull(val)) {
                if (!obj || !(obj instanceof Backbone.Model)) {
                  if (_.isString(s.model) &&
                      s.model in pgBrowser.Nodes[s.model]) {
                    obj = new(pgBrowser.Nodes[s.model].Model)(
                      obj, {
                        silent: true,
                        top: self.top || self,
                        handler: self,
                        attrName: s.id,
                      }
                    );
                  } else {
                    obj = new(s.model)(obj, {
                      silent: true,
                      top: self.top || self,
                      handler: self,
                      attrName: s.id,
                    });
                  }
                }
                obj.set(val, {
                  parse: true,
                  silent: true,
                });
              } else {
                obj = null;
              }
              res[s.id] = obj;
              break;
            case 'nested':
              objectOp(s.schema);

              break;
            default:
              break;
            }
          });
        }
      };

      objectOp(self.schema);

      return res;
    },
    isNew: function() {
      if (this.has(this.idAttribute)) {
        return !this.has(this.idAttribute);
      }
      return !this.on_server;
    },
    primary_key: function() {
      if (this.keys && _.isArray(this.keys)) {
        var res = {},
          self = this;

        _.each(self.keys, function(k) {
          res[k] = self.attributes[k];
        });

        return JSON.stringify(res);
      }
      return this.cid;
    },
    initialize: function(attributes, options) {
      var self = this;
      self._previous_key_values = {};

      if (!_.isUndefined(options) && 'on_server' in options && options.on_server) {
        self.on_server = true;
      }

      Backbone.Model.prototype.initialize.apply(self, arguments);

      if (_.isUndefined(options) || _.isNull(options)) {
        options = attributes || {};
      }

      self.sessAttrs = {};
      self.fieldData = {};
      self.origSessAttrs = {};
      self.objects = [];
      self.arrays = [];
      self.attrName = options.attrName;
      self.top = (options.top || self.collection && self.collection.top || self.collection || self);
      self.handler = options.handler ||
        (self.collection && self.collection.handler);
      self.trackChanges = false;
      self.errorModel = new Backbone.Model();
      self.node_info = options.node_info;

      var obj;
      var objectOp = function(schema) {
        if (schema && _.isArray(schema)) {
          _.each(schema, function(s) {

            switch (s.type) {
            case 'int':
            case 'numeric':
              self.fieldData[s.id] = {
                id: s.id,
                label: s.label,
                type: s.type,
                min: !_.isUndefined(s.min) ? s.min : undefined,
                max: !_.isUndefined(s.max) ? s.max : undefined,
              };
              break;
            default:
              self.fieldData[s.id] = {
                id: s.id,
                label: s.label,
                type: s.type,
              };
            }

            switch (s.type) {
            case 'array':
              self.arrays.push(s.id);

              break;
            case 'collection':
              obj = self.get(s.id);
              if (!obj || !(obj instanceof pgBrowser.Node.Collection)) {
                if (_.isString(s.model) &&
                    s.model in pgBrowser.Nodes) {
                  var node = pgBrowser.Nodes[s.model];
                  obj = new(node.Collection)(obj, {
                    model: node.model,
                    top: self.top || self,
                    handler: self,
                    attrName: s.id,
                  });
                } else {
                  obj = new(pgBrowser.Node.Collection)(obj, {
                    model: s.model,
                    top: self.top || self,
                    handler: self,
                    attrName: s.id,
                  });
                }
              }

              obj.name = s.id;
              self.objects.push(s.id);
              self.set(s.id, obj, {
                silent: true,
              });

              break;
            case 'model':
              obj = self.get(s.id);
              if (!obj || !(obj instanceof Backbone.Model)) {
                if (_.isString(s.model) &&
                    s.model in pgBrowser.Nodes[s.model]) {
                  obj = new(pgBrowser.Nodes[s.model].Model)(
                    obj, {
                      top: self.top || self,
                      handler: self,
                      attrName: s.id,
                    }
                  );
                } else {
                  obj = new(s.model)(
                    obj, {
                      top: self.top || self,
                      handler: self,
                      attrName: s.id,
                    });
                }
              }

              obj.name = s.id;
              self.objects.push(s.id);
              self.set(s.id, obj, {
                silent: true,
              });

              break;
            case 'nested':
              objectOp(s.schema);
              break;
            default:
              return;
            }
          });
        }
      };
      objectOp(self.schema);

      if (self.handler && self.handler.trackChanges) {
        self.startNewSession();
      }

      if ('keys' in self && _.isArray(self.keys)) {
        _.each(self.keys, function(key) {
          self.on('change:' + key, function(m) {
            self._previous_key_values[key] = m.previous(key);
          });
        });
      }
      return self;
    },
    // Create a reset function, which allow us to remove the nested object.
    reset: function(opts) {
      var obj,
        reindex = !!(opts && opts.reindex);

      if (opts && opts.stop)
        this.stopSession();

      // Let's not touch the child attributes, if reindex is false.
      if (!reindex) {
        return;
      }

      for (var id in this.objects) {
        obj = this.get(id);

        if (obj) {
          if (obj instanceof pgBrowser.DataModel) {
            obj.reset(opts);
          } else if (obj instanceof Backbone.Model) {
            obj.clear(opts);
          } else if (obj instanceof pgBrowser.DataCollection) {
            obj.reset([], opts);
          } else if (obj instanceof Backbone.Collection) {
            obj.each(function(m) {
              if (m instanceof Backbone.DataModel) {
                obj.reset();
                obj.clear(opts);
              }
            });
            Backbone.Collection.prototype.reset.call(obj, [], opts);
          }
        }
      }
      Backbone.Collection.prototype.reset.apply(this, arguments);
    },
    sessChanged: function() {
      var self = this;

      return (_.size(self.sessAttrs) > 0 ||
        _.some(self.objects, function(k) {
          var obj = self.get(k);
          if (!(_.isNull(obj) || _.isUndefined(obj))) {
            return obj.sessChanged();
          }
          return false;
        }));
    },
    sessValid: function() {
      var self = this;
      // Perform default validations.
      if ('default_validate' in self && typeof(self.default_validate) == 'function' &&
        _.isString(self.default_validate())) {
        return false;
      }

      if ('validate' in self && _.isFunction(self.validate) &&
        _.isString(self.validate.apply(self))) {
        return false;
      }
      return true;
    },
    set: function(key, val, options) {
      var opts = _.isObject(key) ? val : options;

      this._changing = true;
      this._previousAttributes = _.clone(this.attributes);
      this.changed = {};

      var res = Backbone.Model.prototype.set.call(this, key, val, options);
      this._changing = false;

      if ((opts && opts.internal) || !this.trackChanges) {
        return true;
      }

      if (key != null && res) {
        var attrs = {},
          self = this,
          msg;

        var attrChanged = function(v, k) {
          if (k in self.objects) {
            return;
          }
          attrs[k] = v;
          const attrsDefined = self.origSessAttrs[k] && v;
          /* If the orig value was null and new one is empty string, then its a "no change" */
          /* If the orig value and new value are of different datatype but of same value(numeric) "no change" */
          if (_.isEqual(self.origSessAttrs[k], v)
            || (self.origSessAttrs[k] === null && v === '')
            || (attrsDefined ? _.isEqual(self.origSessAttrs[k].toString(), v.toString()) : false)) {
            delete self.sessAttrs[k];
          } else {
            self.sessAttrs[k] = v;
          }
        };

        // Handle both `"key", value` and `{key: value}` -style arguments.
        if (typeof key === 'object') {
          _.each(key, attrChanged);
        } else {
          attrChanged(val, key);
        }

        self.trigger('pgadmin-session:set', self, attrs);
        if (!opts || !opts.silent) {
          self.trigger('change', self, opts);
        }

        // Perform default validations.

        if ('default_validate' in self && typeof(self.default_validate) == 'function') {
          msg = self.default_validate();
        }

        if ('validate' in self && typeof(self['validate']) === 'function') {

          if (!msg) {
            msg = self.validate(_.keys(attrs));
          }
        }

        /*
         * If any parent present, we will need to inform the parent - that
         * I have some issues/fixed the issue.
         *
         * If not parent found, we will raise the issue
         */
        if (_.size(self.errorModel.attributes) == 0) {
          if (self.collection || self.handler) {
            (self.collection || self.handler).trigger(
              'pgadmin-session:model:valid', self, (self.collection || self.handler)
            );
          } else {
            self.trigger('pgadmin-session:valid', self.sessChanged(), self);
          }
        } else {
          msg = msg || _.values(self.errorModel.attributes)[0];
          if (self.collection || self.handler) {
            (self.collection || self.handler).trigger(
              'pgadmin-session:model:invalid', msg, self, (self.collection || self.handler)
            );
          } else {
            self.trigger('pgadmin-session:invalid', msg, self);
          }
        }

        return res;
      }
      return res;
    },
    /*
     * We do support modified data only through session by tracking changes.
     *
     * In normal mode, we will use the toJSON function of Backbone.Model.
     * In session mode, we will return all the modified data only. And, the
     * objects (collection, and model) will be return as stringified JSON,
     * only from the parent object.
     */
    toJSON: function(session, method) {
      var self = this,
        res, isNew = self.isNew();

      session = (typeof(session) != 'undefined' && session == true);

      if (!session || isNew) {
        res = Backbone.Model.prototype.toJSON.call(this, arguments);
      } else {
        res = {};
        res[self.idAttribute || '_id'] = self.get(self.idAttribute || '_id');
        res = _.extend(res, self.sessAttrs);
      }

      /*
       * We do have number objects (models, collections), which needs to be
       * converted to JSON data manually.
       */
      _.each(
        self.objects,
        function(k) {
          var obj = self.get(k);
          /*
           * For session changes, we only need the modified data to be
           * transformed to JSON data.
           */
          if (session) {
            if (res[k] instanceof Array) {
              res[k] = JSON.stringify(res[k]);
            } else if ((obj && obj.sessChanged && obj.sessChanged()) || isNew) {
              res[k] = obj && obj.toJSON(!isNew);
              /*
               * We will run JSON.stringify(..) only from the main object,
               * not for the JSON object within the objects, that only when
               * HTTP method is 'GET'.
               *
               * We do stringify the object, so that - it will not be
               * translated to wierd format using jQuery.
               */
              if (obj && method && method == 'GET') {
                res[k] = JSON.stringify(res[k]);
              }
            } else {
              delete res[k];
            }
          } else if (!(res[k] instanceof Array)) {
            res[k] = (obj && obj.toJSON());
          }
        });
      if (session) {
        _.each(
          self.arrays,
          function(a) {
            /*
             * For session changes, we only need the modified data to be
             * transformed to JSON data.
             */
            if (res[a] && res[a] instanceof Array) {
              res[a] = JSON.stringify(res[a]);
            }
          });
      }
      return res;
    },
    startNewSession: function() {
      var self = this;

      if (self.trackChanges) {
        self.trigger('pgadmin-session:stop', self);
        self.off('pgadmin-session:model:invalid', self.onChildInvalid);
        self.off('pgadmin-session:model:valid', self.onChildValid);
        self.off('pgadmin-session:changed', self.onChildChanged);
        self.off('pgadmin-session:added', self.onChildChanged);
        self.off('pgadmin-session:removed', self.onChildChanged);
      }

      self.trackChanges = true;
      self.sessAttrs = {};
      self.origSessAttrs = _.clone(self.attributes);

      _.each(self.objects, function(o) {
        var obj = self.get(o);

        if (_.isUndefined(obj) || _.isNull(obj)) {
          return;
        }

        delete self.origSessAttrs[o];

        if (obj && 'startNewSession' in obj && _.isFunction(obj.startNewSession)) {
          obj.startNewSession();
        }
      });

      // Let people know, I have started session hanlding
      self.trigger('pgadmin-session:start', self);

      // Let me listen to the my child invalid/valid messages
      self.on('pgadmin-session:model:invalid', self.onChildInvalid);
      self.on('pgadmin-session:collection:changed', self.onChildCollectionChanged);
      self.on('pgadmin-session:model-msg:changed', self.onModelChangedMsg);
      self.on('pgadmin-session:model:valid', self.onChildValid);
      self.on('pgadmin-session:changed', self.onChildChanged);
      self.on('pgadmin-session:added', self.onChildChanged);
      self.on('pgadmin-session:removed', self.onChildChanged);
    },

    onChildInvalid: function(msg, obj) {
      var self = this;

      if (self.trackChanges && obj) {
        var objName = obj.attrName;

        if (!objName) {
          var hasPrimaryKey = obj.primary_key &&
            typeof(obj.primary_key) === 'function';
          var key = hasPrimaryKey ? obj.primary_key() : obj.cid,
            comparator = hasPrimaryKey ?
              function(k) {
                var o = self.get('k');

                if (o && o.primary_key() === key) {
                  objName = k;
                  return true;
                }

                return false;
              } :
              function(k) {
                var o = self.get(k);

                if (o.cid === key) {
                  objName = k;
                  return true;
                }

                return false;
              };
          _.findIndex(self.objects, comparator);
        }

        if (objName) {
          /*
           * Update the error message for this object.
           */
          self.errorModel.set(objName, msg);

          if (self.handler) {
            (self.handler).trigger('pgadmin-session:model:invalid', msg, self, self.handler);
          } else {
            self.trigger('pgadmin-session:invalid', msg, self);
          }
        }
      }

      return this;
    },
    onChildValid: function(obj) {
      var self = this;

      if (self.trackChanges && obj) {
        var objName = obj.attrName;

        if (!objName) {
          var hasPrimaryKey = (obj.primary_key &&
            (typeof(obj.primary_key) === 'function'));
          var key = hasPrimaryKey ? obj.primary_key() : obj.cid,
            comparator = hasPrimaryKey ?
              function(k) {
                var o = self.get('k');

                if (o && o.primary_key() === key) {
                  objName = k;
                  return true;
                }

                return false;
              } :
              function(k) {
                var o = self.get('k');

                if (o && o.cid === key) {
                  objName = k;
                  return true;
                }

                return false;
              };

          _.findIndex(self.objects, comparator);
        }

        var msg = null,
          validate = function(m, attrs) {
            if ('default_validate' in m && typeof(m.default_validate) == 'function') {
              msg = m.default_validate();
              if (_.isString(msg)) {
                return msg;
              }
            }

            if ('validate' in m && typeof(m.validate) == 'function') {
              msg = m.validate(attrs);

              return msg;
            }
            return null;
          };

        if (obj instanceof Backbone.Collection) {
          for (var idx in obj.models) {
            if (validate(obj.models[idx]))
              break;
          }
        } else if (obj instanceof Backbone.Model) {
          validate(obj);
        }

        if (objName && self.errorModel.has(objName)) {
          if (!msg) {
            self.errorModel.unset(objName);
          } else {
            self.errorModel.set(objName, msg);
          }
        }

        /*
         * The object is valid, but does this has any effect on parent?
         * Let's validate this object itself, before making it clear.
         *
         * We will trigger validation information.
         */
        if (_.size(self.errorModel.attributes) == 0 &&
          !validate(self, (objName && [objName]))) {
          if (self.handler) {
            (self.handler).trigger('pgadmin-session:model:valid', self, self.handler);
            (self.handler).trigger('pgadmin-session:collection:changed', self, self.handler);
          } else {
            self.trigger(
              'pgadmin-session:valid', self.sessChanged(), self
            );
            self.trigger(
              'pgadmin-session:collection:changed', self.sessChanged(), self
            );
          }
        } else {
          msg = msg || _.values(self.errorModel.attributes)[0];

          if (self.handler) {
            (self.handler).trigger(
              'pgadmin-session:model:invalid', msg, self, self.handler
            );
            (self.handler).trigger('pgadmin-session:collection:changed', self, self.handler);
          } else {
            self.trigger('pgadmin-session:invalid', msg, self);
            self.trigger('pgadmin-session:collection:changed', self);
          }
        }
      }
    },

    onChildCollectionChanged: function(obj, obj_hand) {

      var self = this;

      setTimeout(() => {

        var msg = null,
          validate = function(m, attrs) {
            if ('default_validate' in m && typeof(m.default_validate) == 'function') {
              msg = m.default_validate();
              if (_.isString(msg)) {
                return msg;
              }
            }

            if ('validate' in m && typeof(m.validate) == 'function') {
              msg = m.validate(attrs);

              return msg;
            }
            return null;
          };

        let handler, parentTr;

        let collection = self.collection || obj_hand;
        if(collection) {
          var collection_selector = collection.attrName || collection.name;
          let activeTab = $('.show.active div.'+collection_selector);
          $(activeTab).find('.error-in-grid').removeClass('error-in-grid');

          model_collection_exit : if (collection instanceof Backbone.Collection) {

            for (var cid in collection.models) {
              let model = collection.models[cid];

              for(let mod_obj of model.objects) {
                let mod_attr = model.attributes[mod_obj];
                if (mod_attr && mod_attr.models.length > 0) {
                  for(let mod_attr_prop in mod_attr.models) {
                    if(validate(mod_attr.models[mod_attr_prop])) {
                      handler = mod_attr.models[mod_attr_prop];
                      parentTr = model.parentTr;
                      break model_collection_exit;
                    }
                  }
                }
              }
            }
          }
        }

        if(msg && handler) {
          msg = msg || _.values(handler.errorModel.attributes)[0];

          handler.trigger('pgadmin-session:model:invalid', msg, handler);
          $(parentTr).addClass('error-in-grid');
        }
        return this;
      }, 120);
    },

    onChildChanged: function(obj) {
      var self = this;

      if (self.trackChanges && self.collection) {
        (self.collection).trigger('change', self);
      }
      self.trigger('pgadmin-session:collection:changed', self, obj);
    },

    stopSession: function() {
      var self = this;

      if (self.trackChanges) {
        self.off('pgadmin-session:model:invalid', self.onChildInvalid);
        self.off('pgadmin-session:model:valid', self.onChildValid);
        self.off('pgadmin-session:changed', self.onChildChanged);
        self.off('pgadmin-session:added', self.onChildChanged);
        self.off('pgadmin-session:removed', self.onChildChanged);
        self.off('pgadmin-session:collection:changed', self.onChildCollectionChanged);
      }

      self.trackChanges = false;
      self.sessAttrs = {};
      self.origSessAttrs = {};

      _.each(self.objects, function(o) {
        var obj = self.get(o);

        if (_.isUndefined(obj) || _.isNull(obj)) {
          return;
        }

        self.origSessAttrs[o] = null;
        delete self.origSessAttrs[o];

        if (obj && 'stopSession' in obj && _.isFunction(obj.stopSession)) {
          obj.stopSession();
        }
      });

      self.trigger('pgadmin-session:stop');
    },
    default_validate: function() {
      var msg, field, value, type;

      for (var i = 0, keys = _.keys(this.attributes), l = keys.length; i < l; i++) {

        value = this.attributes[keys[i]];
        field = this.fieldData[keys[i]];
        msg = null;

        if (!(_.isUndefined(value) || _.isNull(value) || String(value) === '')) {
          if (!field) {
            continue;
          }

          type = field.type || undefined;
          if (!type) {
            continue;
          }

          switch (type) {
          case 'int':
            msg = this.integer_validate(value, field);
            break;
          case 'numeric':
            msg = this.number_validate(value, field);
            break;
          }

          if (msg) {
            this.errorModel.set(field.id, msg);
            return msg;
          } else {
            this.errorModel.unset(field.id);
          }
        } else {
          if (field) {
            this.errorModel.unset(field.id);
          }
        }
      }
      return null;
    },

    check_min_max: function(value, field) {
      var label = field.label,
        min_value = field.min,
        max_value = field.max;

      if (!_.isUndefined(min_value) && value < min_value) {
        return pgadminUtils.sprintf(pgAdmin.Browser.messages.MUST_GR_EQ, label, min_value);
      } else if (!_.isUndefined(max_value) && value > max_value) {
        return pgadminUtils.sprintf(pgAdmin.Browser.messages.MUST_LESS_EQ, label, max_value);
      }
      return null;
    },
    number_validate: function(value, field) {
      var pattern = new RegExp('^-?[0-9]+(\.?[0-9]*)?$');
      if (!pattern.test(value)) {
        return pgadminUtils.sprintf(pgAdmin.Browser.messages.MUST_BE_NUM, field.label);
      }
      return this.check_min_max(value, field);
    },
    integer_validate: function(value, field) {
      var pattern = new RegExp('^-?[0-9]*$');
      if (!pattern.test(value)) {
        return pgadminUtils.sprintf(pgAdmin.Browser.messages.MUST_BE_INT, field.label);
      }
      return this.check_min_max(value, field);
    },
  });

  pgBrowser.DataCollection = Backbone.Collection.extend({
    // Model collection
    initialize: function(attributes, options) {
      var self = this;

      options = options || {};
      /*
       * Session changes will be kept in this object.
       */
      self.sessAttrs = {
        'changed': [],
        'added': [],
        'deleted': [],
        'invalid': [],
      };
      self.top = options.top || self;
      self.attrName = options.attrName;
      self.handler = options.handler;
      self.trackChanges = false;

      /*
       * Listen to the model changes for the session changes.
       */
      self.on('add', self.onModelAdd);
      self.on('remove', self.onModelRemove);
      self.on('change', self.onModelChange);

      /*
       * We need to start the session, if the handler is already in session
       * tracking mode.
       */
      if (self.handler && self.handler.trackChanges) {
        self.startNewSession();
      }

      return self;
    },
    startNewSession: function() {
      var self = this,
        msg;

      if (self.trackChanges) {
        // We're stopping the existing session.
        self.trigger('pgadmin-session:stop', self);

        self.off('pgadmin-session:model:invalid', self.onModelInvalid);
        self.off('pgadmin-session:model:valid', self.onModelValid);
      }

      self.trackChanges = true;
      self.sessAttrs = {
        'changed': [],
        'added': [],
        'deleted': [],
        'invalid': [],
      };

      _.each(self.models, function(m) {
        if ('startNewSession' in m && _.isFunction(m.startNewSession)) {
          m.startNewSession();
        }

        if ('default_validate' in m && typeof(m.default_validate) == 'function') {
          msg = m.default_validate();
        }

        if (_.isString(msg)) {
          self.sessAttrs['invalid'][m.cid] = msg;
        } else if ('validate' in m && typeof(m.validate) === 'function') {
          msg = m.validate();

          if (msg) {
            self.sessAttrs['invalid'][m.cid] = msg;
          }
        }
      });

      // Let people know, I have started session hanlding
      self.trigger('pgadmin-session:start', self);

      self.on('pgadmin-session:model:invalid', self.onModelInvalid);
      self.on('pgadmin-session:model:valid', self.onModelValid);
    },
    onModelInvalid: function(msg, m) {
      var self = this,
        invalidModels = self.sessAttrs['invalid'];

      if (self.trackChanges) {
        // Do not add the existing invalid object
        invalidModels[m.cid] = msg;

        // Inform the parent that - I am an invalid model.
        if (self.handler) {
          (self.handler).trigger('pgadmin-session:model:invalid', msg, self, self.handler);
        } else {
          self.trigger('pgadmin-session:invalid', msg, self);
        }
      }

      return true;
    },
    onModelValid: function(m) {
      var self = this,
        invalidModels = self.sessAttrs['invalid'];

      if (self.trackChanges) {
        // Now check uniqueness of current model with other models.
        var isUnique = self.checkDuplicateWithModel(m);

        // If unique then find the object the invalid list, if found remove it from the list
        // and inform the parent that - I am a valid object now.

        if (isUnique && m.cid in invalidModels) {
          delete invalidModels[m.cid];
        }

        if (isUnique) {
          this.triggerValidationEvent.apply(this);
        }
      }

      return true;
    },
    stopSession: function() {
      var self = this;

      self.trackChanges = false;
      self.sessAttrs = {
        'changed': [],
        'added': [],
        'deleted': [],
        'invalid': [],
      };

      _.each(self.models, function(m) {
        if ('stopSession' in m && _.isFunction(m.stopSession)) {
          m.stopSession();
        }
      });
    },
    sessChanged: function() {
      return (
        this.sessAttrs['changed'].length > 0 ||
        this.sessAttrs['added'].length > 0 ||
        this.sessAttrs['deleted'].length > 0
      );
    },
    /*
     * We do support the changes through session tracking in general.
     *
     * In normal mode, we will use the general toJSON(..) function of
     * Backbone.Colletion.
     *
     * In session mode, we will return session changes as:
     * We will be returning the session changes as:
     * {
     *  'added': [JSON of each new model],
     *  'delete': [JSON of each deleted model],
     *  'changed': [JSON of each modified model with session changes]
     * }
     */
    toJSON: function(session) {
      var self = this;
      session = (typeof(session) != 'undefined' && session == true);

      if (!session) {
        return Backbone.Collection.prototype.toJSON.call(self);
      } else {
        var res = {};

        res['added'] = [];
        _.each(this.sessAttrs['added'], function(o) {
          res['added'].push(o.toJSON());
        });
        if (res['added'].length == 0) {
          delete res['added'];
        }
        res['changed'] = [];
        _.each(self.sessAttrs['changed'], function(o) {
          res['changed'].push(o.toJSON(true));
        });
        if (res['changed'].length == 0) {
          delete res['changed'];
        }
        res['deleted'] = [];
        _.each(self.sessAttrs['deleted'], function(o) {
          res['deleted'].push(o.toJSON());
        });
        if (res['deleted'].length == 0) {
          delete res['deleted'];
        }

        return (_.size(res) == 0 ? null : res);
      }
    },
    // Override the reset function, so that - we can reset the model
    // properly.
    reset: function(_set, opts) {
      if (opts && opts.stop)
        this.stopSession();
      this.each(function(m) {
        if (!m)
          return;
        if (m instanceof pgBrowser.DataModel) {
          m.reset(opts);
        } else {
          m.clear(opts);
        }
      });
      Backbone.Collection.prototype.reset.apply(this, arguments);
    },
    objFindInSession: function(m, type) {
      var hasPrimaryKey = m.primary_key &&
        typeof(m.primary_key) == 'function',
        key = hasPrimaryKey ? m.primary_key() : m.cid,
        comparator = hasPrimaryKey ? function(o) {
          return (o.primary_key() === key);
        } : function(o) {
          return (o.cid === key);
        };

      return (_.findIndex(this.sessAttrs[type], comparator));
    },
    onModelAdd: function(obj) {
      if (this.trackChanges) {
        var self = this,
          msg,
          idx = self.objFindInSession(obj, 'deleted');

        // Hmm.. - it was originally deleted from this collection, we should
        // remove it from the 'deleted' list.
        if (idx >= 0) {
          var origObj = self.sessAttrs['deleted'][idx];

          obj.origSessAttrs = _.clone(origObj.origSessAttrs);
          obj.attributes = _.extend(obj.attributes, origObj.attributes);
          obj.sessAttrs = _.clone(origObj.sessAttrs);

          self.sessAttrs['deleted'].splice(idx, 1);

          // It has been changed originally!
          if ((!('sessChanged' in obj)) || obj.sessChanged()) {
            self.sessAttrs['changed'].push(obj);
          }

          (self.handler || self).trigger('pgadmin-session:added', self, obj);


          if ('default_validate' in obj && typeof(obj.default_validate) == 'function') {
            msg = obj.default_validate();
          }

          if (_.isString(msg)) {
            (self.sessAttrs['invalid'])[obj.cid] = msg;
          } else if ('validate' in obj && typeof(obj.validate) === 'function') {
            msg = obj.validate();

            if (msg) {
              (self.sessAttrs['invalid'])[obj.cid] = msg;
            }
          }
        } else {

          if ('default_validate' in obj && typeof(obj.default_validate) == 'function') {
            msg = obj.default_validate();
          }

          if (_.isString(msg)) {
            (self.sessAttrs['invalid'])[obj.cid] = msg;
          } else if ('validate' in obj && typeof(obj.validate) === 'function') {
            msg = obj.validate();

            if (msg) {
              (self.sessAttrs['invalid'])[obj.cid] = msg;
            }
          }
          self.sessAttrs['added'].push(obj);

          /*
           * Session has been changed
           */
          (self.handler || self).trigger('pgadmin-session:added', self, obj);
        }

        // Let the parent/listener know about my status (valid/invalid).
        this.triggerValidationEvent.apply(this);
        self.trigger('pgadmin-session:collection:changed', self);
      }

      return true;
    },
    onModelRemove: function(obj) {
      if (this.trackChanges) {
        /* Once model is removed from collection clear its errorModel as it's no longer relevant
         * for us. Otherwise it creates problem in 'clearInvalidSessionIfModelValid' function.
         */
        obj.errorModel.clear();

        var self = this,
          invalidModels = self.sessAttrs['invalid'],
          copy = _.clone(obj),
          idx = self.objFindInSession(obj, 'added');

        // We need to remove it from the invalid object list first.
        if (obj.cid in invalidModels) {
          delete invalidModels[obj.cid];
        }

        // Hmm - it was newly added, we can safely remove it.
        if (idx >= 0) {
          self.sessAttrs['added'].splice(idx, 1);

          (self.handler || self).trigger('pgadmin-session:removed', self, copy);

          self.checkDuplicateWithModel(copy);

          // Let the parent/listener know about my status (valid/invalid).
          this.triggerValidationEvent.apply(this);
        } else {
          // Hmm - it was changed in this session, we should remove it from the
          // changed models.
          idx = self.objFindInSession(obj, 'changed');

          if (idx >= 0) {
            self.sessAttrs['changed'].splice(idx, 1);
            (self.handler || self).trigger('pgadmin-session:removed', self, copy);
          } else {
            (self.handler || self).trigger('pgadmin-session:removed', self, copy);
          }
          /* When removing the object use the original session attrs and not the changed ones */
          obj.set(obj.origSessAttrs, {silent: true});
          self.sessAttrs['deleted'].push(obj);

          self.checkDuplicateWithModel(obj);

          // Let the parent/listener know about my status (valid/invalid).
          this.triggerValidationEvent.apply(this);
        }

        /*
         * This object has been remove, we need to check (if we still have any
         * other invalid message pending).
         */
      }

      return true;
    },
    triggerValidationEvent: function() {
      var self = this,
        msg = null,
        invalidModels = self.sessAttrs['invalid'],
        validModels = [];

      for (var key in invalidModels) {
        msg = invalidModels[key];
        if (msg) {
          break;
        } else {
          // Hmm..
          // How come - you have been assigned in invalid list.
          // I will make a list of it, and remove it later.
          validModels.push(key);
        }
      }

      // Let's remove the un
      for (key in validModels) {
        delete invalidModels[validModels[key]];
      }

      if (!msg) {
        if (self.handler) {
          self.handler.trigger('pgadmin-session:model:valid', self, self.handler);
        } else {
          self.trigger('pgadmin-session:valid', self.sessChanged(), self);
        }
      } else {
        if (self.handler) {
          self.handler.trigger('pgadmin-session:model:invalid', msg, self, self.handler);
        } else {
          self.trigger('pgadmin-session:invalid', msg, self);
        }
      }
    },
    onModelChange: function(obj) {
      var self = this;

      if (this.trackChanges && obj instanceof pgBrowser.Node.Model) {
        var idx = self.objFindInSession(obj, 'added');

        // It was newly added model, we don't need to add into the changed
        // list.
        if (idx >= 0) {
          (self.handler || self).trigger('pgadmin-session:changed', self, obj);
        } else {
          idx = self.objFindInSession(obj, 'changed');

          if (!('sessChanged' in obj)) {
            (self.handler || self).trigger('pgadmin-session:changed', self, obj);

            if (idx < 0) {
              self.sessAttrs['changed'].push(obj);
            }
          } else {
            if (idx >= 0) {
              if (!obj.sessChanged()) {
                // This object is no more updated, removing it from the changed
                // models list.
                self.sessAttrs['changed'].splice(idx, 1);

                (self.handler || self).trigger('pgadmin-session:changed', self, obj);
              } else {
                (self.handler || self).trigger('pgadmin-session:changed', self, obj);
              }
            } else if (obj.sessChanged()) {
              self.sessAttrs['changed'].push(obj);
              (self.handler || self).trigger('pgadmin-session:changed', self, obj);
            }
          }
        }
      }

      return true;
    },

    /*
     * This function will check if given model is unique or duplicate in
     * collection and set/clear duplicate errors on models.
     */
    checkDuplicateWithModel: function(model) {
      if (!('keys' in model) || _.isEmpty(model.keys)) {
        return true;
      }

      var self = this,
        condition = {},
        previous_condition = {};

      _.each(model.keys, function(key) {
        condition[key] = model.get(key);
        if (key in model._previous_key_values) {
          previous_condition[key] = model._previous_key_values[key];
        } else {
          previous_condition[key] = model.previous(key);
        }
      });

      // Reset previously changed values.
      model._previous_key_values = {};

      var old_conflicting_models = self.where(previous_condition);

      if (old_conflicting_models.length == 1) {
        var m = old_conflicting_models[0];
        self.clearInvalidSessionIfModelValid(m);
      }

      var new_conflicting_models = self.where(condition);
      if (new_conflicting_models.length == 0) {
        self.clearInvalidSessionIfModelValid(model);
      } else if (new_conflicting_models.length == 1) {
        self.clearInvalidSessionIfModelValid(model);
        self.clearInvalidSessionIfModelValid(new_conflicting_models[0]);
      } else {
        var msg = 'Duplicate rows.';
        setTimeout(function() {
          _.each(new_conflicting_models, function(local_model) {
            self.trigger(
              'pgadmin-session:model:invalid', msg, local_model, self.handler
            );
            local_model.trigger(
              'pgadmin-session:model:duplicate', local_model, msg
            );
          });
        }, 10);

        return false;
      }
      return true;
    },
    clearInvalidSessionIfModelValid: function(m) {
      var errors = m.errorModel.attributes,
        invalidModels = this.sessAttrs['invalid'];

      m.trigger('pgadmin-session:model:unique', m);
      if (_.size(errors) == 0) {
        delete invalidModels[m.cid];
      } else {
        invalidModels[m.cid] = errors[Object.keys(errors)[0]];
      }
    },
  });

  pgBrowser.Events = _.extend({}, Backbone.Events);

  return pgBrowser;
});
