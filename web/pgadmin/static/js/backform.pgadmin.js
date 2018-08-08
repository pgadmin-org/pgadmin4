define([
  'sources/gettext', 'underscore', 'underscore.string', 'jquery',
  'backbone', 'backform', 'backgrid', 'codemirror', 'sources/sqleditor_utils',
  'spectrum', 'pgadmin.backgrid', 'select2',
], function(gettext, _, S, $, Backbone, Backform, Backgrid, CodeMirror, SqlEditorUtils) {

  var pgAdmin = (window.pgAdmin = window.pgAdmin || {}),
    pgBrowser = pgAdmin.Browser;

  pgAdmin.editableCell = function() {
    if (this.attributes && !_.isUndefined(this.attributes.disabled) &&
      !_.isNull(this.attributes.disabled)) {
      if (_.isFunction(this.attributes.disabled)) {
        return !(this.attributes.disabled.apply(this, arguments));
      }
      if (_.isBoolean(this.attributes.disabled)) {
        return !this.attributes.disabled;
      }
    }
  };

  // HTML markup global class names. More can be added by individual controls
  // using _.extend. Look at RadioControl as an example.
  _.extend(Backform, {
    controlLabelClassName: 'control-label pg-el-sm-3 pg-el-xs-12',
    controlsClassName: 'pgadmin-controls pg-el-sm-9 pg-el-xs-12',
    groupClassName: 'pgadmin-control-group form-group pg-el-xs-12',
    setGroupClassName: 'set-group pg-el-xs-12',
    tabClassName: 'backform-tab pg-el-xs-12',
    setGroupContentClassName: 'fieldset-content pg-el-xs-12',
  });

  Backform.controlMapper = {
    'int': ['uneditable-input', 'numeric', 'integer'],
    'text': ['uneditable-input', 'input', 'string'],
    'numeric': ['uneditable-input', 'numeric', 'numeric'],
    'date': 'datepicker',
    'datetime': 'datetimepicker',
    'boolean': 'boolean',
    'options': ['readonly-option', 'select', Backgrid.Extension.PGSelectCell],
    'multiline': ['textarea', 'textarea', 'string'],
    'collection': ['sub-node-collection', 'sub-node-collection', 'string'],
    'uniqueColCollection': ['unique-col-collection', 'unique-col-collection', 'string'],
    'switch': 'switch',
    'select2': 'select2',
    'note': 'note',
    'color': 'color',
  };

  Backform.getMappedControl = function(type, mode) {
    if (type in Backform.controlMapper) {
      var m = Backform.controlMapper[type];

      if (!_.isArray(m)) {
        return m;
      }

      var idx = 1,
        len = _.size(m);

      switch (mode) {
      case 'properties':
        idx = 0;
        break;
      case 'edit':
      case 'create':
      case 'control':
        idx = 1;
        break;
      case 'cell':
        idx = 2;
        break;
      default:
        idx = 0;
        break;
      }

      return m[idx > len ? 0 : idx];
    }
    return type;
  };


  var BackformControlInit = Backform.Control.prototype.initialize,
    BackformControlRemove = Backform.Control.prototype.remove;

  // Override the Backform.Control to allow to track changes in dependencies,
  // and rerender the View element
  _.extend(Backform.Control.prototype, {

    defaults: _.extend(Backform.Control.prototype.defaults, {
      helpMessage: null,
    }),

    initialize: function() {
      BackformControlInit.apply(this, arguments);

      // Listen to the dependent fields in the model for any change
      var deps = this.field.get('deps');
      var self = this;

      if (deps && _.isArray(deps)) {
        _.each(deps, function(d) {
          var attrArr = d.split('.');
          var name = attrArr.shift();
          self.listenTo(self.model, 'change:' + name, self.render);
        });
      }
    },

    remove: function() {
      // Remove the events for the dependent fields in the model
      var self = this,
        deps = self.field.get('deps');
      var attrArr = this.field.get('name').split('.');
      var name = attrArr.shift();

      self.stopListening(self.model, 'change:' + name, self.render);
      if (self.model.errorModel instanceof Backbone.Model) {
        self.stopListening(
          self.model.errorModel, 'change:' + name, self.updateInvalid
        );
      }

      if (deps && _.isArray(deps)) {
        _.each(deps, function(d) {

          var attrArr = d.split('.');
          var name = attrArr.shift();

          self.stopListening(self.model, 'change:' + name, self.render);
        });
      }

      if (this.cleanup) {
        this.cleanup.apply(this);
      }

      if (BackformControlRemove) {
        BackformControlRemove.apply(self, arguments);
      } else {
        Backbone.View.prototype.remove.apply(self, arguments);
      }
    },

    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>"><%=label%></label>',
      '<div class="<%=Backform.controlsClassName%>">',
      '  <span class="<%=Backform.controlClassName%> uneditable-input" <%=disabled ? "disabled" : ""%>>',
      '    <%-value%>',
      '  </span>',
      '</div>',
      '<% if (helpMessage && helpMessage.length) { %>',
      '  <span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
      '<% } %>',
    ].join('\n')),

    clearInvalid: function() {
      this.$el.removeClass(Backform.errorClassName);
      this.$el.find('.pgadmin-control-error-message').remove();
      return this;
    },

    updateInvalid: function() {
      var self = this,
        errorModel = this.model.errorModel;

      if (!(errorModel instanceof Backbone.Model)) return this;

      this.clearInvalid();

      /*
       * Find input which have name attribute.
       */
      this.$el.find(':input[name]').not('button').each(function(ix, el) {
        var error = self.keyPathAccessor(
          errorModel.toJSON(), $(el).attr('name')
        );

        if (_.isEmpty(error)) return;
        self.$el.addClass(Backform.errorClassName);
      });
    },

    /*
     * Overriding the render function of the control to allow us to eval the
     * values properly.
     */
    render: function() {
      var field = _.defaults(this.field.toJSON(), this.defaults),
        attributes = this.model.toJSON(),
        attrArr = field.name.split('.'),
        name = attrArr.shift(),
        path = attrArr.join('.'),
        rawValue = this.keyPathAccessor(attributes[name], path),
        data = _.extend(field, {
          rawValue: rawValue,
          value: this.formatter.fromRaw(rawValue, this.model),
          attributes: attributes,
          formatter: this.formatter,
        }),
        evalF = function(f, d, m) {
          return (_.isFunction(f) ? !!f.apply(d, [m]) : !!f);
        };

      // Evaluate the disabled, visible, and required option
      _.extend(data, {
        disabled: evalF(data.disabled, data, this.model),
        visible: evalF(data.visible, data, this.model),
        required: evalF(data.required, data, this.model),
      });

      // Clean up first
      this.$el.removeClass(Backform.hiddenClassName);

      if (!data.visible)
        this.$el.addClass(Backform.hiddenClassName);

      this.$el.html(this.template(data)).addClass(field.name);
      this.updateInvalid();

      return this;
    },
  });

  /*
   * Override the input control events in order to reslove the issue related to
   * not updating the value sometimes in the input control.
   */
  _.extend(
    Backform.InputControl.prototype, {
      events: {
        'change input': 'onChange',
        'blur input': 'onChange',
        'keyup input': 'onKeyUp',
        'focus input': 'clearInvalid',
      },
      onKeyUp: function(ev) {
        if (this.key_timeout) {
          clearTimeout(this.key_timeout);
        }

        this.keyup_timeout = setTimeout(function() {
          this.onChange(ev);
        }.bind(this), 400);
      },
    });

  /*
   * Override the textarea control events in order to resolve the issue related
   * to not updating the value in model on certain browsers in few situations
   * like copy/paste, deletion using backspace.
   *
   * Reference:
   * http://stackoverflow.com/questions/11338592/how-can-i-bind-to-the-change-event-of-a-textarea-in-jquery
   */
  _.extend(
    Backform.TextareaControl.prototype, {
      defaults: _.extend(
        Backform.TextareaControl.prototype.defaults, {
          rows: 5,
          helpMessage: null,
          maxlength: null,
        }
      ),
      events: {
        'change textarea': 'onChange',
        'keyup textarea': 'onKeyUp',
        'paste textarea': 'onChange',
        'selectionchange textarea': 'onChange',
        'focus textarea': 'clearInvalid',
      },
      template: _.template([
        '<label class="<%=Backform.controlLabelClassName%>"><%=label%></label>',
        '<div class="<%=Backform.controlsClassName%>">',
        '  <textarea ',
        '    class="<%=Backform.controlClassName%> <%=extraClasses.join(\' \')%>" name="<%=name%>"',
        '  <% if (maxlength) { %>',
        '    maxlength="<%=maxlength%>"',
        '  <% } %>',
        '    placeholder="<%-placeholder%>" <%=disabled ? "disabled" : ""%>',
        '    rows=<%=rows ? rows : ""%>',
        '    <%=required ? "required" : ""%>><%-value%></textarea>',
        '  <% if (helpMessage && helpMessage.length) { %>',
        '    <span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
        '  <% } %>',
        '</div>',
      ].join('\n')),
      onKeyUp: function(ev) {
        if (this.key_timeout) {
          clearTimeout(this.key_timeout);
        }

        this.keyup_timeout = setTimeout(function() {
          this.onChange(ev);
        }.bind(this), 400);
      },
    });

  /*
   * Overriding the render function of the select control to allow us to use
   * options as function, which should return array in the format of
   * (label, value) pair.
   */
  Backform.SelectControl.prototype.render = function() {
    var field = _.defaults(this.field.toJSON(), this.defaults),
      attributes = this.model.toJSON(),
      attrArr = field.name.split('.'),
      name = attrArr.shift(),
      path = attrArr.join('.'),
      rawValue = this.keyPathAccessor(attributes[name], path),
      data = _.extend(field, {
        rawValue: rawValue,
        value: this.formatter.fromRaw(rawValue, this.model),
        attributes: attributes,
        formatter: this.formatter,
      }),
      evalF = function(f, d, m) {
        return (_.isFunction(f) ? !!f.apply(d, [m]) : !!f);
      };

    // Evaluate the disabled, visible, and required option
    _.extend(data, {
      disabled: evalF(data.disabled, data, this.model),
      visible: evalF(data.visible, data, this.model),
      required: evalF(data.required, data, this.model),
    });
    // Evaluation the options
    if (_.isFunction(data.options)) {
      try {
        data.options = data.options(this);
      } catch (e) {
        // Do nothing
        data.options = [];
        this.model.trigger('pgadmin-view:transform:error', this.model, this.field, e);
      }
    }

    // Clean up first
    this.$el.removeClass(Backform.hiddenClassName);

    if (!data.visible)
      this.$el.addClass(Backform.hiddenClassName);

    this.$el.html(this.template(data)).addClass(field.name);
    this.updateInvalid();

    return this;
  };
  _.extend(Backform.SelectControl.prototype.defaults, {
    helpMessage: null,
  });

  Backform.ReadonlyOptionControl = Backform.SelectControl.extend({
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>"><%=label%></label>',
      '<div class="<%=Backform.controlsClassName%>">',
      '<% for (var i=0; i < options.length; i++) { %>',
      ' <% var option = options[i]; %>',
      ' <% if (option.value === rawValue) { %>',
      ' <span class="<%=Backform.controlClassName%> uneditable-input" disabled><%-option.label%></span>',
      ' <% } %>',
      '<% } %>',
      '<% if (helpMessage && helpMessage.length) { %>',
      '  <span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
      '<% } %>',
      '</div>',
    ].join('\n')),
    events: {},
    getValueFromDOM: function() {
      return this.formatter.toRaw(this.$el.find('span').text(), this.model);
    },
  });

  /*
   * Override the function 'updateInvalid' of the radio control to resolve an
   * issue, which will not render the error block multiple times for each
   * options.
   */
  _.extend(
    Backform.RadioControl.prototype, {
      updateInvalid: function() {
        var self = this,
          errorModel = this.model.errorModel;

        if (!(errorModel instanceof Backbone.Model)) return this;

        this.clearInvalid();

        /*
         * Find input which have name attribute.
         */
        this.$el.find(':input[name]').not('button').each(function(ix, el) {
          var error = self.keyPathAccessor(
            errorModel.toJSON(), $(el).attr('name')
          );

          if (_.isEmpty(error)) return;

          self.$el.addClass(Backform.errorClassName).find(
            '[type="radio"]'
          ).append(
            $('<div></div>').addClass(
              'pgadmin-control-error-message pg-el-xs-offset-4 pg-el-xs-8 pg-el-xs-8 help-block'
            ).text(error));
        });
      },
    });

  // Requires the Bootstrap Switch to work.
  Backform.SwitchControl = Backform.InputControl.extend({
    defaults: {
      label: '',
      options: {
        onText: gettext('Yes'),
        offText: gettext('No'),
        onColor: 'success',
        offColor: 'primary',
        size: 'small',
      },
      extraClasses: [],
      helpMessage: null,
    },
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>"><%=label%></label>',
      '<div class="<%=Backform.controlsClassName%>">',
      '  <div class="checkbox">',
      '    <label>',
      '      <input type="checkbox" class="<%=extraClasses.join(\' \')%>" name="<%=name%>" <%=value ? "checked=\'checked\'" : ""%> <%=disabled ? "disabled" : ""%> <%=required ? "required" : ""%> />',
      '    </label>',
      '  </div>',
      '  <% if (helpMessage && helpMessage.length) { %>',
      '    <span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
      '  <% } %>',
      '</div>',
    ].join('\n')),
    getValueFromDOM: function() {
      return this.formatter.toRaw(
        this.$input.prop('checked'),
        this.model
      );
    },
    events: {
      'switchChange.bootstrapSwitch': 'onChange',
    },
    render: function() {
      var field = _.defaults(this.field.toJSON(), this.defaults),
        attributes = this.model.toJSON(),
        attrArr = field.name.split('.'),
        name = attrArr.shift(),
        path = attrArr.join('.'),
        rawValue = this.keyPathAccessor(attributes[name], path),
        evalF = function(f, d, m) {
          return (_.isFunction(f) ? !!f.apply(d, [m]) : !!f);
        },
        options = _.defaults({
          disabled: evalF(field.disabled, field, this.model),
        }, this.field.get('options'), this.defaults.options,
          $.fn.bootstrapSwitch.defaults);

      Backform.InputControl.prototype.render.apply(this, arguments);
      this.$input = this.$el.find('input[type=checkbox]').first();

      //Check & set additional properties
      this.$input.bootstrapSwitch(
        _.extend(options, {
          'state': rawValue,
        })
      );

      return this;
    },
  });

  // Backform Dialog view (in bootstrap tabbular form)
  // A collection of field models.
  Backform.Dialog = Backform.Form.extend({
    /* Array of objects having attributes [label, fields] */
    schema: undefined,
    tagName: 'div',
    legend: true,
    className: function() {
      return 'pg-el-sm-12 pg-el-md-12 pg-el-lg-12 pg-el-xs-12';
    },
    tabPanelClassName: function() {
      return Backform.tabClassName;
    },
    tabIndex: 0,
    initialize: function(opts) {
      var s = opts.schema;
      if (s && _.isArray(s)) {
        this.schema = _.each(s, function(o) {
          if (o.fields && !(o.fields instanceof Backbone.Collection))
            o.fields = new Backform.Fields(o.fields);
          o.cId = o.cId || _.uniqueId('pgC_');
          o.hId = o.hId || _.uniqueId('pgH_');
          o.disabled = o.disabled || false;
          o.legend = opts.legend;
        });
        if (opts.tabPanelClassName && _.isFunction(opts.tabPanelClassName)) {
          this.tabPanelClassName = opts.tabPanelClassName;
        }
      }
      this.model.errorModel = opts.errorModel || this.model.errorModel || new Backbone.Model();
      this.controls = [];
    },
    template: {
      'header': _.template([
        '<li role="presentation" <%=disabled ? "disabled" : ""%>>',
        ' <a data-toggle="tab" tabindex="-1" data-tab-index="<%=tabIndex%>" href="#<%=cId%>"',
        '  id="<%=hId%>" aria-controls="<%=cId%>">',
        '<%=label%></a></li>',
      ].join(' ')),
      'panel': _.template(
        '<div role="tabpanel" tabindex="-1" class="tab-pane <%=label%> pg-el-sm-12 pg-el-md-12 pg-el-lg-12 pg-el-xs-12 fade" id="<%=cId%>" aria-labelledby="<%=hId%>"></div>'
      ),
    },
    render: function() {
      this.cleanup();

      var c = this.$el
        .children().first().children('.active')
        .first().attr('id'),
        m = this.model,
        controls = this.controls,
        tmpls = this.template,
        self = this,
        idx = (this.tabIndex * 100),
        evalF = function(f, d, m) {
          return (_.isFunction(f) ? !!f.apply(d, [m]) : !!f);
        };

      this.$el
        .empty()
        .attr('role', 'tabpanel')
        .attr('class', _.result(this, 'tabPanelClassName'));
      m.panelEl = this.$el;

      var tabHead = $('<ul class="nav nav-tabs" role="tablist"></ul>')
        .appendTo(this.$el);
      var tabContent = $('<ul class="tab-content pg-el-sm-12 pg-el-md-12 pg-el-lg-12 pg-el-xs-12"></ul>')
        .appendTo(this.$el);

      _.each(this.schema, function(o) {
        idx++;
        if (!o.version_compatible || !evalF(o.visible, o, m)) {
          return;
        }
        var el = $((tmpls['panel'])(_.extend(o, {
          'tabIndex': idx,
        })))
          .appendTo(tabContent)
          .removeClass('collapse').addClass('collapse');
        $((tmpls['header'])(o)).appendTo(tabHead);

        o.fields.each(function(f) {
          var cntr = new(f.get('control'))({
            field: f,
            model: m,
            dialog: self,
            tabIndex: idx,
          });
          el.append(cntr.render().$el);
          controls.push(cntr);
        });

        tabHead.find('a[data-toggle="tab"]').off(
          'shown.bs.tab'
        ).off('hidden.bs.tab').on(
          'hidden.bs.tab',
          function() {
            self.hidden_tab = $(this).data('tabIndex');
          }).on('shown.bs.tab', function() {
            var self = this;
            self.shown_tab = $(self).data('tabIndex');
            m.trigger('pg-property-tab-changed', {
              'model': m,
              'shown': self.shown_tab,
              'hidden': self.hidden_tab,
              'tab': self,
            });
          });
      });

      var makeActive = tabHead.find('[id="' + c + '"]').first();
      if (makeActive.length == 1) {
        makeActive.parent().addClass('active');
        tabContent.find('#' + makeActive.attr('aria-controls'))
          .addClass('in active');
      } else {
        tabHead.find('[role="presentation"]').first().addClass('active');
        tabContent.find('[role="tabpanel"]').first().addClass('in active');
      }

      return this;
    },
    remove: function(opts) {
      if (opts && opts.data) {
        if (this.model) {
          if (this.model.reset) {
            this.model.reset({
              validate: false,
              silent: true,
              stop: true,
            });
          }
          this.model.clear({
            validate: false,
            silent: true,
            stop: true,
          });
          delete(this.model);
        }
        if (this.errorModel) {
          this.errorModel.clear({
            validate: false,
            silent: true,
            stop: true,
          });
          delete(this.errorModel);
        }
      }
      this.cleanup();
      Backform.Form.prototype.remove.apply(this, arguments);
    },
  });

  Backform.Fieldset = Backform.Dialog.extend({
    className: function() {
      return 'set-group pg-el-xs-12';
    },
    tabPanelClassName: function() {
      return Backform.tabClassName;
    },
    fieldsetClass: Backform.setGroupClassName,
    legendClass: 'badge',
    contentClass: Backform.setGroupContentClassName + ' collapse in',
    template: {
      'header': _.template([
        '<fieldset class="<%=fieldsetClass%>" <%=disabled ? "disabled" : ""%>>',
        ' <% if (legend != false) { %>',
        '  <legend class="<%=legendClass%>" <%=collapse ? "data-toggle=\'collapse\'" : ""%> data-target="#<%=cId%>"><%=collapse ? "<span class=\'caret\'></span>" : "" %><%=label%></legend>',
        ' <% } %>',
        '</fieldset>',
      ].join('\n')),
      'content': _.template(
        '  <div id="<%= cId %>" class="<%=contentClass%>"></div>'
      ),
    },
    collapse: true,
    render: function() {
      this.cleanup();

      var m = this.model,
        $el = this.$el,
        tmpl = this.template,
        controls = this.controls,
        data = {
          'className': _.result(this, 'className'),
          'fieldsetClass': _.result(this, 'fieldsetClass'),
          'legendClass': _.result(this, 'legendClass'),
          'contentClass': _.result(this, 'contentClass'),
          'collapse': _.result(this, 'collapse'),
        },
        idx = (this.tabIndex * 100),
        evalF = function(f, d, m) {
          return (_.isFunction(f) ? !!f.apply(d, [m]) : !!f);
        };

      this.$el.empty();

      _.each(this.schema, function(o) {
        idx++;
        if (!o.version_compatible || !evalF(o.visible, o, m)) {
          return;
        }

        if (!o.fields)
          return;

        var d = _.extend({}, data, o),
          h = $((tmpl['header'])(d)).appendTo($el),
          el = $((tmpl['content'])(d)).appendTo(h);

        o.fields.each(function(f) {
          var cntr = new(f.get('control'))({
            field: f,
            model: m,
            tabIndex: idx,
          });
          el.append(cntr.render().$el);
          controls.push(cntr);
        });
      });

      return this;
    },
    getValueFromDOM: function() {
      return '';
    },
    events: {},
  });

  Backform.generateGridColumnsFromModel =
    function(node_info, m, type, cols, node) {
      var groups = Backform.generateViewSchema(
          node_info, m, type, node, true, true
        ),
        schema = [],
        columns = [],
        func,
        idx = 0;

      // Create another array if cols is of type object & store its keys in that array,
      // If cols is object then chances that we have custom width class attached with in.
      if (_.isNull(cols) || _.isUndefined(cols)) {
        func = function(f) {
          f.cell_priority = idx;
          idx = idx + 1;

          // We can also provide custom header cell class in schema itself,
          // But we will give priority to extraClass attached in cols
          // If headerCell property is already set by cols then skip extraClass property from schema
          if (!(f.headerCell) && f.cellHeaderClasses) {
            f.headerCell = Backgrid.Extension.CustomHeaderCell;
          }
        };
      } else if (_.isArray(cols)) {
        func = function(f) {
          f.cell_priority = _.indexOf(cols, f.name);

          // We can also provide custom header cell class in schema itself,
          // But we will give priority to extraClass attached in cols
          // If headerCell property is already set by cols then skip extraClass property from schema
          if ((!f.headerCell) && f.cellHeaderClasses) {
            f.headerCell = Backgrid.Extension.CustomHeaderCell;
          }
        };
      } else if (_.isObject(cols)) {
        var tblCols = Object.keys(cols);
        func = function(f) {
          var val = (f.name in cols) && cols[f.name],
            i;

          if (_.isNull(val) || _.isUndefined(val)) {
            f.cell_priority = -1;
            return;
          }
          if (_.isObject(val)) {
            if ('index' in val) {
              f.cell_priority = val['index'];
              idx = (idx > val['index']) ? idx + 1 : val['index'];
            } else {
              i = _.indexOf(tblCols, f.name);
              f.cell_priority = idx = ((i > idx) ? i : idx);
              idx = idx + 1;
            }

            // We can also provide custom header cell class in schema itself,
            // But we will give priority to extraClass attached in cols
            // If headerCell property is already set by cols then skip extraClass property from schema
            if (!f.headerCell) {
              if (f.cellHeaderClasses) {
                f.headerCell = Backgrid.Extension.CustomHeaderCell;
              }
              if ('class' in val && _.isString(val['class'])) {
                f.headerCell = Backgrid.Extension.CustomHeaderCell;
                f.cellHeaderClasses = (f.cellHeaderClasses || '') + ' ' + val['class'];
              }
            }
          }
          if (_.isString(val)) {
            i = _.indexOf(tblCols, f.name);

            f.cell_priority = idx = ((i > idx) ? i : idx);
            idx = idx + 1;

            if (!f.headerCell) {
              f.headerCell = Backgrid.Extension.CustomHeaderCell;
            }
            f.cellHeaderClasses = (f.cellHeaderClasses || '') + ' ' + val;
          }
        };
      }

      // Prepare columns for backgrid
      _.each(groups, function(group) {
        _.each(group.fields, function(f) {
          if (!f.cell) {
            return;
          }
          // Check custom property in cols & if it is present then attach it to current cell
          func(f);
          if (f.cell_priority != -1) {
            columns.push(f);
          }
        });
        schema.push(group);
      });
      return {
        'columns': _.sortBy(columns, function(c) {
          return c.cell_priority;
        }),
        'schema': schema,
      };
    };

  Backform.UniqueColCollectionControl = Backform.Control.extend({
    initialize: function() {
      Backform.Control.prototype.initialize.apply(this, arguments);

      var uniqueCol = this.field.get('uniqueCol') || [],
        m = this.field.get('model'),
        schema = m.prototype.schema || m.__super__.schema,
        columns = [],
        self = this;

      _.each(schema, function(s) {
        columns.push(s.id);
      });

      // Check if unique columns provided are also in model attributes.
      if (uniqueCol.length > _.intersection(columns, uniqueCol).length) {
        var errorMsg = 'Developer: Unique columns [ ' + _.difference(uniqueCol, columns) + ' ] not found in collection model [ ' + columns + ' ].';
        alert(errorMsg);
      }

      var collection = self.collection = self.model.get(self.field.get('name'));

      if (!collection) {
        collection = self.collection = new(pgAdmin.Browser.Node.Collection)(
          null, {
            model: self.field.get('model'),
            silent: true,
            handler: self.model,
            top: self.model.top || self.model,
            attrName: self.field.get('name'),
          });
        self.model.set(self.field.get('name'), collection, {
          silent: true,
        });
      }

      if (this.field.get('version_compatible')) {
        self.listenTo(collection, 'add', self.collectionChanged);
        self.listenTo(collection, 'change', self.collectionChanged);
      }
    },
    cleanup: function() {
      this.stopListening(this.collection, 'change', this.collectionChanged);

      if (this.field.get('version_compatible')) {
        this.stopListening(self.collection, 'add', this.collectionChanged);
        this.stopListening(self.collection, 'change', this.collectionChanged);
      }
      if (this.grid) {
        this.grid.remove();
        delete this.grid;
      }
      this.$el.empty();
    },
    collectionChanged: function(newModel, coll, op) {
      var uniqueCol = this.field.get('uniqueCol') || [],
        uniqueChangedAttr = [],
        self = this;
      // Check if changed model attributes are also in unique columns. And then only check for uniqueness.
      if (newModel.attributes) {
        _.each(uniqueCol, function(col) {
          if (_.has(newModel.attributes, col)) {
            uniqueChangedAttr.push(col);
          }
        });
        if (uniqueChangedAttr.length == 0) {
          return;
        }
      } else {
        return;
      }

      var collection = this.model.get(this.field.get('name'));
      this.stopListening(collection, 'change', this.collectionChanged);
      // Check if changed attribute's value of new/updated model also exist for another model in collection.
      // If duplicate value exists then set the attribute's value of new/updated model to its previous values.
      var m = undefined,
        oldModel = undefined;
      collection.each(function(model) {
        if (newModel != model) {
          var duplicateAttrValues = [];
          _.each(uniqueCol, function(attr) {
            var attrValue = newModel.get(attr);
            if (!_.isUndefined(attrValue) && attrValue == model.get(attr)) {
              duplicateAttrValues.push(attrValue);
            }
          });
          if (duplicateAttrValues.length == uniqueCol.length) {
            m = newModel;
            // Keep reference of model to make it visible in dialog.
            oldModel = model;
          }
        }
      });
      if (m) {
        if (op && op.add) {
          // Remove duplicate model.
          setTimeout(function() {
            collection.remove(m);
          }, 0);

        } else {
          /*
           * Set model value to its previous value as its new value is
           * conflicting with another model value.
           */

          m.set(uniqueChangedAttr[0], m.previous(uniqueChangedAttr[0]));
        }
        if (oldModel) {
          var idx = collection.indexOf(oldModel);
          if (idx > -1) {
            var newRow = self.grid.body.rows[idx].$el;
            newRow.addClass('new');
            $(newRow).pgMakeVisible('backform-tab');
            setTimeout(function() {
              newRow.removeClass('new');
            }, 3000);
          }
        }
      }

      this.listenTo(collection, 'change', this.collectionChanged);
    },
    render: function() {
      // Clean up existing elements

      this.undelegateEvents();
      this.$el.empty();

      var field = _.defaults(this.field.toJSON(), this.defaults),
        attributes = this.model.toJSON(),
        attrArr = field.name.split('.'),
        name = attrArr.shift(),
        path = attrArr.join('.'),
        rawValue = this.keyPathAccessor(attributes[name], path),
        data = _.extend(field, {
          rawValue: rawValue,
          value: this.formatter.fromRaw(rawValue, this.model),
          attributes: attributes,
          formatter: this.formatter,
        }),
        evalF = function(f, d, m) {
          return (_.isFunction(f) ? !!f.apply(d, [m]) : !!f);
        };

      // Evaluate the disabled, visible, required, canAdd, & canDelete option
      _.extend(data, {
        disabled: (field.version_compatible &&
          evalF.apply(this.field, [data.disabled, data, this.model])
        ),
        visible: evalF.apply(this.field, [data.visible, data, this.model]),
        required: evalF.apply(this.field, [data.required, data, this.model]),
        canAdd: (field.version_compatible &&
          evalF.apply(this.field, [data.canAdd, data, this.model])
        ),
        canAddRow: data.canAddRow,
        canDelete: evalF.apply(this.field, [data.canDelete, data, this.model]),
        canEdit: evalF.apply(this.field, [data.canEdit, data, this.model]),
      });
      _.extend(data, {
        add_label: '',
      });

      // This control is not visible, we should remove it.
      if (!data.visible) {
        return this;
      }

      this.control_data = _.clone(data);

      // Show Backgrid Control
      var grid = this.showGridControl(data);

      this.$el.html(grid).addClass(field.name);
      this.updateInvalid();

      this.delegateEvents();
      return this;
    },
    showGridControl: function(data) {
      var self = this,
        gridHeader = _.template([
          '<div class="subnode-header">',
          '  <label class="control-label pg-el-sm-10"><%-label%></label>',
          '  <button class="btn-sm btn-default add fa fa-plus" <%=canAdd ? "" : "disabled=\'disabled\'"%> title="' + _('Add new row') + '"><%-add_label%></button>',
          '</div>',
        ].join('\n')),
        gridBody = $('<div class="pgadmin-control-group backgrid form-group pg-el-xs-12 object subnode"></div>').append(
          gridHeader(data)
        );

      // Clean up existing grid if any (in case of re-render)
      if (self.grid) {
        self.grid.remove();
      }

      if (!(data.subnode)) {
        return '';
      }

      var subnode = data.subnode.schema ? data.subnode : data.subnode.prototype,
        gridSchema = Backform.generateGridColumnsFromModel(
          data.node_info, subnode, this.field.get('mode'), data.columns
        );

      // Set visibility of Add button
      if (data.mode == 'properties') {
        $(gridBody).find('button.add').remove();
      }

      // Insert Delete Cell into Grid
      if (!data.disabled && data.canDelete) {
        gridSchema.columns.unshift({
          name: 'pg-backform-delete',
          label: '',
          cell: Backgrid.Extension.DeleteCell,
          editable: false,
          cell_priority: -1,
          canDeleteRow: data.canDeleteRow,
        });
      }

      // Insert Edit Cell into Grid
      if (data.disabled == false && data.canEdit) {
        var editCell = Backgrid.Extension.ObjectCell.extend({
          schema: gridSchema.schema,
        });

        gridSchema.columns.unshift({
          name: 'pg-backform-edit',
          label: '',
          cell: editCell,
          cell_priority: -2,
          canEditRow: data.canEditRow,
        });
      }

      var collection = this.model.get(data.name);

      var cellEditing = function(args) {
        var that = this,
          cell = args[0];
        // Search for any other rows which are open.
        this.each(function(m) {
          // Check if row which we are about to close is not current row.
          if (cell.model != m) {
            var idx = that.indexOf(m);
            if (idx > -1) {
              var row = self.grid.body.rows[idx],
                editCell = row.$el.find('.subnode-edit-in-process').parent();
              // Only close row if it's open.
              if (editCell.length > 0) {
                var event = new Event('click');
                editCell[0].dispatchEvent(event);
              }
            }
          }
        });
      };
      // Listen for any row which is about to enter in edit mode.
      collection.on('enteringEditMode', cellEditing, collection);

      // Initialize a new Grid instance
      self.grid = new Backgrid.Grid({
        columns: gridSchema.columns,
        collection: collection,
        className: 'backgrid table-bordered',
      });

      // Render subNode grid
      var subNodeGrid = self.grid.render().$el;

      // Combine Edit and Delete Cell
      if (data.canDelete && data.canEdit) {
        $(subNodeGrid).find('th.pg-backform-delete').remove();
        $(subNodeGrid).find('th.pg-backform-edit').attr('colspan', '2');
      }

      var $dialog = gridBody.append(subNodeGrid);

      // Add button callback
      if (!(data.disabled || data.canAdd == false)) {
        $dialog.find('button.add').first().on('click',(e) => {
          e.preventDefault();
          var canAddRow = _.isFunction(data.canAddRow) ?
            data.canAddRow.apply(self, [self.model]) : true;
          if (canAddRow) {
            // Close any existing expanded row before adding new one.
            _.each(self.grid.body.rows, function(row) {
              var editCell = row.$el.find('.subnode-edit-in-process').parent();
              // Only close row if it's open.
              if (editCell.length > 0) {
                var event = new Event('click');
                editCell[0].dispatchEvent(event);
              }
            });

            var allowMultipleEmptyRows = !!self.field.get('allowMultipleEmptyRows');

            // If allowMultipleEmptyRows is not set or is false then don't allow second new empty row.
            // There should be only one empty row.
            if (!allowMultipleEmptyRows && collection) {
              var isEmpty = false;
              collection.each(function(model) {
                var modelValues = [];
                _.each(model.attributes, function(val) {
                  modelValues.push(val);
                });
                if (!_.some(modelValues, _.identity)) {
                  isEmpty = true;
                }
              });
              if (isEmpty) {
                return false;
              }
            }

            $(self.grid.body.$el.find($('tr.new'))).removeClass('new');
            var m = new(data.model)(null, {
              silent: true,
              handler: collection,
              top: self.model.top || self.model,
              collection: collection,
              node_info: self.model.node_info,
            });
            collection.add(m);

            var idx = collection.indexOf(m),
              newRow = self.grid.body.rows[idx].$el;

            newRow.addClass('new');
            $(newRow).pgMakeVisible('backform-tab');

            return false;
          }
        });
      }

      return $dialog;
    },
    clearInvalid: function() {
      this.$el.removeClass('subnode-error');
      this.$el.find('.pgadmin-control-error-message').remove();
      return this;
    },
    updateInvalid: function() {
      var self = this,
        errorModel = this.model.errorModel;

      if (!(errorModel instanceof Backbone.Model)) return this;

      this.clearInvalid();

      this.$el.find('.subnode-body').each(function() {
        var error = self.keyPathAccessor(
          errorModel.toJSON(), self.field.get('name')
        );

        if (_.isEmpty(error)) return;

        self.$el.addClass('subnode-error').append(
          $('<div></div>').addClass(
            'pgadmin-control-error-message pg-el-xs-offset-4 pg-el-xs-8 help-block'
          ).text(error)
        );
      });
    },
  });

  Backform.SubNodeCollectionControl = Backform.Control.extend({
    row: Backgrid.Row,
    render: function() {
      var field = _.defaults(this.field.toJSON(), this.defaults),
        attributes = this.model.toJSON(),
        attrArr = field.name.split('.'),
        name = attrArr.shift(),
        path = attrArr.join('.'),
        rawValue = this.keyPathAccessor(attributes[name], path),
        data = _.extend(field, {
          rawValue: rawValue,
          value: this.formatter.fromRaw(rawValue, this.model),
          attributes: attributes,
          formatter: this.formatter,
        }),
        evalF = function(f, d, m) {
          return (_.isFunction(f) ? !!f.apply(d, [m]) : !!f);
        };

      // Evaluate the disabled, visible, required, canAdd, cannEdit & canDelete option
      _.extend(data, {
        disabled: evalF(data.disabled, data, this.model),
        visible: evalF(data.visible, data, this.model),
        required: evalF(data.required, data, this.model),
        canAdd: evalF(data.canAdd, data, this.model),
        canAddRow: data.canAddRow,
        canEdit: evalF(data.canEdit, data, this.model),
        canDelete: evalF(data.canDelete, data, this.model),
        showError: data.showError || true,
      });
      // Show Backgrid Control
      var grid = (data.subnode == undefined) ? '' : this.showGridControl(data);

      // Clean up first
      this.$el.removeClass(Backform.hiddenClassName);

      if (!data.visible)
        this.$el.addClass(Backform.hiddenClassName);

      this.$el.html(grid).addClass(field.name);
      this.updateInvalid();

      return this;
    },
    updateInvalid: function() {
      var self = this;
      var errorModel = this.model.errorModel;
      if (!(errorModel instanceof Backbone.Model)) return this;

      this.clearInvalid();

      var attrArr = self.field.get('name').split('.'),
        path = attrArr.join('.'),
        error = self.keyPathAccessor(errorModel.toJSON(), path);

      if (_.isEmpty(error)) return;

      if (self.field.get('showError')) {
        self.$el.addClass('subnode-error').append(
          $('<div></div>').addClass('pgadmin-control-error-message pg-el-xs-offset-4 pg-el-xs-8 help-block').text(error)
        );
      }
    },
    cleanup: function() {
      // Clean up existing grid if any (in case of re-render)
      if (this.grid) {
        this.grid.remove();
      }
      if (this.collection) {
        this.collection.off('enteringEditMode');
      }
    },
    clearInvalid: function() {
      if (this.field.get('showError')) {
        this.$el.removeClass('subnode-error');
        this.$el.find('.pgadmin-control-error-message').remove();
      }
      return this;
    },
    showGridControl: function(data) {
      var self = this,
        gridHeader = ['<div class=\'subnode-header\'>',
          '  <label class=\'control-label pg-el-sm-10\'>' + data.label + '</label>',
          '  <button class=\'btn-sm btn-default add fa fa-plus\' title=\'' + _('Add new row') + '\'></button>',
          '</div>',
        ].join('\n'),
        gridBody = $('<div class=\'pgadmin-control-group backgrid form-group pg-el-xs-12 object subnode\'></div>').append(gridHeader);

      var subnode = data.subnode.schema ? data.subnode : data.subnode.prototype,
        gridSchema = Backform.generateGridColumnsFromModel(
          data.node_info, subnode, this.field.get('mode'), data.columns, data.schema_node
        );

      // Clean up existing grid if any (in case of re-render)
      if (self.grid) {
        self.grid.remove();
      }

      // Set visibility of Add button
      if (data.disabled || data.canAdd == false) {
        $(gridBody).find('button.add').remove();
      }

      // Insert Delete Cell into Grid
      if (data.disabled == false && data.canDelete) {
        gridSchema.columns.unshift({
          name: 'pg-backform-delete',
          label: '',
          cell: Backgrid.Extension.DeleteCell,
          editable: false,
          cell_priority: -1,
          canDeleteRow: data.canDeleteRow,
          customDeleteMsg: data.customDeleteMsg,
          customDeleteTitle: data.customDeleteTitle,
        });
      }

      // Insert Edit Cell into Grid
      if (data.disabled == false && data.canEdit) {
        var editCell = Backgrid.Extension.ObjectCell.extend({
            schema: gridSchema.schema,
          }),
          canEdit = self.field.has('canEdit') &&
          self.field.get('canEdit') || true;

        gridSchema.columns.unshift({
          name: 'pg-backform-edit',
          label: '',
          cell: editCell,
          cell_priority: -2,
          editable: canEdit,
          canEditRow: data.canEditRow,
        });
      }

      var collection = self.model.get(data.name);

      if (!collection) {
        collection = new(pgBrowser.Node.Collection)(null, {
          handler: self.model.handler || self.model,
          model: data.model,
          top: self.model.top || self.model,
          silent: true,
        });
        self.model.set(data.name, collection, {
          silent: true,
        });
      }

      var cellEditing = function(args) {
        var self = this,
          cell = args[0];
        // Search for any other rows which are open.
        this.each(function(m) {
          // Check if row which we are about to close is not current row.
          if (cell.model != m) {
            var idx = self.indexOf(m);
            if (idx > -1) {
              var row = grid.body.rows[idx],
                editCell = row.$el.find('.subnode-edit-in-process').parent();
              // Only close row if it's open.
              if (editCell.length > 0) {
                var event = new Event('click');
                editCell[0].dispatchEvent(event);
              }
            }
          }
        });
      };
      // Listen for any row which is about to enter in edit mode.
      collection.on('enteringEditMode', cellEditing, collection);

      // Initialize a new Grid instance
      var grid = self.grid = new Backgrid.Grid({
        columns: gridSchema.columns,
        collection: collection,
        row: this.row,
        className: 'backgrid table-bordered',
      });

      // Render subNode grid
      var subNodeGrid = grid.render().$el;

      // Combine Edit and Delete Cell
      if (data.canDelete && data.canEdit) {
        $(subNodeGrid).find('th.pg-backform-delete').remove();
        $(subNodeGrid).find('th.pg-backform-edit').attr('colspan', '2');
      }

      var $dialog = gridBody.append(subNodeGrid);

      // Add button callback
      $dialog.find('button.add').on('click',(e) => {
        e.preventDefault();
        var canAddRow = _.isFunction(data.canAddRow) ?
          data.canAddRow.apply(self, [self.model]) : true;
        if (canAddRow) {
          // Close any existing expanded row before adding new one.
          _.each(grid.body.rows, function(row) {
            var editCell = row.$el.find('.subnode-edit-in-process').parent();
            // Only close row if it's open.
            if (editCell.length > 0) {
              var event = new Event('click');
              editCell[0].dispatchEvent(event);
            }
          });

          grid.insertRow({});

          var newRow = $(grid.body.rows[collection.length - 1].$el);
          newRow.attr('class', 'new').on('click',() => {
            $(this).attr('class', 'editable');
          });
          $(newRow).pgMakeVisible('backform-tab');
          return false;
        }
      });

      return $dialog;
    },
  });

  /*
   * SQL Tab Control for showing the modified SQL for the node with the
   * property 'hasSQL' is set to true.
   *
   * When the user clicks on the SQL tab, we will send the modified data to the
   * server and fetch the SQL for it.
   */
  Backform.SqlTabControl = Backform.Control.extend({
    defaults: {
      label: '',
      controlsClassName: 'pgadmin-controls pg-el-sm-12 SQL',
      extraClasses: [],
      helpMessage: null,
    },
    template: _.template([
      '<div class="<%=controlsClassName%>">',
      '  <textarea class="<%=Backform.controlClassName%> <%=extraClasses.join(\' \')%>" name="<%=name%>" placeholder="<%-placeholder%>" <%=disabled ? "disabled" : ""%> <%=required ? "required" : ""%>><%-value%></textarea>',
      '  <% if (helpMessage && helpMessage.length) { %>',
      '    <span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
      '  <% } %>',
      '</div>',
    ].join('\n')),
    /*
     * Initialize the SQL Tab control properly
     */
    initialize: function(o) {
      Backform.Control.prototype.initialize.apply(this, arguments);

      // Save the required information for using it later.
      this.dialog = o.dialog;
      this.tabIndex = o.tabIndex;

      _.bindAll(this, 'onTabChange', 'onPanelResized');
    },
    getValueFromDOM: function() {
      return this.formatter.toRaw(this.$el.find('textarea').val(), this.model);
    },

    reflectPreferences: function() {
      var self = this;
      /* self.sqlCtrl is null when SQL tab is not active */
      if(self.sqlCtrl) {
        let sqlEditPreferences = pgAdmin.Browser.get_preferences_for_module('sqleditor');

        $(self.sqlCtrl.getWrapperElement()).css(
          'font-size',SqlEditorUtils.calcFontSize(sqlEditPreferences.sql_font_size)
        );
        self.sqlCtrl.setOption('tabSize', sqlEditPreferences.tab_size);
        self.sqlCtrl.setOption('lineWrapping', sqlEditPreferences.wrap_code);
        self.sqlCtrl.setOption('autoCloseBrackets', sqlEditPreferences.insert_pair_brackets);
        self.sqlCtrl.setOption('matchBrackets', sqlEditPreferences.brace_matching);
        self.sqlCtrl.refresh();
      }
    },
    render: function() {
      if (this.sqlCtrl) {
        this.sqlCtrl.toTextArea();
        delete this.sqlCtrl;
        this.sqlCtrl = null;
        this.$el.empty();
        this.model.off('pg-property-tab-changed', this.onTabChange, this);
        this.model.off('pg-browser-resized', this.onPanelResized, this);
      }
      // Use the Backform Control's render function
      Backform.Control.prototype.render.apply(this, arguments);

      this.sqlCtrl = CodeMirror.fromTextArea(
        (this.$el.find('textarea')[0]), {
          lineNumbers: true,
          mode: 'text/x-pgsql',
          readOnly: true,
          extraKeys: pgAdmin.Browser.editor_shortcut_keys,
        });

      this.reflectPreferences();

      /* Check for sql editor preference changes */
      let self = this;
      pgBrowser.onPreferencesChange('sqleditor', function() {
        self.reflectPreferences();
      });

      /*
       * We will listen to the tab change event to check, if the SQL tab has
       * been clicked or, not.
       */
      this.model.on('pg-property-tab-changed', this.onTabChange, this);
      this.model.on('pg-browser-resized', this.onPanelResized, this);

      return this;
    },
    onTabChange: function(obj) {

      // Fetch the information only if the SQL tab is visible at the moment.
      if (this.dialog && obj.shown == this.tabIndex) {

        // We will send a request to the sever only if something has changed
        // in a model and also it does not contain any error.
        if (this.model.sessChanged()) {
          if (_.size(this.model.errorModel.attributes) == 0) {
            var self = this,
              node = self.field.get('schema_node'),
              msql_url = node.generate_url.apply(
                node, [
                  null, 'msql', this.field.get('node_data'), !self.model.isNew(),
                  this.field.get('node_info'),
                ]);

            // Fetching the modified SQL
            self.model.trigger('pgadmin-view:msql:fetching', self.method, node);

            $.ajax({
              url: msql_url,
              type: 'GET',
              cache: false,
              data: self.model.toJSON(true, 'GET'),
              dataType: 'json',
              contentType: 'application/json',
            }).done(function(res) {
              self.sqlCtrl.clearHistory();
              self.sqlCtrl.setValue(res.data);
            }).fail(function() {
              self.model.trigger('pgadmin-view:msql:error', self.method, node, arguments);
            }).always(function() {
              self.model.trigger('pgadmin-view:msql:fetched', self.method, node, arguments);
            });
          } else {
            this.sqlCtrl.clearHistory();
            this.sqlCtrl.setValue('-- ' + gettext('Definition incomplete.'));
          }
        } else {
          this.sqlCtrl.clearHistory();
          this.sqlCtrl.setValue('-- ' + gettext('Nothing changed.'));
        }
        this.sqlCtrl.refresh.apply(this.sqlCtrl);
      }
    },
    onPanelResized: function(o) {
      if (o && o.container) {
        var $tabContent = o.container.find(
            '.backform-tab > .tab-content'
          ).first(),
          $sqlPane = $tabContent.find(
            'div[role=tabpanel].tab-pane.SQL'
          );
        if ($sqlPane.hasClass('active')) {
          $sqlPane.find('.CodeMirror').css(
            'cssText',
            'height: ' + ($tabContent.height() + 8) + 'px !important;'
          );
        }
      }
    },
    remove: function() {
      if (this.sqlCtrl) {
        this.sqlCtrl.toTextArea();
        delete this.sqlCtrl;
        this.sqlCtrl = null;

        this.$el.empty();
      }
      this.model.off('pg-property-tab-changed', this.onTabChange, this);
      this.model.off('pg-browser-resized', this.onPanelResized, this);

      Backform.Control.__super__.remove.apply(this, arguments);
    },
  });
  /*
   * Numeric input Control functionality just like backgrid
   */
  Backform.NumericControl = Backform.InputControl.extend({
    defaults: {
      type: 'number',
      label: '',
      min: undefined,
      max: undefined,
      maxlength: 255,
      extraClasses: [],
      helpMessage: null,
    },
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>"><%=label%></label>',
      '<div class="<%=Backform.controlsClassName%>">',
      '  <input type="<%=type%>" class="<%=Backform.controlClassName%> <%=extraClasses.join(\' \')%>" name="<%=name%>" min="<%=min%>" max="<%=max%>"maxlength="<%=maxlength%>" value="<%-value%>" placeholder="<%-placeholder%>" <%=disabled ? "disabled" : ""%> <%=required ? "required" : ""%> />',
      '  <% if (helpMessage && helpMessage.length) { %>',
      '    <span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
      '  <% } %>',
      '</div>',
    ].join('\n')),
  });

  ///////
  // Generate a schema (as group members) based on the model's schema
  //
  // It will be used by the grid, properties, and dialog view generation
  // functions.
  Backform.generateViewSchema = function(
    node_info, Model, mode, node, treeData, noSQL, subschema
  ) {
    var proto = (Model && Model.prototype) || Model,
      schema = subschema || (proto && proto.schema),
      fields = [],
      groupInfo = {};

    // 'schema' has the information about how to generate the form.
    if (schema && _.isArray(schema)) {
      var evalASFunc = evalASFunc = function(prop) {
        return ((prop && proto[prop] &&
          typeof proto[prop] == 'function') ? proto[prop] : prop);
      };
      var groups = {},
        server_info = node_info && ('server' in node_info) &&
        pgBrowser.serverInfo && pgBrowser.serverInfo[node_info.server._id],
        in_catalog = node_info && ('catalog' in node_info),
        ver_in_limit;

      _.each(schema, function(s) {
        // Do we understand - what control, we're creating
        // here?
        if (s.type == 'group') {
          var visible = true;
          ver_in_limit = (_.isUndefined(server_info) ? true :
            ((_.isUndefined(s.server_type) ? true :
                (server_info.type in s.server_type)) &&
              (_.isUndefined(s.min_version) ? true :
                (server_info.version >= s.min_version)) &&
              (_.isUndefined(s.max_version) ? true :
                (server_info.version <= s.max_version))));

          if (s.mode && _.isObject(s.mode))
            visible = (_.indexOf(s.mode, mode) > -1);
          if (visible)
            visible = evalASFunc(s.visible);

          groupInfo[s.id] = {
            label: s.label || s.id,
            version_compatible: ver_in_limit,
            visible: visible,
          };
          return;
        }

        if (!s.mode || (s && s.mode && _.isObject(s.mode) &&
            _.indexOf(s.mode, mode) != -1)) {
          // Each field is kept in specified group, or in
          // 'General' category.
          var group = s.group || gettext('General'),
            control = s.control || Backform.getMappedControl(s.type, mode),
            cell = s.cell || Backform.getMappedControl(s.type, 'cell');

          if (control == null) {
            return;
          }

          // Generate the empty group list (if not exists)
          groups[group] = (groups[group] || []);
          ver_in_limit = (_.isUndefined(server_info) ? true :
            ((_.isUndefined(s.server_type) ? true :
                (server_info.type in s.server_type)) &&
              (_.isUndefined(s.min_version) ? true :
                (server_info.version >= s.min_version)) &&
              (_.isUndefined(s.max_version) ? true :
                (server_info.version <= s.max_version))));

          var disabled = (
              (mode == 'properties') || !ver_in_limit || in_catalog
            ),
            schema_node = (s.node && _.isString(s.node) &&
              s.node in pgBrowser.Nodes && pgBrowser.Nodes[s.node]) || node;

          var o = _.extend(_.clone(s), {
            name: s.id,
            // This can be disabled in some cases (if not hidden)

            disabled: (disabled ? true : evalASFunc(s.disabled)),
            editable: _.isUndefined(s.editable) ?
              pgAdmin.editableCell : evalASFunc(s.editable),
            subnode: ((_.isString(s.model) && s.model in pgBrowser.Nodes) ?
              pgBrowser.Nodes[s.model].model : s.model),
            canAdd: (disabled ? false : evalASFunc(s.canAdd)),
            canAddRow: (disabled ? false : evalASFunc(s.canAddRow)),
            canEdit: (disabled ? false : evalASFunc(s.canEdit)),
            canDelete: (disabled ? false : evalASFunc(s.canDelete)),
            canEditRow: (disabled ? false : evalASFunc(s.canEditRow)),
            canDeleteRow: (disabled ? false : evalASFunc(s.canDeleteRow)),
            transform: evalASFunc(s.transform),
            mode: mode,
            control: control,
            cell: cell,
            node_info: node_info,
            schema_node: schema_node,
            // Do we need to show this control in this mode?
            visible: evalASFunc(s.visible),
            node: node,
            node_data: treeData,
            version_compatible: ver_in_limit,
          });
          delete o.id;

          // Temporarily store in dictionary format for
          // utilizing it later.
          groups[group].push(o);

          if (s.type == 'nested') {
            delete o.name;
            delete o.cell;

            o.schema = Backform.generateViewSchema(
              node_info, Model, mode, node, treeData, true, s.schema
            );
            o.control = o.control || 'tab';
          }
        }
      });

      // Do we have fields to genreate controls, which we
      // understand?
      if (_.isEmpty(groups)) {
        return null;
      }

      if (!noSQL && node && node.hasSQL && (mode == 'create' || mode == 'edit')) {
        groups[gettext('SQL')] = [{
          name: 'sql',
          visible: true,
          disabled: false,
          type: 'text',
          control: 'sql-tab',
          node_info: node_info,
          schema_node: node,
          node_data: treeData,
        }];
      }

      // Create an array from the dictionary with proper required
      // structure.
      _.each(groups, function(val, key) {
        fields.push(
          _.extend(
            _.defaults(
              groupInfo[key] || {
                label: key,
              }, {
                version_compatible: true,
                visible: true,
              }
            ), {
              fields: val,
            })
        );
      });
    }

    return fields;
  };

  var Select2Formatter = function() {};
  _.extend(Select2Formatter.prototype, {
    fromRaw: function(rawData) {
      return encodeURIComponent(rawData);
    },
    toRaw: function(formattedData) {
      if (_.isArray(formattedData)) {
        return _.map(formattedData, decodeURIComponent);
      } else {
        if (!_.isNull(formattedData) && !_.isUndefined(formattedData)) {
          return decodeURIComponent(formattedData);
        } else {
          return null;
        }
      }
    },
  });

  /*
   *  Backform Select2 control.
   */
  Backform.Select2Control = Backform.SelectControl.extend({
    defaults: _.extend({}, Backform.SelectControl.prototype.defaults, {
      select2: {
        first_empty: true,
        multiple: false,
        emptyOptions: false,
      },
    }),
    formatter: Select2Formatter,
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>"><%=label%></label>',
      '<div class="<%=Backform.controlsClassName%>">',
      ' <select class="<%=Backform.controlClassName%> <%=extraClasses.join(\' \')%>"',
      '  name="<%=name%>" value="<%-value%>" <%=disabled ? "disabled" : ""%>',
      '  <%=required ? "required" : ""%><%= select2.multiple ? " multiple>" : ">" %>',
      '  <%=select2.first_empty ? " <option></option>" : ""%>',
      '  <% for (var i=0; i < options.length; i++) {%>',
      '   <% var option = options[i]; %>',
      '   <option ',
      '    <% if (option.image) { %> data-image=<%=option.image%> <%}%>',
      '    value=<%- formatter.fromRaw(option.value) %>',
      '    <% if (option.selected) {%>selected="selected"<%} else {%>',
      '    <% if (!select2.multiple && option.value === rawValue) {%>selected="selected"<%}%>',
      '    <% if (select2.multiple && rawValue && rawValue.indexOf(option.value) != -1){%>selected="selected" data-index="rawValue.indexOf(option.value)"<%}%>',
      '    <%}%>',
      '    <%= disabled ? "disabled" : ""%>><%-option.label%></option>',
      '  <%}%>',
      ' </select>',
      ' <% if (helpMessage && helpMessage.length) { %>',
      ' <span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
      ' <% } %>',
      '</div>',
    ].join('\n')),
    render: function() {

      if (this.$sel && this.$sel.select2 &&
        this.$sel.select2.hasOwnProperty('destroy')) {
        this.$sel.select2('destroy');
      }

      var field = _.defaults(this.field.toJSON(), this.defaults),
        attributes = this.model.toJSON(),
        attrArr = field.name.split('.'),
        name = attrArr.shift(),
        path = attrArr.join('.'),
        rawValue = this.keyPathAccessor(attributes[name], path),
        data = _.extend(field, {
          rawValue: rawValue,
          value: this.formatter.fromRaw(rawValue, this.model),
          attributes: attributes,
          formatter: this.formatter,
        }),
        evalF = function(f, d, m) {
          return (_.isFunction(f) ? !!f.apply(d, [m]) : !!f);
        };

      data.select2 = data.select2 || {};
      _.defaults(data.select2, this.defaults.select2, {
        first_empty: true,
        multiple: false,
        emptyOptions: false,
      });

      // Evaluate the disabled, visible, and required option
      _.extend(data, {
        disabled: evalF(data.disabled, data, this.model),
        visible: evalF(data.visible, data, this.model),
        required: evalF(data.required, data, this.model),
      });

      // Evaluation the options
      if (_.isFunction(data.options)) {
        try {
          data.options = data.options(this);
        } catch (e) {
          // Do nothing
          data.options = [];
          this.model.trigger(
            'pgadmin-view:transform:error', this.model, this.field, e
          );
        }
      }

      // Clean up first
      this.$el.removeClass(Backform.hiddenClassName);

      if (!data.visible)
        this.$el.addClass(Backform.hiddenClassName);

      this.$el.html(this.template(data)).addClass(field.name);

      var select2Opts = _.extend({
        disabled: data.disabled,
      }, field.select2, {
        options: (this.field.get('options') || this.defaults.options),
      });

      // If disabled then no need to show placeholder
      if (data.disabled || data.mode === 'properties') {
        select2Opts['placeholder'] = '';
      }

      /*
       * Add empty option as Select2 requires any empty '<option><option>' for
       * some of its functionality to work and initialize select2 control.
       */

      if (data.select2.tags && data.select2.emptyOptions) {
        select2Opts.data = data.rawValue;
      }

      this.$sel = this.$el.find('select').select2(select2Opts);

      // Add or remove tags from select2 control
      if (data.select2.tags && data.select2.emptyOptions) {
        this.$sel.val(data.rawValue);
        this.$sel.trigger('change.select2');
        this.$sel.on('select2:unselect', function(evt) {

          $(this).find('option[value="' + evt.params.data.text.replace('\'', '\\\'').replace('"', '\\"') + '"]').remove();
          $(this).trigger('change.select2');
          if ($(this).val() == null) {
            $(this).empty();
          }
        });


      }

      // Select the highlighted item on Tab press.
      if (this.$sel) {
        this.$sel.data('select2').on('keypress', function(ev) {
          var self = this;

          // keycode 9 is for TAB key
          if (ev.which === 9 && self.isOpen()) {
            ev.preventDefault();
            self.trigger('results:select', {});
          }
        });
      }

      this.updateInvalid();

      return this;
    },
    getValueFromDOM: function() {
      var val = Backform.SelectControl.prototype.getValueFromDOM.apply(
          this, arguments
        ),
        select2Opts = _.extend({}, this.field.get('select2') || this.defaults.select2);

      if (select2Opts.multiple && val == null) {
        return [];
      }
      return val;
    },
  });

  Backform.FieldsetControl = Backform.Fieldset.extend({
    initialize: function(opts) {
      Backform.Control.prototype.initialize.apply(
        this, arguments
      );
      Backform.Dialog.prototype.initialize.apply(
        this, [{
          schema: opts.field.get('schema'),
        }]
      );
      this.dialog = opts.dialog;
      this.tabIndex = opts.tabIndex;

      // Listen to the dependent fields in the model for any change
      var deps = this.field.get('deps');
      var self = this;

      if (deps && _.isArray(deps)) {
        _.each(deps, function(d) {
          var attrArr = d.split('.'),
            name = attrArr.shift();
          self.listenTo(self.model, 'change:' + name, self.render);
        });
      }
    },
    // Render using Backform.Fieldset (only if this control is visible)
    orig_render: Backform.Fieldset.prototype.render,
    render: function() {
      var field = _.defaults(this.field.toJSON(), this.defaults),
        evalF = function(f, d, m) {
          return (_.isFunction(f) ? !!f.apply(d, [m]) : !!f);
        };

      if (!field.version_compatible ||
        !evalF(field.visible, field, this.model)) {
        this.cleanup();
        this.$el.empty();
      } else {
        this.orig_render.apply(this, arguments);
      }
      return this;
    },
    formatter: function() {},
    cleanup: function() {
      Backform.Fieldset.prototype.cleanup.apply(this);
    },
    remove: function() {
      Backform.Control.prototype.remove.apply(this, arguments);
      Backform.Dialog.prototype.remove.apply(this, arguments);
    },
    className: function() {
      return 'set-group';
    },
    tabPanelClassName: function() {
      return Backform.tabClassName;
    },
    fieldsetClass: 'inline-fieldset',
    legendClass: '',
    contentClass: '',
    collapse: false,
  });

  // Backform Tab Control (in bootstrap tabbular)
  // A collection of field models.
  Backform.TabControl = Backform.FieldsetControl.extend({
    tagName: 'div',
    className: 'inline-tab-panel',
    tabPanelClassName: 'inline-tab-panel',
    initialize: function(opts) {
      Backform.FieldsetControl.prototype.initialize.apply(
        this, arguments
      );
      this.tabIndex = (opts.tabIndex || parseInt(Math.random() * 1000)) + 1;
    },
    // Render using Backform.Dialog (tabular UI) (only if this control is
    // visible).
    orig_render: Backform.Dialog.prototype.render,
    template: Backform.Dialog.prototype.template,
  });

  // Backform Tab Control (in bootstrap tabbular)
  // A collection of field models.
  Backform.PlainFieldsetControl = Backform.FieldsetControl.extend({
    initialize: function() {
      Backform.FieldsetControl.prototype.initialize.apply(this, arguments);
    },
    template: {
      'header': _.template([
        '<fieldset class="<%=fieldsetClass%>" <%=disabled ? "disabled" : ""%>>',
        ' <% if (legend != false) { %>',
        '  <legend class="<%=legendClass%>" <%=collapse ? "data-toggle=\'collapse\'" : ""%> data-target="#<%=cId%>"><%=collapse ? "<span class=\'caret\'></span>" : "" %></legend>',
        ' <% } %>',
        '</fieldset>',
      ].join('\n')),
      'content': _.template(
        '  <div id="<%= cId %>" class="<%=contentClass%>"></div>'
      ),
    },
    fieldsetClass: 'inline-fieldset-without-border',
    legend: false,
  });

  /*
   * Control For Code Mirror SQL text area.
   */
  Backform.SqlFieldControl = Backform.TextareaControl.extend({

    defaults: {
      label: '',
      extraClasses: [], // Add default control height
      helpMessage: null,
      maxlength: 4096,
      rows: undefined,
    },

    // Customize template to add new styles
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>"><%=label%></label>',
      '<div class="<%=Backform.controlsClassName%> sql_field_layout <%=extraClasses.join(\' \')%>">',
      '  <textarea ',
      '    class="<%=Backform.controlClassName%> " name="<%=name%>"',
      '    maxlength="<%=maxlength%>" placeholder="<%-placeholder%>" <%=disabled ? "disabled" : ""%>',
      '    rows=<%=rows%>',
      '    <%=required ? "required" : ""%>><%-value%></textarea>',
      '  <% if (helpMessage && helpMessage.length) { %>',
      '    <span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
      '  <% } %>',
      '</div>',
    ].join('\n')),

    /*
     * Initialize the SQL Field control properly
     */
    initialize: function() {
      Backform.TextareaControl.prototype.initialize.apply(this, arguments);
      this.sqlCtrl = null;

      _.bindAll(this, 'onFocus', 'onBlur', 'refreshTextArea');
    },

    getValueFromDOM: function() {
      return this.sqlCtrl.getValue();
    },

    reflectPreferences: function() {
      var self = this;
      /* self.sqlCtrl is null when Definition tab is not active */
      if(self.sqlCtrl) {

        /* This control is used by filter dialog in query editor, so taking preferences from window
         * SQL Editor can be in different tab
         */
        let browser = window.opener ?
              window.opener.pgAdmin.Browser : window.top.pgAdmin.Browser;

        let sqlEditPreferences = browser.get_preferences_for_module('sqleditor');

        $(self.sqlCtrl.getWrapperElement()).css(
          'font-size',SqlEditorUtils.calcFontSize(sqlEditPreferences.sql_font_size)
        );
        self.sqlCtrl.setOption('indentWithTabs', !sqlEditPreferences.use_spaces);
        self.sqlCtrl.setOption('indentUnit', sqlEditPreferences.tab_size);
        self.sqlCtrl.setOption('tabSize', sqlEditPreferences.tab_size);
        self.sqlCtrl.setOption('lineWrapping', sqlEditPreferences.wrap_code);
        self.sqlCtrl.setOption('autoCloseBrackets', sqlEditPreferences.insert_pair_brackets);
        self.sqlCtrl.setOption('matchBrackets', sqlEditPreferences.brace_matching);
        self.sqlCtrl.refresh();
      }
    },

    render: function() {
      // Clean up the existing sql control
      if (this.sqlCtrl) {
        this.model.off('pg-property-tab-changed', this.refreshTextArea, this);
        this.sqlCtrl.off('focus', this.onFocus);
        this.sqlCtrl.off('blur', this.onBlur);

        this.sqlCtrl.toTextArea();
        delete this.sqlCtrl;
        this.sqlCtrl = null;
        this.$el.empty();
      }

      // Use the Backform TextareaControl's render function
      Backform.TextareaControl.prototype.render.apply(this, arguments);

      var field = _.defaults(this.field.toJSON(), this.defaults),
        attributes = this.model.toJSON(),
        attrArr = field.name.split('.'),
        name = attrArr.shift(),
        path = attrArr.join('.'),
        rawValue = this.keyPathAccessor(attributes[name], path),
        data = _.extend(field, {
          rawValue: rawValue,
          value: this.formatter.fromRaw(rawValue, this.model),
          attributes: attributes,
          formatter: this.formatter,
        }),
        evalF = function(f, d, m) {
          return (_.isFunction(f) ? !!f.apply(d, [m]) : !!f);
        };

      // Evaluate the disabled, visible option
      var isDisabled = evalF(data.disabled, data, this.model),
        isVisible = evalF(data.visible, data, this.model),
        self = this;

      self.sqlCtrl = CodeMirror.fromTextArea(
        (self.$el.find('textarea')[0]), {
          lineNumbers: true,
          mode: 'text/x-pgsql',
          extraKeys: pgAdmin.Browser.editor_shortcut_keys,
        });

      self.reflectPreferences();
      /* Check for sql editor preference changes */
      pgBrowser.onPreferencesChange('sqleditor', function() {
        self.reflectPreferences();
      });

      // Disable editor
      if (isDisabled) {
        // set read only mode to true instead of 'nocursor', and hide cursor using a class so that copying is enabled
        self.sqlCtrl.setOption('readOnly', true);
        var cm = self.sqlCtrl.getWrapperElement();
        if (cm) {
          cm.className += ' cm_disabled hide-cursor-workaround';
        }
      }

      if (!isVisible)
        self.$el.addClass(Backform.hiddenClassName);

      // There is an issue with the Code Mirror SQL.
      //
      // It does not initialize the code mirror object completely when the
      // referenced textarea is hidden (not visible), hence - we need to
      // refresh the code mirror object on 'pg-property-tab-changed' event to
      // make it work properly.
      self.model.on('pg-property-tab-changed', this.refreshTextArea, this);

      this.sqlCtrl.on('focus', this.onFocus);
      this.sqlCtrl.on('blur', this.onBlur);

      // Refresh SQL Field to refresh the control lazily after it renders
      setTimeout(function() {
        self.refreshTextArea.apply(self);
      }, 0);

      return self;
    },

    onFocus: function() {
      var $ctrl = this.$el.find('.pgadmin-controls').first();
      if (!$ctrl.hasClass('focused'))
        $ctrl.addClass('focused');
    },

    onBlur: function() {
      this.$el.find('.pgadmin-controls').first().removeClass('focused');
    },

    refreshTextArea: function() {
      if (this.sqlCtrl) {
        this.sqlCtrl.refresh();
      }
    },

    remove: function() {
      // Clean up the sql control
      if (this.sqlCtrl) {
        this.sqlCtrl.off('focus', this.onFocus);
        this.sqlCtrl.off('blur', this.onBlur);
        delete this.sqlCtrl;
        this.sqlCtrl = null;
        this.$el.empty();
      }

      this.model.off('pg-property-tab-changed', this.refreshTextArea, this);

      Backform.TextareaControl.prototype.remove.apply(this, arguments);
    },
  });

  // We will use this control just as a annotate in Backform
  Backform.NoteControl = Backform.Control.extend({
    defaults: {
      label: gettext('Note'),
      text: '',
      extraClasses: [],
      noteClass: 'backform_control_notes',
    },
    template: _.template([
      '<div class="<%=noteClass%> pg-el-xs-12 <%=extraClasses.join(\' \')%>">',
      '<label class="control-label"><%=label%>:</label>',
      '<span><%=text%></span></div>',
    ].join('\n')),
  });

  /*
   * Input File Control: This control is used with Storage Manager Dialog,
   * It allows user to perform following operations:
   * - Select File
   * - Select Folder
   * - Create File
   * - Opening Storage Manager Dialog itself.
   */
  Backform.FileControl = Backform.InputControl.extend({
    defaults: {
      type: 'text',
      label: '',
      min: undefined,
      max: undefined,
      maxlength: 255,
      extraClasses: [],
      dialog_title: '',
      btn_primary: '',
      helpMessage: null,
      dialog_type: 'select_file',
    },
    initialize: function() {
      Backform.InputControl.prototype.initialize.apply(this, arguments);
    },
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>"><%=label%></label>',
      '<div class="<%=Backform.controlsClassName%>">',
      '<div class="file_selection_ctrl form-control">',
      '<input type="<%=type%>" class="browse_file_input form-control <%=extraClasses.join(\' \')%>" name="<%=name%>" min="<%=min%>" max="<%=max%>"maxlength="<%=maxlength%>" value="<%-value%>" placeholder="<%-placeholder%>" <%=disabled ? "disabled" : ""%> <%=required ? "required" : ""%> />',
      '<button class="btn fa fa-ellipsis-h select_item pull-right" <%=disabled ? "disabled" : ""%> ></button>',
      '<% if (helpMessage && helpMessage.length) { %>',
      '<span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
      '<% } %>',
      '</div>',
      '</div>',
    ].join('\n')),
    events: function() {
      // Inherit all default events of InputControl
      return _.extend({}, Backform.InputControl.prototype.events, {
        'click .select_item': 'onSelect',
      });
    },
    onSelect: function() {
      var dialog_type = this.field.get('dialog_type'),
        supp_types = this.field.get('supp_types'),
        btn_primary = this.field.get('btn_primary'),
        dialog_title = this.field.get('dialog_title'),
        params = {
          supported_types: supp_types,
          dialog_type: dialog_type,
          dialog_title: dialog_title,
          btn_primary: btn_primary,
        };

      pgAdmin.FileManager.init();
      pgAdmin.FileManager.show_dialog(params);
      // Listen click events of Storage Manager dialog buttons
      this.listen_file_dlg_events();
    },
    storage_dlg_hander: function(value) {
      var attrArr = this.field.get('name').split('.'),
        name = attrArr.shift();

      this.remove_file_dlg_event_listeners();

      // Set selected value into the model
      this.model.set(name, decodeURI(value));
    },
    storage_close_dlg_hander: function() {
      this.remove_file_dlg_event_listeners();
    },
    listen_file_dlg_events: function() {
      pgAdmin.Browser.Events.on('pgadmin-storage:finish_btn:' + this.field.get('dialog_type'), this.storage_dlg_hander, this);
      pgAdmin.Browser.Events.on('pgadmin-storage:cancel_btn:' + this.field.get('dialog_type'), this.storage_close_dlg_hander, this);
    },
    remove_file_dlg_event_listeners: function() {
      pgAdmin.Browser.Events.off('pgadmin-storage:finish_btn:' + this.field.get('dialog_type'), this.storage_dlg_hander, this);
      pgAdmin.Browser.Events.off('pgadmin-storage:cancel_btn:' + this.field.get('dialog_type'), this.storage_close_dlg_hander, this);
    },
    clearInvalid: function() {
      Backform.InputControl.prototype.clearInvalid.apply(this, arguments);
      this.$el.removeClass('pgadmin-file-has-error');
      return this;
    },
    updateInvalid: function() {
      Backform.InputControl.prototype.updateInvalid.apply(this, arguments);
      // Introduce a new class to fix the error icon placement on the control
      this.$el.addClass('pgadmin-file-has-error');
    },
    disable_button: function() {
      this.$el.find('button.select_item').attr('disabled', 'disabled');
    },
    enable_button: function() {
      this.$el.find('button.select_item').removeAttr('disabled');
    },
  });

  Backform.DatetimepickerControl =
    Backform.InputControl.extend({
      defaults: {
        type: 'text',
        label: '',
        options: {
          format: 'YYYY-MM-DD HH:mm:ss Z',
          showClear: true,
          showTodayButton: true,
          toolbarPlacement: 'top',
          widgetPositioning: {
            horizontal: 'auto',
            vertical: 'bottom',
          },
        },
        placeholder: 'YYYY-MM-DD HH:mm:ss Z',
        extraClasses: [],
        helpMessage: null,
      },
      events: {
        'blur input': 'onChange',
        'change input': 'onChange',
        'changeDate input': 'onChange',
        'focus input': 'clearInvalid',
        'db.change': 'onChange',
        'click': 'openPicker',
      },
      openPicker: function() {
        if (this.has_datepicker) {
          this.$el.find('input').datetimepicker('show');
        }
      },
      template: _.template([
        '<label class="<%=Backform.controlLabelClassName%>"><%=label%></label>',
        '<div class="input-group  <%=Backform.controlsClassName%>">',
        ' <input type="text" class="<%=Backform.controlClassName%> <%=extraClasses.join(\' \')%>" name="<%=name%>" value="<%-value%>" placeholder="<%-placeholder%>" <%=disabled ? "disabled" : ""%> <%=required ? "required" : ""%> />',
        ' <span class="input-group-addon">',
        '  <span class="fa fa-calendar"></span>',
        ' </span>',
        '</div>',
        '<% if (helpMessage && helpMessage.length) { %>',
        ' <div class="<%=Backform.controlsClassName%>">',
        '   <span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
        ' </div>',
        '<% } %>',
      ].join('\n')),
      render: function() {
        var field = _.defaults(this.field.toJSON(), this.defaults),
          attributes = this.model.toJSON(),
          attrArr = field.name.split('.'),
          name = attrArr.shift(),
          path = attrArr.join('.'),
          rawValue = this.keyPathAccessor(attributes[name], path),
          data = _.extend(field, {
            rawValue: rawValue,
            value: this.formatter.fromRaw(rawValue, this.model),
            attributes: attributes,
            formatter: this.formatter,
          }),
          evalF = function(f, m) {
            return (_.isFunction(f) ? !!f(m) : !!f);
          };

        // Evaluate the disabled, visible, and required option
        _.extend(data, {
          disabled: evalF(data.disabled, this.model),
          visible: evalF(data.visible, this.model),
          required: evalF(data.required, this.model),
        });
        if (!data.disabled) {
          data.placeholder = data.placeholder || this.defaults.placeholder;
        }

        // Clean up first
        if (this.has_datepicker)
          this.$el.find('input').datetimepicker('destroy');
        this.$el.empty();
        this.$el.removeClass(Backform.hiddenClassName);


        this.$el.html(this.template(data)).addClass(field.name);

        if (!data.visible) {
          this.has_datepicker = false;
          this.$el.addClass(Backform.hiddenClassName);
        } else {
          this.has_datepicker = true;
          var self = this;
          this.$el.find('input').first().datetimepicker(
            _.extend({
              keyBinds: {
                enter: function(widget) {
                  var picker = this;
                  if (widget) {
                    setTimeout(function() {
                      picker.toggle();
                      self.$el.find('input').first().trigger('blur');
                    }, 10);
                  } else {
                    setTimeout(function() {
                      picker.toggle();
                    }, 10);
                  }
                },
                tab: function(widget) {
                  if (!widget) {
                    // blur the input
                    setTimeout(
                      function() {
                        self.$el.find('input').first().trigger('blur');
                      }, 10
                    );
                  }
                },
                escape: function(widget) {
                  if (widget) {
                    var picker = this;
                    setTimeout(function() {
                      picker.toggle();
                      self.$el.find('input').first().trigger('blur');
                    }, 10);
                  }
                },
              },
            }, this.defaults.options, this.field.get('options'), {
              'date': data.value,
              'minDate': data.value,
            })
          );
        }
        this.updateInvalid();

        return this;
      },
      clearInvalid: function() {
        Backform.InputControl.prototype.clearInvalid.apply(this, arguments);
        this.$el.removeClass('pgadmin-datepicker-has-error');
        return this;
      },
      updateInvalid: function() {
        Backform.InputControl.prototype.updateInvalid.apply(this, arguments);
        // Introduce a new class to fix the error icon placement on the control
        this.$el.addClass('pgadmin-datepicker-has-error');
      },
      cleanup: function() {
        if (this.has_datepicker)
          this.$el.find('input').datetimepicker('destroy');
        this.$el.empty();
      },
    });

  // Color Picker control
  Backform.ColorControl = Backform.InputControl.extend({
    defaults: {
      label: '',
      extraClasses: [],
      helpMessage: null,
      showButtons: false,
      showPalette: true,
      allowEmpty: true,
      colorFormat: 'hex',
      defaultColor: '',
    },
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>"><%=label%></label>',
      '<div class="<%=Backform.controlsClassName%>">',
      '  <input class="<%=Backform.controlClassName%> <%=extraClasses.join(\' \')%>" name="<%=name%>" value="<%-value%>" <%=disabled ? "disabled" : ""%> <%=required ? "required" : ""%> />',
      '  <% if (helpMessage && helpMessage.length) { %>',
      '    <span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
      '  <% } %>',
      '</div>',
    ].join('\n')),
    render: function() {
      // Clear first
      if (this.$picker && this.$picker.hasOwnProperty('destroy')) {
        this.$picker('destroy');
      }

      var field = _.defaults(this.field.toJSON(), this.defaults),
        attributes = this.model.toJSON(),
        attrArr = field.name.split('.'),
        name = attrArr.shift(),
        path = attrArr.join('.'),
        rawValue = this.keyPathAccessor(attributes[name], path),
        data = _.extend(field, {
          rawValue: rawValue,
          value: this.formatter.fromRaw(rawValue, this.model),
          attributes: attributes,
          formatter: this.formatter,
        }),
        evalF = function(f, d, m) {
          return (_.isFunction(f) ? !!f.apply(d, [m]) : !!f);
        };

      // Evaluate the disabled, visible, and required option
      _.extend(data, {
        disabled: evalF(data.disabled, data, this.model),
        visible: evalF(data.visible, data, this.model),
        required: evalF(data.required, data, this.model),
      });

      // Clean up first
      this.$el.empty();

      if (!data.visible)
        this.$el.addClass(Backform.hiddenClassname);

      this.$el.html(this.template(data)).addClass(field.name);

      // Creating default Color picker
      this.$picker = this.$el.find('input').spectrum({
        allowEmpty: data.allowEmpty,
        preferredFormat: data.colorFormat,
        disabled: data.disabled,
        hideAfterPaletteSelect: true,
        clickoutFiresChange: true,
        showButtons: data.showButtons,
        showPaletteOnly: data.showPalette,
        togglePaletteOnly: data.showPalette,
        togglePaletteMoreText: gettext('More'),
        togglePaletteLessText: gettext('Less'),
        color: data.value || data.defaultColor,
        // Predefined palette colors
        palette: [
          ['#000', '#444', '#666', '#999', '#ccc', '#eee', '#f3f3f3', '#fff'],
          ['#f00', '#f90', '#ff0', '#0f0', '#0ff', '#00f', '#90f', '#f0f'],
          ['#f4cccc', '#fce5cd', '#fff2cc', '#d9ead3', '#d0e0e3', '#cfe2f3', '#d9d2e9', '#ead1dc'],
          ['#ea9999', '#f9cb9c', '#ffe599', '#b6d7a8', '#a2c4c9', '#9fc5e8', '#b4a7d6', '#d5a6bd'],
          ['#e06666', '#f6b26b', '#ffd966', '#93c47d', '#76a5af', '#6fa8dc', '#8e7cc3', '#c27ba0'],
          ['#c00', '#e69138', '#f1c232', '#6aa84f', '#45818e', '#3d85c6', '#674ea7', '#a64d79'],
          ['#900', '#b45f06', '#bf9000', '#38761d', '#134f5c', '#0b5394', '#351c75', '#741b47'],
          ['#600', '#783f04', '#7f6000', '#274e13', '#0c343d', '#073763', '#20124d', '#4c1130'],
        ],

      });
      this.updateInvalid();
      return this;
    },
  });

  var KeyCodeControlFormatter = Backform.KeyCodeControlFormatter = function() {};

  _.extend(KeyCodeControlFormatter.prototype, {
    fromRaw: function (rawData) {
      return rawData['char'];
    },
    // we don't need toRaw
    toRaw: undefined,
  });

  Backform.KeyCodeControl = Backform.InputControl.extend({
    defaults: _.defaults({
      escapeKeyCodes: [16, 17, 18, 27], // Shift, Ctrl, Alt/Option, Escape
    }, Backform.InputControl.prototype.defaults),

    events: {
      'keydown input': 'onkeyDown',
      'keyup input': 'preventEvent',
      'focus select': 'clearInvalid',
    },

    formatter: KeyCodeControlFormatter,

    preventEvent: function(e) {
      var key_code = e.which || e.keyCode,
        field = _.defaults(this.field.toJSON(), this.defaults);

      if (field.escapeKeyCodes.indexOf(key_code) != -1) {
        return;
      }

      e.preventDefault();
      e.stopImmediatePropagation();
      e.stopPropagation();
    },

    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%> keyboard-shortcut-label"><%=label%></label>',
      '<div class="<%=Backform.controlsClassName%>">',
      '  <input type="<%=type%>" class="<%=Backform.controlClassName%> <%=extraClasses.join(\' \')%>" name="<%=name%>" oncopy="return false; oncut="return false; onpaste="return false;" maxlength="<%=maxlength%>" value="<%-value%>" placeholder="<%-placeholder%>" <%=disabled ? "disabled" : ""%> <%=required ? "required" : ""%> />',
      '  <% if (helpMessage && helpMessage.length) { %>',
      '    <span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
      '  <% } %>',
      '</div>',
    ].join('\n')),
    onkeyDown: function(e) {
      var self = this,
        model = this.model,
        attrArr = this.field.get('name').split('.'),
        name = attrArr.shift(),
        changes = {},
        key_code = e.which || e.keyCode,
        key,
        field = _.defaults(this.field.toJSON(), this.defaults);

      if (field.escapeKeyCodes.indexOf(key_code) != -1) {
        return;
      }

      if (this.model.errorModel instanceof Backbone.Model) {
        this.model.errorModel.unset(name);
      }
      key = gettext(e.key);
      if (key_code == 32) {
        key = gettext('Space');
      }
      changes = {
        'key_code': e.which || e.keyCode,
        'char': key,
      };

      this.stopListening(this.model, 'change:' + name, this.render);
      model.set(name, changes);
      this.listenTo(this.model, 'change:' + name, this.render);
      setTimeout(function() {
        self.$el.find('input').val(key);
      });
      e.preventDefault();
    },
    keyPathAccessor: function(obj, path) {
      var res = obj;
      path = path.split('.');
      for (var i = 0; i < path.length; i++) {
        if (_.isNull(res)) return null;
        if (_.isEmpty(path[i])) continue;
        if (!_.isUndefined(res[path[i]])) res = res[path[i]];
      }
      return res;
    },
  });

  Backform.KeyboardShortcutControl = Backform.Control.extend({

    initialize: function() {

      Backform.Control.prototype.initialize.apply(this, arguments);

      var fields = this.field.get('fields');

      if (fields == null || fields == undefined) {
        throw new ReferenceError('"fields" not found in keyboard shortcut');
      }

      this.innerModel = new Backbone.Model();

      this.controls = [];
    },
    cleanup: function() {

      this.stopListening(this.innerModel, 'change', this.onInnerModelChange);

      _.each(this.controls, function(c) {
        c.remove();
      });

      this.controls.length = 0;
    },
    template: _.template([
      '<label class="<%=Backform.controlLabelClassName%>"><%=label%></label>',
      '<div class="<%=Backform.controlsClassName%>">',
      '</div>',
    ].join('\n')),

    onInnerModelChange: function() {

      var name = this.field.get('name'),
        val = $.extend(true, {}, this.model.get(name));

      this.stopListening(this.model, 'change:' + name, this.render);

      this.model.set(name,
        $.extend(true, val, this.innerModel.toJSON())
      );

      this.listenTo(this.model, 'change:' + name, this.render);
    },

    render: function() {
      this.cleanup();
      this.$el.empty();

      var self = this,
        initial_value = {},
        field = _.defaults(this.field.toJSON(), this.defaults),
        value = self.model.get(field['name']),
        innerFields = field['fields'];

      this.$el.html(self.template(field)).addClass(field.name);

      var $container = $(self.$el.find('.pgadmin-controls'));

      _.each(innerFields, function(field) {
        initial_value[field['name']] = value[field['name']];
      });

      self.innerModel.set(initial_value);

      self.listenTo(self.innerModel, 'change', self.onInnerModelChange);

      _.each(innerFields, function(fld) {

        var f = new Backform.Field(
          _.extend({}, {
            id: fld['name'],
            name: fld['name'],
            control: fld['type'],
            label: fld['label'],
          })
          ),
          cntr = new (f.get('control')) ({
            field: f,
            model: self.innerModel,
          });

        cntr.render();

        if(fld['type'] == 'checkbox') {
          // Remove control label for keyboard shortcuts to
          // align it properly.
          let label = cntr.$el.find('label.control-label').text().trim();
          if (label.length <= 0) {
            cntr.$el.find('label.control-label').remove();
          }

          if (fld['name'] == 'alt_option') {
            $container.append($('<div class="pg-el-sm-3 pg-el-xs-12"></div>').append(cntr.$el));
          } else {
            $container.append($('<div class="pg-el-sm-2 pg-el-xs-12"></div>').append(cntr.$el));
          }
        } else {
          $container.append($('<div class="pg-el-sm-5 pg-el-xs-12"></div>').append(cntr.$el));
        }

        // We will keep track of all the controls rendered at the
        // moment.
        self.controls.push(cntr);

      });

      return self;
    },
    remove: function() {
      /* First do the clean up */
      this.cleanup();
      Backform.Control.prototype.remove.apply(this, arguments);
    },
  });

  return Backform;
});
