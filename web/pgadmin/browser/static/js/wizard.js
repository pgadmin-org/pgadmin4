/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define([
  'underscore', 'jquery', 'backbone', 'sources/pgadmin', 'pgadmin.browser',
  'sources/gettext', 'sources/utils',
], function(_, $, Backbone, pgAdmin, pgBrowser, gettext, commonUtils) {

  /* Wizard individual Page Model */
  pgBrowser.WizardPage = Backbone.Model.extend({
    defaults: {
      id: undefined,
      /* Id */
      page_title: undefined,
      /* Page Title */
      view: undefined,
      /* A Backbone View */
      html: undefined,
      /* HTML tags to be rendered */
      image: undefined,
      /* Left hand side image */
      disable_prev: false,
      /*  Previous Button Flag */
      disable_next: false,
      /*  Next Button Flag */
      disable_cancel: false,
      /* Cancel Button Flag */
      show_progress_bar: '',
      /* Callback for OnLoad */
      onLoad: function() {
        return true;
      },
      /* Callback for before Next */
      beforeNext: function() {
        return true;
      },
      onNext: function() {},
      onBefore: function() {},
      /* Callback for before Previous */
      beforePrev: function() {
        return true;
      },
    },
  });

  pgBrowser.Wizard = Backbone.View.extend({
    options: {
      title: 'Wizard',
      /* Main Wizard Title */
      image: 'left_panel.png',
      /* TODO:: We can use default image here */
      curr_page: 0,
      /* Current Page to Load */
      disable_next: false,
      disable_prev: false,
      disable_finish: false,
      disable_cancel: false,
      show_header_cancel_btn: false,
      /* show cancel button at wizard header */
      show_header_maximize_btn: false,
      /* show maximize button at wizard header */
      dialog_api: null,
      height: 400,
      width: 650,
      show_left_panel: true,
      wizard_help: '',
    },
    tmpl: _.template(
      '    <div class="pgadmin-wizard" style="height: <%= this.options.height %>px;' +
      '    width: <%= this.options.width %>px">' +
      '      <div class="wizard-header wizard-badge">' +
      '        <div class="d-flex">' +
      '          <div>' +
      '              <h3><span id="main-title"><%= this.options.title %></span> -' +
      '              <span id="step-title"><%= page_title %></span></h3>' +
      '          </div>' +
      '          <% if (this.options.show_header_cancel_btn) { %>' +
      '            <div class="ml-auto">' +
      '              <button aria-label="' + gettext('Close') +'" tabindex="0" class="ajs-close wizard-cancel-event pull-right"' +
      '                title="' + gettext('Close') + '"></button>' +
      '              <% if (this.options.show_header_maximize_btn) { %>' +
      '                <button aria-label="' + gettext('Maximize') + '" tabindex="0"  class="ajs-maximize wizard-maximize-event mr-1 pull-right"' +
      '                  title="' + gettext('Maximize') + '"></button>' +
      '              <% } %>' +
      '            </div>' +
      '          <% } %>' +
      '        </div>' +
      '      </div>' +
      '      <div class="wizard-content row m-0">' +
      '        <% if (this.options.show_left_panel) { %>' +
      '          <div class="col-sm-3 wizard-left-panel">' +
      '              <img src="<%= this.options.image %>"' +
      '                alt="' + gettext('Left panel logo') + '"></div>' +
      '        <% } %>' +
      '        <div class="col-sm-<% if (this.options.show_left_panel) { %>9<% }' +
      '          else { %>12<% } %> wizard-right-panel">' +
      '          <% if ( typeof show_description !=  "undefined" && show_description != ""){ %>' +
      '            <div class="wizard-description">' +
      '              <%= show_description %>' +
      '            </div>' +
      '          <% } %>' +
      '          <div class="wizard-progress-bar"><% if (show_progress_bar) { %>' +
      '            <p role="status" class="alert alert-info col-sm-12"><%= show_progress_bar %></p><% } %>' +
      '          </div>' +
      '          <div class="wizard-right-panel_content">' +
      '          </div>' +
      '        </div>' +
      '      </div>' +
      '      <div class="wizard-footer pg-prop-footer">' +
      '        <div class="pg-prop-status-bar" style="visibility:hidden">' +
      '          <div class="error-in-footer"> ' +
      '            <div class="d-flex px-2 py-1"> ' +
      '              <div class="pr-2"> ' +
      '                <i class="fa fa-exclamation-triangle text-danger" aria-hidden="true" role="img"></i> ' +
      '              </div> ' +
      '              <div role="alert" class="alert-text"></div> ' +
      '              <div class="ml-auto close-error-bar"> ' +
      '                <a aria-label="' + gettext('Close error bar') + '" class="close-error fa fa-times text-danger"></a> ' +
      '              </div> ' +
      '            </div> ' +
      '          </div> ' +
      '        </div>' +
      '        <div class="wizard-buttons d-flex">' +
      '          <div>' +
      '            <button tabindex="0" aria-label="' + gettext('Help') + '" title = "' + gettext('Help for this dialog.') + '"' +
      '              class="btn btn-primary-icon pull-left wizard-help" <%=this.options.wizard_help ? "" : "disabled" %>>' +
      '              <span class="fa fa-lg fa-question" role="img"></span></button>' +
      '          </div>' +
      '          <div class="ml-auto">' +
      '              <button class="btn btn-secondary wizard-cancel" <%=this.options.disable_cancel ? "disabled" : ""%>>' +
      '                <i class="fa fa-times" role="img"></i>&nbsp;' + gettext('Cancel') + '</button>' +
      '              <button class="btn btn-secondary wizard-back" <%=this.options.disable_prev ? "disabled" : ""%>>' +
      '                <i class="fa fa-backward" role="img"></i>&nbsp;' + gettext('Back') + '</button>' +
      '              <button class="btn btn-secondary wizard-next" <%=this.options.disable_next ? "disabled" : ""%>>' +
      '                ' + gettext('Next') +
      '                &nbsp;<i class="fa fa-forward"></i></button>' +
      '              <button class="btn btn-primary wizard-finish" <%=this.options.disable_finish ? "disabled" : ""%>>' +
      '                <i class="fa fa-check" role="img"></i>&nbsp;' + gettext('Finish') + '</button>' +
      '          </div>' +
      '        </div>' +
      '      </div>' +
      '    </div>'),
    events: {
      'click button.wizard-next': 'nextPage',
      'click button.wizard-back': 'prevPage',
      'click button.wizard-cancel': 'onCancel',
      'click button.wizard-cancel-event': 'onCancel',
      'click button.wizard-maximize-event': 'onMaximize',
      'click button.wizard-finish': 'finishWizard',
      'click button.wizard-help': 'onDialogHelp',
      'click a.close-error': 'closeErrorMsg',
      'keydown': 'keydownHandler',
    },
    initialize: function(options) {
      this.options = _.extend({}, this.options, options.options);
      this.currPage = this.collection.at(this.options.curr_page).toJSON();
    },
    render: function() {
      var self = this,
        data = this.currPage;

      /* Check Status of the buttons */
      this.options.disable_next = (this.options.disable_next ? true : this.evalASFunc(this.currPage.disable_next));
      this.options.disable_prev = (this.options.disable_prev ? true : this.evalASFunc(this.currPage.disable_prev));
      this.options.disable_cancel = (this.currPage.canCancel ? true : this.evalASFunc(this.currPage.disable_cancel));

      /* HTML Content */
      if (data.html) {
        data.content = data.html;
      }
      /* Backbone View */
      else if (data.view) {
        data.content = data.view.render().el;
      }

      $(this.el).html(this.tmpl(data));
      $(this.el).find('.wizard-right-panel_content').html(data.content);

      /* OnLoad Callback */
      this.onLoad();
      setTimeout(function() {
        var container = $(self.el);
        commonUtils.findAndSetFocus(container);
      }, 500);

      return this;
    },
    nextPage: function() {
      if (!this.beforeNext()) {
        return false;
      }

      var page_id = this.onNext();

      if (page_id) {
        this.currPage = this.collection.get(page_id).toJSON();
        this.options.curr_page = this.collection.indexOf(this.collection.get(page_id));
      } else if (this.options.curr_page < (this.collection.length - 1)) {
        this.options.curr_page = this.options.curr_page + 1;
        this.currPage = this.collection.at(this.options.curr_page).toJSON();
      }

      this.enableDisableNext();
      this.enableDisablePrev();

      return this.render();
    },
    prevPage: function() {
      if (!this.beforePrev()) {
        return false;
      }

      var page_id = this.onPrev();

      if (page_id) {
        this.currPage = this.collection.get(page_id).toJSON();
        this.options.curr_page = this.collection.indexOf(this.collection.get(page_id));
      } else if (this.options.curr_page > 0) {
        this.options.curr_page = this.options.curr_page - 1;
        this.currPage = this.collection.at(this.options.curr_page).toJSON();
      }

      this.enableDisableNext();
      this.enableDisablePrev();

      return this.render();
    },
    finishWizard: function() {
      this.onFinish();
      this.remove(); // Remove view from DOM
      this.off(); // Unbind all local event bindings
      delete this.$el; // Delete the jQuery wrapped object variable
      delete this.el; // Delete the variable reference to this node
      return true;
    },
    keydownHandler: function(event) {
      commonUtils.handleKeyNavigation(event);
    },
    enableDisableNext: function(disable) {
      if (typeof(disable) != 'undefined') {
        this.options.disable_next = disable;
      } else if (this.options.curr_page >= (this.collection.length - 1)) {
        this.options.disable_next = true;
      } else {
        this.options.disable_next = false;
      }
    },
    enableDisablePrev: function(disable) {
      if (typeof(disable) != 'undefined') {
        this.options.disable_prev = disable;
      } else if (this.options.curr_page <= 0) {
        this.options.disable_prev = true;
      } else {
        this.options.disable_prev = false;
      }
    },
    closeErrorMsg: function() {
      $(this.el).find('.pg-prop-status-bar .alert-text').empty();
      $(this.el).find('.pg-prop-status-bar').css('visibility', 'hidden');
    },
    beforeNext: function() {
      return this.evalASFunc(this.currPage.beforeNext);
    },
    beforePrev: function() {
      return this.evalASFunc(this.currPage.beforePrev);
    },
    onPrev: function() {
      return this.evalASFunc(this.currPage.onPrev);
    },
    onNext: function() {
      return this.evalASFunc(this.currPage.onNext);
    },
    onLoad: function() {
      return this.evalASFunc(this.currPage.onLoad);
    },
    onFinish: function() {
      return true;
    },
    onCancel: function() {
      this.$el.remove();
      return true;
    },
    onMaximize: function() {
      var dialog_api = this.options.dialog_api,
        _el = this.$el.find('.wizard-maximize-event');

      // If no dialog api found then return
      if (!dialog_api) return;

      if (dialog_api.isMaximized()) {
        // toggle the icon
        _el.removeClass('ajs-maximized');
        dialog_api.restore();
      } else {
        // toggle the icon
        _el.addClass('ajs-maximized ' + _el.attr('class'));
        dialog_api.maximize();
      }
    },
    evalASFunc: function(func, ctx) {
      var self = this;
      ctx = ctx || self.currPage;

      return (_.isFunction(func) ? func.apply(ctx, [self]) : func);
    },
    onDialogHelp: function() {
      window.open(this.options.wizard_help, 'pgadmin_help');
    },
  });

  return pgBrowser;

});
