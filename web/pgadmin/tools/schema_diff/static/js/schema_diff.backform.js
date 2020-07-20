/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import $ from 'jquery';
import Backbone from 'backbone';
import Backform from 'pgadmin.backform';
import gettext from 'sources/gettext';
import clipboard from 'sources/selection/clipboard';

var formatNode = function (opt) {
  if (!opt.id) {
    return opt.text;
  }

  var optimage = $(opt.element).data('image');

  if (!optimage) {
    return opt.text;
  } else {
    return $('<span></span>').append(
      $('<span></span>', {
        class: 'wcTabIcon ' + optimage,
      })
    ).append($('<span></span>').text(opt.text));
  }
};

let SchemaDiffSqlControl =
  Backform.SqlFieldControl.extend({
    defaults: {
      label: '',
      extraClasses: [], // Add default control height
      helpMessage: null,
      maxlength: 4096,
      rows: undefined,
      copyRequired: false,
    },

    template: _.template([
      '<% if (copyRequired) { %><button class="btn btn-secondary ddl-copy d-none">' + gettext('Copy') + '</button> <% } %>',
      '<div class="pgadmin-controls pg-el-9 pg-el-12 sql_field_layout <%=extraClasses.join(\' \')%>">',
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
    initialize: function() {
      Backform.TextareaControl.prototype.initialize.apply(this, arguments);
      this.sqlCtrl = null;

      _.bindAll(this, 'onFocus', 'onBlur', 'refreshTextArea', 'copyData',);
    },
    render: function() {
      let obj = Backform.SqlFieldControl.prototype.render.apply(this, arguments);

      obj.sqlCtrl.setOption('readOnly', true);
      if(this.$el.find('.ddl-copy')) this.$el.find('.ddl-copy').on('click', this.copyData);
      return obj;
    },
    copyData() {
      event.stopPropagation();
      clipboard.copyTextToClipboard(this.model.get('diff_ddl'));
      this.$el.find('.ddl-copy').text(gettext('Copied!'));
      var self = this;
      setTimeout(function() {
        let $copy = self.$el.find('.ddl-copy');
        if (!$copy.hasClass('d-none')) $copy.addClass('d-none');
        $copy.text(gettext('Copy'));
      }, 3000);
      return false;
    },
    onFocus: function() {
      let $ctrl = this.$el.find('.pgadmin-controls').first(),
        $copy = this.$el.find('.ddl-copy');
      if (!$ctrl.hasClass('focused')) $ctrl.addClass('focused');
      if ($copy.hasClass('d-none')) $copy.removeClass('d-none');

    },
  });

let SchemaDiffSelect2Control =
  Backform.Select2Control.extend({
    defaults: _.extend(Backform.Select2Control.prototype.defaults, {
      url: undefined,
      transform: undefined,
      url_with_id: false,
      select2: {
        allowClear: true,
        placeholder: gettext('Select an item...'),
        width: 'style',
        templateResult: formatNode,
        templateSelection: formatNode,
      },
      controlsClassName: 'pgadmin-controls pg-el-sm-11 pg-el-12',
    }),
    className: function() {
      return 'pgadmin-controls pg-el-sm-4';
    },
    events: {
      'focus select': 'clearInvalid',
      'keydown :input': 'processTab',
      'select2:select': 'onSelect',
      'select2:selecting': 'beforeSelect',
      'select2:clear': 'onChange',
    },
    template: _.template([
      '<% if(label == false) {} else {%>',
      '  <label class="<%=Backform.controlLabelClassName%>"><%=label%></label>',
      '<% }%>',
      '<div class="<%=controlsClassName%>">',
      ' <select class="<%=Backform.controlClassName%> <%=extraClasses.join(\' \')%>"',
      '  name="<%=name%>" value="<%-value%>" <%=disabled ? "disabled" : ""%>',
      '  <%=required ? "required" : ""%><%= select2.multiple ? " multiple>" : ">" %>',
      '  <%=select2.first_empty ? " <option></option>" : ""%>',
      '  <% for (var i=0; i < options.length; i++) {%>',
      '   <% if (options[i].group) { %>',
      '     <% var group = options[i].group; %>',
      '     <% if (options[i].optval) { %> <% var option_length = options[i].optval.length; %>',
      '      <optgroup label="<%=group%>">',
      '      <% for (var subindex=0; subindex < option_length; subindex++) {%>',
      '        <% var option = options[i].optval[subindex]; %>',
      '        <option ',
      '        <% if (option.image) { %> data-image=<%=option.image%> <%}%>',
      '        <% if (option.connected) { %> data-connected=connected <%}%>',
      '        value=<%- formatter.fromRaw(option.value) %>',
      '        <% if (option.selected) {%>selected="selected"<%} else {%>',
      '        <% if (!select2.multiple && option.value === rawValue) {%>selected="selected"<%}%>',
      '        <% if (select2.multiple && rawValue && rawValue.indexOf(option.value) != -1){%>selected="selected" data-index="rawValue.indexOf(option.value)"<%}%>',
      '        <%}%>',
      '        <%= disabled ? "disabled" : ""%>><%-option.label%></option>',
      '      <%}%>',
      '      </optgroup>',
      '     <%}%>',
      '   <%} else {%>',
      '     <% var option = options[i]; %>',
      '     <option ',
      '     <% if (option.image) { %> data-image=<%=option.image%> <%}%>',
      '     <% if (option.connected) { %> data-connected=connected <%}%>',
      '     value=<%- formatter.fromRaw(option.value) %>',
      '     <% if (option.selected) {%>selected="selected"<%} else {%>',
      '     <% if (!select2.multiple && option.value === rawValue) {%>selected="selected"<%}%>',
      '     <% if (select2.multiple && rawValue && rawValue.indexOf(option.value) != -1){%>selected="selected" data-index="rawValue.indexOf(option.value)"<%}%>',
      '     <%}%>',
      '     <%= disabled ? "disabled" : ""%>><%-option.label%></option>',
      '   <%}%>',
      '  <%}%>',
      ' </select>',
      ' <% if (helpMessage && helpMessage.length) { %>',
      ' <span class="<%=Backform.helpMessageClassName%>"><%=helpMessage%></span>',
      ' <% } %>',
      '</div>',
    ].join('\n')),
    beforeSelect: function() {
      var selVal = arguments[0].params.args.data.id;

      if(this.field.get('connect') && this.$el.find('option[value="'+selVal+'"]').attr('data-connected') !== 'connected') {
        this.field.get('connect').apply(this, [selVal, this.changeIcon.bind(this)]);
      } else {
        $(this.$sel).trigger('change');
        setTimeout(function(){ this.onChange.apply(this); }.bind(this), 200);
      }
    },
    changeIcon: function(data) {
      let span = this.$el.find('.select2-selection .select2-selection__rendered span.wcTabIcon'),
        selSpan = this.$el.find('option:selected');

      if (span.hasClass('icon-server-not-connected')) {
        let icon = (data.icon) ? data.icon : 'icon-pg';
        span.removeClass('icon-server-not-connected');
        span.addClass(icon);
        span.attr('data-connected', 'connected');

        selSpan.data().image = icon;
        selSpan.attr('data-connected', 'connected');

        this.onChange.apply(this);
      }
      else if (span.hasClass('icon-database-not-connected')) {
        let icon = (data.icon) ? data.icon : 'pg-icon-database';

        span.removeClass('icon-database-not-connected');
        span.addClass(icon);
        span.attr('data-connected', 'connected');

        selSpan.removeClass('icon-database-not-connected');
        selSpan.data().image = icon;
        selSpan.attr('data-connected', 'connected');

        this.onChange.apply(this);
      }
    },
    onChange: function() {
      var model = this.model,
        attrArr = this.field.get('name').split('.'),
        name = attrArr.shift(),
        path = attrArr.join('.'),
        value = this.getValueFromDOM(),
        changes = {},
        that = this;

      if (this.model.errorModel instanceof Backbone.Model) {
        if (_.isEmpty(path)) {
          this.model.errorModel.unset(name);
        } else {
          var nestedError = this.model.errorModel.get(name);
          if (nestedError) {
            this.keyPathSetter(nestedError, path, null);
            this.model.errorModel.set(name, nestedError);
          }
        }
      }

      changes[name] = _.isEmpty(path) ? value : _.clone(model.get(name)) || {};

      if (!_.isEmpty(path)) that.keyPathSetter(changes[name], path, value);
      that.stopListening(that.model, 'change:' + name, that.render);
      model.set(changes);
      that.listenTo(that.model, 'change:' + name, that.render);

    },
    render: function() {
      /*
       * Initialization from the original control.
       */
      this.fetchData();
      return Backform.Select2Control.prototype.render.apply(this, arguments);

    },
    fetchData: function() {
      /*
       * We're about to fetch the options required for this control.
       */
      var self = this,
        url = self.field.get('url'),
        m = self.model;

      url = _.isFunction(url) ? url.apply(m) : url;

      if (url && self.field.get('deps')) {
        url = url.replace('sid', m.get(self.field.get('deps')[0]));
      }

      // Hmm - we found the url option.
      // That means - we needs to fetch the options from that node.
      if (url) {
        var data;

        m.trigger('pgadmin:view:fetching', m, self.field);
        $.ajax({
          async: false,
          url: url,
        })
          .done(function(res) {
          /*
           * We will cache this data for short period of time for avoiding
           * same calls.
           */
            data = res.data;
          })
          .fail(function() {
            m.trigger('pgadmin:view:fetch:error', m, self.field);
          });

        m.trigger('pgadmin:view:fetched', m, self.field);
        // To fetch only options from cache, we do not need time from 'at'
        // attribute but only options.
        //

        /*
         * Transform the data
         */
        var transform = this.field.get('transform') || self.defaults.transform;
        if (transform && _.isFunction(transform)) {
          // We will transform the data later, when rendering.
          // It will allow us to generate different data based on the
          // dependencies.
          self.field.set('options', transform.bind(self, data));
        } else {
          self.field.set('options', data);
        }
      }
    },
  });


let SchemaDiffHeaderView = Backform.Form.extend({
  label: '',
  className: function() {
    return 'pg-el-sm-12 pg-el-md-12 pg-el-lg-12 pg-el-12';
  },
  tabPanelClassName: function() {
    return Backform.tabClassName;
  },
  tabIndex: 0,
  initialize: function(opts) {
    this.label = opts.label;
    Backform.Form.prototype.initialize.apply(this, arguments);
  },
  template: _.template(`
    <div class="row pgadmin-control-group">
      <div class="col-1 control-label">` + gettext('Select Source') + `</div>
      <div class="col-6 source row"></div>
    </div>
    <div class="row pgadmin-control-group">
      <div class="col-1 control-label">` + gettext('Select Target') + `</div>
      <div class="col-6 target row"></div>
      <div class="col-5 target-buttons">
          <div class="action-btns d-flex">
              <button class="btn btn-primary mr-auto"><span class="icon-schema-diff icon-schema-diff-white"></span>&nbsp;` + gettext('Compare') + `</button>
              <button id="generate-script" class="btn btn-primary-icon mr-1" disabled><i class="fa fa-file-code-o sql-icon-lg"></i>&nbsp;` + gettext('Generate Script') + `</button>
              <div class="btn-group mr-1" role="group" aria-label="">
                <button id="btn-filter" type="button" class="btn btn-primary-icon"
                        title=""
                        accesskey=""
                        tabindex="0"
                        style="pointer-events: none;">
                    <i class="fa fa-filter sql-icon-lg" aria-hidden="true"></i>&nbsp;` + gettext('Filter') + `
                </button>
                <button id="btn-filter-dropdown" type="button" class="btn btn-primary-icon dropdown-toggle dropdown-toggle-split"
                        data-toggle="dropdown" aria-haspopup="true" aria-expanded="false"
                        title=""
                        accesskey=""
                        tabindex="0">
                </button>` +
      [
        '<ul class="dropdown-menu filter">',
        '<li>',
        '<a class="dropdown-item" id="btn-identical" href="#" tabindex="0">',
        '<i class="identical fa fa-check visibility-hidden" aria-hidden="true"></i>',
        '<span> ' + gettext('Identical') + ' </span>',
        '</a>',
        '</li>',
        '<li>',
        '<a class="dropdown-item" id="btn-differentt" href="#" tabindex="0">',
        '<i class="different fa fa-check" aria-hidden="true"></i>',
        '<span> ' + gettext('Different') + ' </span>',
        '</a>',
        '</li>',
        '<li>',
        '<a class="dropdown-item" id="btn-source-only" href="#" tabindex="0">',
        '<i class="source-only fa fa-check" aria-hidden="true"></i>',
        '<span> ' + gettext('Source Only') + ' </span>',
        '</a>',
        '</li>',
        '<li>',
        '<a class="dropdown-item" id="btn-target-only" href="#" tabindex="0">',
        '<i class="target-only fa fa-check" aria-hidden="true"></i>',
        '<span> ' + gettext('Target Only') + ' </span>',
        '</a>',
        '</li>',
        '</ul>',
        '</div>',
        '</div>',
        '</div>',
        '</div>',
      ].join('\n')
  ),
  render: function() {
    this.cleanup();

    var controls = this.controls,
      m = this.model,
      self = this,
      idx = (this.tabIndex * 100);

    this.$el.empty();

    $(this.template()).appendTo(this.$el);

    this.fields.each(function(f) {
      var cntr = new(f.get('control'))({
        field: f,
        model: m,
        dialog: self,
        tabIndex: idx,
      });

      if (f.get('group') && f.get('group') == 'source') {
        self.$el.find('.source').append(cntr.render().$el);
      }
      else {
        self.$el.find('.target').append(cntr.render().$el);
      }

      controls.push(cntr);
    });

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

let SchemaDiffFooterView = Backform.Form.extend({
  className: function() {
    return 'set-group pg-el-12';
  },
  tabPanelClassName: function() {
    return Backform.tabClassName;
  },
  legendClass: 'badge',
  contentClass: Backform.accordianContentClassName,
  template: {
    'content': _.template(`
       <div class="pg-el-sm-12 row <%=contentClass%>">
                  <div class="pg-el-sm-4 ddl-source">` + gettext('Source') + `</div>
                  <div class="pg-el-sm-4 ddl-target">` + gettext('Target') + `</div>
                  <div class="pg-el-sm-4 ddl-diff">` + gettext('Difference') + `
                  </div>
              </div>
      </div>
    `),
  },
  initialize: function(opts) {
    this.label = opts.label;
    Backform.Form.prototype.initialize.apply(this, arguments);
  },
  render: function() {
    this.cleanup();

    let m = this.model,
      $el = this.$el,
      tmpl = this.template,
      controls = this.controls,
      data = {
        'className': _.result(this, 'className'),
        'legendClass': _.result(this, 'legendClass'),
        'contentClass': _.result(this, 'contentClass'),
        'collapse': _.result(this, 'collapse'),
      },
      idx = (this.tabIndex * 100);

    this.$el.empty();

    let el = $((tmpl['content'])(data)).appendTo($el);

    this.fields.each(function(f) {
      let cntr = new(f.get('control'))({
        field: f,
        model: m,
        dialog: self,
        tabIndex: idx,
        name: f.get('name'),
      });

      if (f.get('group') && f.get('group') == 'ddl-source') {
        el.find('.ddl-source').append(cntr.render().$el);
      }
      else if (f.get('group') && f.get('group') == 'ddl-target') {
        el.find('.ddl-target').append(cntr.render().$el);
      }
      else {
        el.find('.ddl-diff').append(cntr.render().$el);
      }
      controls.push(cntr);
    });

    let $diff_sc = this.$el.find('.source_ddl'),
      $diff_tr = this.$el.find('.target_ddl'),
      $diff = this.$el.find('.diff_ddl'),
      footer_height = this.$el.parent().height() - 50;
    $diff_sc.height(footer_height);
    $diff_sc.css({
      'height': footer_height + 'px',
    });
    $diff_tr.height(footer_height);
    $diff_tr.css({
      'height': footer_height + 'px',
    });
    $diff.height(footer_height);
    $diff.css({
      'height': footer_height + 'px',
    });


    return this;
  },
});
export {
  SchemaDiffSelect2Control,
  SchemaDiffHeaderView,
  SchemaDiffFooterView,
  SchemaDiffSqlControl,
};
