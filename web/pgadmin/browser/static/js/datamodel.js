define(
   ['underscore', 'pgadmin', 'jquery', 'backbone'],
function(_, pgAdmin, $, Backbone) {
  var pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};

  pgBrowser.DataModel = Backbone.Model.extend({
      /*
       * Parsing the existing data
       */
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
              switch(s.type) {
                case 'collection':
                  obj = self.get(s.id);
                  val = res[s.id];
                  if (_.isArray(val) || _.isObject(val)) {
                    if (!obj || !(obj instanceof Backbone.Collection)) {
                      obj = new (pgBrowser.Node.Collection)(val, {
                        model: ((_.isString(s.model) &&
                                 s.model in pgBrowser.Nodes) ?
                                pgBrowser.Nodes[s.model].model : s.model),
                        top: self.top || self,
                        handler: self,
                        parse: true,
                        silent: true,
                        attrName: s.id
                        });
                      self.set(s.id, obj, {silent: true, parse: true});
                    } else {
                      obj.reset(val, {silent: true, parse: true});
                    }
                  }
                  else {
                    if (obj)
                      delete obj;
                    obj = null;
                  }
                  self.set(s.id, obj, {silent: true});
                  res[s.id] = obj;
                  break;
                case 'model':
                  obj = self.get(s.id);
                  val = res[s.id];
                  if (!_.isUndefined(val) && !_.isNull(val)) {
                    if (!obj || !(obj instanceof Backbone.Model)) {
                      if (_.isString(s.model) &&
                          s.model in pgBrowser.Nodes[s.model]) {
                        obj = new (pgBrowser.Nodes[s.model].Model)(
                            obj, {
                              silent: true, top: self.top || self, handler: self,
                              attrName: s.id
                            }
                            );
                      } else {
                        obj = new (s.model)(obj, {
                          silent: true, top: self.top || self, handler: self,
                          attrName: s.id
                        });
                      }
                    }
                    obj.set(val, {parse: true, silent: true});
                  } else {
                    if (obj)
                      delete obj;
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
      primary_key: function() {
        if (this.keys && _.isArray(this.keys)) {
          var res = {}, self = this;

          _.each(self.keys, function(k) {
            res[k] = self.attributes[k];
          });

          return JSON.stringify(res);
        }
        return this.cid;
      },
      initialize: function(attributes, options) {
        var self = this;

        Backbone.Model.prototype.initialize.apply(self, arguments);

        if (_.isUndefined(options) || _.isNull(options)) {
          options = attributes || {};
          attributes = null;
        }

        self.sessAttrs = {};
        self.origSessAttrs = {};
        self.objects = [];
        self.attrName = options.attrName,
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

              switch(s.type) {
                case 'collection':
                  obj = self.get(s.id)
                  if (!obj || !(obj instanceof pgBrowser.Node.Collection)) {
                    if (_.isString(s.model) &&
                      s.model in pgBrowser.Nodes) {
                      var node = pgBrowser.Nodes[s.model];
                      obj = new (node.Collection)(obj, {
                        model: node.model,
                        top: self.top || self,
                        handler: self,
                        attrName: s.id
                      });
                    } else {
                      obj = new (pgBrowser.Node.Collection)(obj, {
                        model: s.model,
                        top: self.top || self,
                        handler: self,
                        attrName: s.id
                      });
                    }
                  }

                  obj.name = s.id;
                  self.objects.push(s.id);
                  self.set(s.id, obj, {silent: true});

                  break;
                case 'model':
                  obj = self.get(s.id)
                  if (!obj || !(obj instanceof Backbone.Model)) {
                    if (_.isString(s.model) &&
                        s.model in pgBrowser.Nodes[s.model]) {
                      obj = new (pgBrowser.Nodes[s.model].Model)(
                          obj, {
                            top: self.top || self, handler: self, attrName: s.id
                          }
                          );
                    } else {
                      obj = new (s.model)(
                          obj, {
                            top: self.top || self, handler: self, attrName: s.id
                          });
                    }
                  }

                  obj.name = s.id;
                  self.objects.push(s.id);
                  self.set(s.id, obj, {silent: true});

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

        return self;
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
        if ('validate' in self && _.isFunction(self.validate) &&
            _.isString(self.validate.apply(self))) {
          return false;
        }
        return true;
      },
      set: function(key, val, options) {
        var opts = _.isObject(key) ? val : options;

        var res = Backbone.Model.prototype.set.call(this, key, val, options);

        if ((opts&& opts.intenal) || !this.trackChanges) {
          return true;
        }

        if (key != null && res) {
          var attrs = {};
          var self = this;

          attrChanged = function(v, k) {
            if (k in self.objects) {
              return;
            }
            attrs[k] = v;
            if (self.origSessAttrs[k] == v) {
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

          if ('validate' in self && typeof(self['validate']) === 'function') {

            var msg = self.validate(_.keys(attrs));

            /*
             * If any parent present, we will need to inform the parent - that
             * I have some issues/fixed the issue.
             *
             * If not parent found, we will raise the issue
             */
            if (msg != null) {
              if (self.collection || self.handler) {
                (self.collection || self.handler).trigger(
                    'pgadmin-session:model:invalid', msg, self
                    );
              } else {
                self.trigger('pgadmin-session:invalid', msg, self);
              }
            } else if (_.size(self.errorModel.attributes) == 0) {
              if (self.collection || self.handler) {
                (self.collection || self.handler).trigger(
                    'pgadmin-session:model:valid', self
                    );
              } else {
                self.trigger('pgadmin-session:valid', self.sessChanged(), self);
              }
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
        var self = this, res, isNew = self.isNew();

        session = (typeof(session) != "undefined" && session == true);

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
                if ((obj.sessChanged && obj.sessChanged()) || isNew) {
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
              } else {
                res[k] = (obj && obj.toJSON());
              }
            });
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

        var res = false;

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
                key = hasPrimaryKey ? obj.primary_key() : obj.cid,
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

          if (objName && !self.errorModel.has(objName)) {
            /*
             * We will trigger error information only once.
             */
            if (!_.size(self.errorModel.attributes)) {
              if (self.handler) {
                (self.handler).trigger('pgadmin-session:model:invalid', msg, self);
              } else  {
                self.trigger('pgadmin-session:invalid', msg, self);
              }
            }
            self.errorModel.set(objName, msg);
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
              key = hasPrimaryKey ? obj.primary_key() : obj.cid,
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

          if (objName && self.errorModel.has(objName)) {

            self.errorModel.unset(objName);

            /*
             * We will trigger validation information
             */
            if (_.size(self.errorModel.attributes) == 0) {
              if (self.handler) {
                (self.handler).trigger('pgadmin-session:model:valid', self);
              } else  {
                self.trigger(
                    'pgadmin-session:valid', self.sessChanged(), self
                    );
              }
            } else {
              var msg = _.values(self.errorModel.attributes)[0];

              if (self.handler) {
                (self.handler).trigger(
                    'pgadmin-session:model:invalid', msg, self
                    );
              } else  {
                self.trigger('pgadmin-session:invalid', msg, self);
              }
            }
          } else {
            /*
             * We will trigger validation information
             */
            if (_.size(self.errorModel.attributes) == 0) {
              if (self.handler) {
                (self.handler).trigger('pgadmin-session:model:valid', self);
              } else  {
                self.trigger(
                    'pgadmin-session:valid', self.sessChanged(), self
                    );
              }
            } else {
              var msg = _.values(self.errorModel.attributes)[0];

              if (self.handler) {
                (self.handler).trigger(
                    'pgadmin-session:model:invalid', msg, self
                    );
              } else  {
                self.trigger('pgadmin-session:invalid', msg, self);
              }
            }
          }
        }
      },

      onChildChanged: function(obj) {
        var self = this;

        if (self.trackChanges && self.collection) {
          (self.collection).trigger('change', self);
        }
      },

      stopSession: function() {
        var self = this;

        if (self.trackChanges) {
          self.off('pgadmin-session:model:invalid', self.onChildInvalid);
          self.off('pgadmin-session:model:valid', self.onChildValid);
          self.off('pgadmin-session:changed', self.onChildChanged);
          self.off('pgadmin-session:added', self.onChildChanged);
          self.off('pgadmin-session:removed', self.onChildChanged);
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
      }
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
          'invalid': []
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
        var self = this;

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
          'invalid': []
        };

        _.each(self.models, function(m) {
          if ('startNewSession' in m && _.isFunction(m.startNewSession)) {
            m.startNewSession();
          }
          if ('validate' in m && typeof(m.validate) === 'function') {
            var msg = m.validate();

            if (msg) {
              self.sessAttrs['invalid'].push(m);
            }
          }
        });

        // Let people know, I have started session hanlding
        self.trigger('pgadmin-session:start', self);

        self.on('pgadmin-session:model:invalid', self.onModelInvalid);
        self.on('pgadmin-session:model:valid', self.onModelValid);
      },
      onModelInvalid: function(msg, m) {
        var self = this;

        if (self.trackChanges) {
          // Do not add the existing invalid object
          if (self.objFindInSession(m, 'invalid') == -1) {
            self.sessAttrs['invalid'].push(m);
          }

          // Inform the parent that - I am an invalid object.
          if (self.handler) {
            (self.handler).trigger('pgadmin-session:model:invalid', msg, self);
          } else {
            self.trigger('pgadmin-session:invalid', msg, self);
          }
        }

        return true;
      },
      onModelValid: function(m) {
        var self = this;

        if (self.trackChanges) {
          // Find the object the invalid list, if found remove it from the list
          // and inform the parent that - I am a valid object now.
          var idx = self.objFindInSession(m, 'invalid');
          if (idx != -1) {
            self.sessAttrs['invalid'].splice(m, 1);
          }

          // Inform the parent that - I am the valid object.
          if (self.handler) {
            (self.handler).trigger('pgadmin-session:model:valid', self);
          } else {
            self.trigger('pgadmin-session:valid', self.sessChanged(), self);
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
          'invalid': []
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
        var self = this,
            session = (typeof(session) != "undefined" && session == true);

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

        if (!this.trackChanges)
          return true;

        var self = this,
            msg,
            isAlreadyInvalid = (_.size(self.sessAttrs['invalid']) != 0),
            idx = self.objFindInSession(obj, 'deleted');

        if ('validate' in obj && typeof(obj.validate) === 'function') {
          msg = obj.validate();

          if (msg) {
            self.sessAttrs['invalid'].push(obj);
          }
        }

        // Hmm.. - it was originally deleted from this collection, we should
        // remove it from the 'deleted' list.
        if (idx >= 0) {
          self.sessAttrs['deleted'].splice(idx, 1);

          // It has been changed originally!
          if ((!'sessChanged' in obj) || obj.sessChanged()) {
            self.sessAttrs['changed'].push(obj);
          }

          (self.handler || self).trigger('pgadmin-session:added', self, obj);

          /*
           * If the collection was already invalid, we don't need to inform the
           * parent, or raise the event for the invalid status.
           */
          if (!isAlreadyInvalid && !_.isUndefined(msg)) {
            if (self.handler) {
              self.handler.trigger('pgadmin-session:model:invalid', msg, self);
            } else {
              self.trigger('pgadmin-session:invalid', msg, self);
            }
          }

          return true;
        }
        self.sessAttrs['added'].push(obj);

        /*
         * Session has been changed
         */
        (self.handler || self).trigger('pgadmin-session:added', self, obj);

        /*
         * If the collection was already invalid, we don't need to inform the
         * parent, or raise the event for the invalid status.
         */
        if (!isAlreadyInvalid && !_.isUndefined(msg)) {
          if (self.handler) {
            self.handler.trigger('pgadmin-session:model:invalid', msg, self);
          } else {
            self.trigger('pgadmin-session:invalid', msg, self);
          }
        }

        return true;
      },
      onModelRemove: function(obj) {

        if (!this.trackChanges)
          return true;

        var self = this,
            idx = self.objFindInSession(obj, 'added'),
            copy = _.clone(obj);

        // We need to remove it from the invalid object list first.
        if (idx >= 0) {
          self.sessAttrs['invalid'].splice(idx, 1);
        }

        idx = self.objFindInSession(obj, 'added');
        // Hmm - it was newly added, we can safely remove it.
        if (idx >= 0) {
          self.sessAttrs['added'].splice(idx, 1);

          (self.handler || self).trigger('pgadmin-session:removed', self, copy);

          if (_.size(self.sessAttrs['invalid']) == 0) {
            if (self.handler) {
              self.handler.trigger('pgadmin-session:model:valid', self);
            } else {
              self.trigger('pgadmin-session:valid', self.sessChanged(), self);
            }
          }

          return true;
        }

        // Hmm - it was changed in this session, we should remove it from the
        // changed models.
        idx = self.objFindInSession(obj, 'changed');

        if (idx >= 0) {
          self.sessAttrs['changed'].splice(idx, 1);
          (self.handler || self).trigger('pgadmin-session:removed', self, copy);
        } else {
          (self.handler || self).trigger('pgadmin-session:removed', self, copy);
        }

        self.sessAttrs['deleted'].push(obj);

        /*
         * This object has been remove, that means - we can safely say, it has been
         * modified.
         */
        if (_.size(self.sessAttrs['invalid']) == 0) {
          if (self.handler) {
            self.handler.trigger('pgadmin-session:model:valid', self);
          } else {
            self.trigger('pgadmin-session:valid', true, self);
          }
        } else {
          if (self.handler) {
            self.handler.trigger('pgadmin-session:model:invalid', self);
          } else {
            self.trigger('pgadmin-session:invalid', true, self);
          }
        }

        return true;
      },
      onModelChange: function(obj) {

        if (!this.trackChanges || !(obj instanceof pgBrowser.Node.Model))
          return true;

        var self = this,
            idx = self.objFindInSession(obj, 'added');

        // It was newly added model, we don't need to add into the changed
        // list.
        if (idx >= 0) {
          (self.handler || self).trigger('pgadmin-session:changed', self, obj);

          return true;
        }

        idx = self.objFindInSession(obj, 'changed');

        if (!'sessChanged' in obj) {
          (self.handler || self).trigger('pgadmin-session:changed', self, obj);

          if (idx >= 0) {
            return true;
          }

          self.sessAttrs['changed'].push(obj);

          return true;
        }

        if (idx >= 0) {


          if (!obj.sessChanged()) {
            // This object is no more updated, removing it from the changed
            // models list.
            self.sessAttrs['changed'].splice(idx, 1);

            (self.handler || self).trigger('pgadmin-session:changed',self, obj);
            return true;
          }

          (self.handler || self).trigger('pgadmin-session:changed',self, obj);

          return true;
        }

        self.sessAttrs['changed'].push(obj);
        (self.handler || self).trigger('pgadmin-session:changed', self, obj);

        return true;
      }
    });

    pgBrowser.Events = _.extend({}, Backbone.Events);

    return pgBrowser;
});
