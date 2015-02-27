function wcIFrame(container, panel) {

  this._panel = panel;
  this._layout = panel.layout();

  this.$container = $(container);
  this.$frame = null;

  this._window = null;
  this._isAttached = true;
  this._hasFocus = false;

  this._boundEvents = [];

  this.__init();
};

wcIFrame.prototype = {
  // --------------------------------------------------------------------------------
  docker: function() {
    var parent = this._panel;
    while (parent && !(parent instanceof wcDocker)) {
      parent = parent._parent;
    }
    return parent;
  },

  // --------------------------------------------------------------------------------
  openURL: function(url) {
    this.__clearFrame();

    this.$frame = $('<iframe class="wcIFrame">');
    this._panel.docker().$container.append(this.$frame);
    this.onMoved();
    this._window = this.$frame[0].contentWindow || this.$frame[0];
    this.__updateFrame();
    this._window.location.replace(url);
  },

  // --------------------------------------------------------------------------------
  openHTML: function(html) {
    this.__clearFrame();

    this.$frame = $('<iframe class="wcIFrame">');
    this._panel.docker().$container.append(this.$frame);
    this.onMoved();
    this._window = this.$frame[0].contentWindow || this.$frame[0];
    this.__updateFrame();

    this._boundEvents = [];

    // Write the frame source.
    this._window.document.open();
    this._window.document.write(html);
    this._window.document.close();
  },

  // --------------------------------------------------------------------------------
  show: function() {
    if (this.$frame) {
      this.$frame.removeClass('wcIFrameHidden');
    }
  },

  // --------------------------------------------------------------------------------
  hide: function() {
    if (this.$frame) {
      this.$frame.addClass('wcIFrameHidden');
    }
  },

  // --------------------------------------------------------------------------------
  window: function() {
    return this._window;
  },

  // --------------------------------------------------------------------------------
  destroy: function() {
    // Remove all registered events.
    while (this._boundEvents.length){
      this._panel.off(this._boundEvents[0].event, this._boundEvents[0].handler);
      this._boundEvents.pop();
    }

    this.__clearFrame();
    this._panel = null;
    this._layout = null;
    this.$container = null;
  },

  // ---------------------------------------------------------------------------
  onVisibilityChanged: function() {
    this.__updateFrame();
  },

  // ---------------------------------------------------------------------------
  onBeginDock: function() {
    if (this.$frame) {
      this.$frame.addClass('wcIFrameMoving');
    }
  },

  // ---------------------------------------------------------------------------
  onEndDock: function() {
    if (this.$frame && this._hasFocus) {
      this.$frame.removeClass('wcIFrameMoving');
    }
  },

  // ---------------------------------------------------------------------------
  onMoveStarted: function() {
    if (this.$frame) {
      // Hide the frame while it is moving.
      this.$frame.addClass('wcIFrameMoving');
    }
  },

  // ---------------------------------------------------------------------------
  onMoveFinished: function() {
    if (this.$frame) {
      this.$frame.removeClass('wcIFrameMoving');
    }
  },

  // --------------------------------------------------------------------------------
  onMoved: function() {
    if (this.$frame) {
      // Size, position, and show the frame once the move is finished.
      var pos = this.$container.offset();
      var width = this.$container.width();
      var height = this.$container.height();

      this.$frame.css('left', pos.left);
      this.$frame.css('top', pos.top);
      this.$frame.css('width', width);
      this.$frame.css('height', height);
    }
  },

  // ---------------------------------------------------------------------------
  onAttached: function() {
    this._isAttached = true;
    this.__updateFrame();
  },

  // ---------------------------------------------------------------------------
  onDetached: function() {
    this._isAttached = false;
    this.__updateFrame();
  },

  // ---------------------------------------------------------------------------
  onGainFocus: function() {
    this._hasFocus = true;
    this.__updateFrame();
  },

  // ---------------------------------------------------------------------------
  onLostFocus: function() {
    this._hasFocus = false;
    this.__updateFrame();
  },

  // --------------------------------------------------------------------------------
  onClosed: function() {
    this.destroy();
  },

  // --------------------------------------------------------------------------------
  __clearFrame: function() {
    if (this.$frame) {
      this.$frame[0].srcdoc = '';
      this.$frame.remove();
      this.$frame = null;
      this._window = null;
    }
  },

  // --------------------------------------------------------------------------------
  __updateFrame: function() {
    if (this.$frame) {
      this.$frame.toggleClass('wcIFrameFloating', !this._isAttached);
      if (!this._isAttached) {
        this.$frame.toggleClass('wcIFrameFloatingFocus', this._hasFocus);
      } else {
        this.$frame.removeClass('wcIFrameFloatingFocus');
      }
      this.$frame.toggleClass('wcIFramePanelHidden', !this._panel.isVisible());
    }
  },

  // --------------------------------------------------------------------------------
  __init: function() {
    this._boundEvents.push({event: wcDocker.EVENT_VISIBILITY_CHANGED, handler: this.onVisibilityChanged.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_BEGIN_DOCK,         handler: this.onBeginDock.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_END_DOCK,           handler: this.onEndDock.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_MOVE_STARTED,       handler: this.onMoveStarted.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_RESIZE_STARTED,     handler: this.onMoveStarted.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_MOVE_ENDED,         handler: this.onMoveFinished.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_RESIZE_ENDED,       handler: this.onMoveFinished.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_MOVED,              handler: this.onMoved.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_RESIZED,            handler: this.onMoved.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_ATTACHED,           handler: this.onAttached.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_DETACHED,           handler: this.onDetached.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_GAIN_FOCUS,         handler: this.onGainFocus.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_LOST_FOCUS,         handler: this.onLostFocus.bind(this)});
    this._boundEvents.push({event: wcDocker.EVENT_CLOSED,             handler: this.onClosed.bind(this)});

    for (var i = 0; i < this._boundEvents.length; ++i) {
      this._panel.on(this._boundEvents[i].event, this._boundEvents[i].handler);
    }
  },
};
