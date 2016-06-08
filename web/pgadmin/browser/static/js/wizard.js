define(
    ['underscore', 'backbone', 'pgadmin', 'pgadmin.browser'],
function(_, Backbone, pgAdmin, pgBrowser) {

  pgBrowser = pgBrowser || pgAdmin.Browser || {};

  /* Wizard individual Page Model */
  var WizardPage = pgBrowser.WizardPage = Backbone.Model.extend({
    defaults: {
      id: undefined, /* Id */
      page_title: undefined, /* Page Title */
      view: undefined, /* A Backbone View */
      html: undefined, /* HTML tags to be rendered */
      image: undefined, /* Left hand side image */
      disable_prev: false, /*  Previous Button Flag */
      disable_next: false, /*  Next Button Flag */
      disable_cancel: false, /* Cancel Button Flag */
      show_progress_bar: '',
      /* Callback for OnLoad */
      onLoad: function() {
        return true;
      },
      /* Callback for before Next */
      beforeNext: function() {
        return true;
      },
      onNext: function(){},
      onBefore: function() {},
      /* Callback for before Previous */
      beforePrev: function() {
        return true;
      }
    }
  });

  var Wizard = pgBrowser.Wizard = Backbone.View.extend({
    options: {
      title: 'Wizard', /* Main Wizard Title */
      image: 'left_panel.png', /* TODO:: We can use default image here */
      curr_page: 0, /* Current Page to Load */
      disable_next: false,
      disable_prev: false,
      disable_finish: false,
      disable_cancel: false,
      show_header_cancel_btn: false, /* show cancel button at wizard header */
      height: 400,
      width: 650,
      show_left_panel: true,
      wizard_help: ''
    },
    tmpl: _.template(
       "    <div class='pgadmin-wizard' style='height: <%= this.options.height %>px;"
       + "    width: <%= this.options.width %>px'>"
       + "      <div class='wizard-header wizard-badge'>"
       + "        <div class='row'>"
       + "          <div class='col-sm-9'>"
       + "              <h3><span id='main-title'><%= this.options.title %></span> -"
       + "              <span id='step-title'><%= page_title %></span></h3>"
       + "          </div>"
       + "          <% if (this.options.show_header_cancel_btn) { %>"
       + "            <div class='col-sm-3'>"
       + "              <button class='ajs-close wizard-cancel-event pull-right'></button>"
       + "            </div>"
       + "          <% } %>"
       + "        </div>"
       + "      </div>"
       + "      <div class='wizard-content col-sm-12'>"
       + "        <% if (this.options.show_left_panel) { %>"
       + "          <div class='col-sm-3 wizard-left-panel'>"
       + "              <img src='<%= this.options.image %>'></div>"
       + "        <% } %>"
       + "        <div class='col-sm-<% if (this.options.show_left_panel) { %>9<% }"
       + "          else { %>12<% } %> wizard-right-panel'>"
       + "          <% if ( typeof show_description !=  'undefined'){ %>"
       + "            <div class='wizard-description'>"
       + "              <%= show_description %>"
       + "            </div>"
       + "          <% } %>"
       + "          <div class='wizard-progress-bar'><% if (show_progress_bar) { %>"
       + "            <p class='alert alert-info col-sm-12'><%= show_progress_bar %></p><% } %>"
       + "          </div>"
       + "          <div class='wizard-right-panel_content col-xs-12'>"
       + "          </div>"
       + "        </div>"
       + "      </div>"
       + "      <div class='col-sm-12 error_msg_div'>"
       + "       <p></p>"
       + "      </div>"
       + "      <div class='footer col-sm-12'>"
       + "        <div class='row'>"
       + "          <div class='col-sm-4 wizard-buttons pull-left'>"
       + "            <button title = 'Help for this dialog.' class='btn btn-default pull-left wizard-help' <%=this.options.wizard_help ? '' : 'disabled' %>>"
       + "              <span class='fa fa-lg fa-question'></span></button>"
       + "          </div>"
       + "          <div class='col-sm-8'>"
       + "            <div class='wizard-buttons'>"
       + "              <button class='btn btn-primary wizard-back' <%=this.options.disable_prev ? 'disabled' : ''%>>"
       + "                <i class='fa fa-backward'></i>Back</button>"
       + "              <button class='btn btn-primary wizard-next' <%=this.options.disable_next ? 'disabled' : ''%>>Next"
       + "                <i class='fa fa-forward'></i></button>"
       + "              <button class='btn btn-danger wizard-cancel' <%=this.options.disable_cancel ? 'disabled' : ''%>>"
       + "                <i class='fa fa-lg fa-close'></i>Cancel</button>"
       + "              <button class='btn btn-primary wizard-finish' <%=this.options.disable_finish ? 'disabled' : ''%>>"
       + "                Finish</button>"
       + "            </div>"
       + "          </div>"
       + "        </div>"
       + "      </div>"
       + "    </div>"),
    events: {
      "click button.wizard-next" : "nextPage",
      "click button.wizard-back" : "prevPage",
      "click button.wizard-cancel" : "onCancel",
      "click button.wizard-cancel-event" : "onCancel",
      "click button.wizard-finish" : "finishWizard",
      "click button.wizard-help" : "onDialogHelp",
    },
    initialize: function(options) {
      this.options = _.extend({}, this.options, options.options);
      this.currPage = this.collection.at(this.options.curr_page).toJSON();
    },
    render: function() {
      var data = this.currPage;

      /* Check Status of the buttons */
      this.options.disable_next = (this.options.disable_next ? true : this.evalASFunc(this.currPage.disable_next));
      this.options.disable_prev = (this.options.disable_prev ? true : this.evalASFunc(this.currPage.disable_prev));
      this.options.disable_cancel = (this.currPage.canCancel ? true : this.evalASFunc(this.currPage.disable_cancel));

      that = this;

      /* HTML Content */
      if (data.html) { data.content = data.html; }
      /* Backbone View */
      else if (data.view) { data.content = data.view.render().el;}

      $(this.el).html(this.tmpl(data));
      $(this.el).find(".wizard-right-panel_content").html(data.content);

      /* OnLoad Callback */
      this.onLoad();

      return this;
    },
    nextPage: function() {
      this.options.curr_page.el = this.$el;
      if (!this.beforeNext()) { return false; }

      page_id = this.onNext();

      if (page_id ) {
        this.currPage = this.collection.get(page_id).toJSON();
        this.options.curr_page = this.collection.indexOf(this.collection.get(page_id));
      }
      else if (this.options.curr_page < (this.collection.length-1)) {
        this.options.curr_page = this.options.curr_page + 1;
        this.currPage = this.collection.at(this.options.curr_page).toJSON();
      }

      this.enableDisableNext();
      this.enableDisablePrev();

      return this.render();
    },
    prevPage: function() {
      if (!this.beforePrev()) { return false; }

      page_id = this.onPrev();

      if (page_id){
        this.currPage = this.collection.get(page_id).toJSON();
        this.options.curr_page = this.collection.indexOf(this.collection.get(page_id));
      }
      else if (this.options.curr_page > 0) {
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
      this.unbind(); // Unbind all local event bindings
      delete this.$el; // Delete the jQuery wrapped object variable
      delete this.el; // Delete the variable reference to this node
      return true;
    },
    enableDisableNext: function(disable) {
        if (typeof(disable) != 'undefined') {
          this.options.disable_next = disable;
        }
        else if (this.options.curr_page >= (this.collection.length-1)) {
          this.options.disable_next = true;
        }
        else {
          this.options.disable_next = false;
        }
    },
    enableDisablePrev: function(disable) {
        if (typeof(disable) != 'undefined') {
          this.options.disable_prev = disable;
        }
        else if (this.options.curr_page <= 0) {
          this.options.disable_prev = true;
        }
        else {
          this.options.disable_prev = false;
        }
    },
    beforeNext: function(){
      return this.evalASFunc(this.currPage.beforeNext);
    },
    beforePrev: function(){
      return this.evalASFunc(this.currPage.beforePrev);
    },
    onPrev: function(){
      return this.evalASFunc(this.currPage.onPrev);
    },
    onNext: function(){
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
    evalASFunc: function(func, ctx) {
      var self = this;
      ctx = ctx || self.currPage;

      return (_.isFunction(func) ? func.apply(ctx, [self]) : func);
    },
    onDialogHelp: function() {
      // See if we can find an existing panel, if not, create one
      pnlDialogHelp = pgBrowser.docker.findPanels('pnl_online_help')[0];

      if (pnlDialogHelp == null) {
        pnlProperties = pgBrowser.docker.findPanels('properties')[0];
        pgBrowser.docker.addPanel('pnl_online_help', wcDocker.DOCK.STACKED, pnlProperties);
        pnlDialogHelp = pgBrowser.docker.findPanels('pnl_online_help')[0];
      }

      // Update the panel
      iframe = $(pnlDialogHelp).data('embeddedFrame');

      pnlDialogHelp.focus();
      iframe.openURL(this.options.wizard_help);
    }
  });

  return pgBrowser;

});
