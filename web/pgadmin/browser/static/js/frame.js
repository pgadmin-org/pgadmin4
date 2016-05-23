define(
    ['underscore', 'pgadmin', 'wcdocker'],
function(_, pgAdmin) {

  var pgBrowser = pgAdmin.Browser = pgAdmin.Browser || {};

  pgAdmin.Browser.Frame = function(options) {
    var defaults = [
      'name', 'title', 'width', 'height', 'showTitle', 'isCloseable',
      'isPrivate', 'url', 'icon', 'onCreate'];
    _.extend(this, _.pick(options, defaults));
  }

  _.extend(pgAdmin.Browser.Frame.prototype, {
    name:'',
    title: '',
    width: 300,
    height: 600,
    showTitle: true,
    isClosable: true,
    isPrivate: false,
    url: '',
    icon: '',
    panel: null,
    frame: null,
    onCreate: null,
    load: function(docker) {
      var that = this;
      if (!that.panel) {
        docker.registerPanelType(this.name, {
          title: that.title,
          isPrivate: that.isPrivate,
          onCreate: function(myPanel) {
            $(myPanel).data('pgAdminName', that.name);
            myPanel.initSize(that.width, that.height);

            if (myPanel.showTitle == false)
              myPanel.title(false);

            myPanel.icon(that.icon)

            myPanel.closeable(!!that.isCloseable);

            var $frameArea = $('<div style="position:absolute;top:0 !important;width:100%;height:100%;display:table">');
            myPanel.layout().addItem($frameArea);
            that.panel = myPanel;
            var frame = new wcIFrame($frameArea, myPanel);
            $(myPanel).data('frameInitialized', false);
            $(myPanel).data('embeddedFrame', frame);

            if (that.url != '' && that.url != 'about:blank') {
              setTimeout(function() {
                frame.openURL(that.url);
                $(myPanel).data('frameInitialized', true);
                pgBrowser.Events.trigger(
                  'pgadmin-browser:frame:urlloaded:' + that.name, frame,
                  that.url, self
                );
              }, 50);
            } else {
              frame.openURL('about:blank');
              $(myPanel).data('frameInitialized', true);
              pgBrowser.Events.trigger(
                'pgadmin-browser:frame:urlloaded:' + that.name, frame,
                that.url, self
              );
            }

            if (that.events && _.isObject(that.events)) {
              _.each(that.events, function(v, k) {
                if (v && _.isFunction(v)) {
                  myPanel.on(k, v);
                }
              });
            }

            _.each([
                wcDocker.EVENT.UPDATED, wcDocker.EVENT.VISIBILITY_CHANGED,
                wcDocker.EVENT.BEGIN_DOCK, wcDocker.EVENT.END_DOCK,
                wcDocker.EVENT.GAIN_FOCUS, wcDocker.EVENT.LOST_FOCUS,
                wcDocker.EVENT.CLOSED, wcDocker.EVENT.BUTTON,
                wcDocker.EVENT.ATTACHED, wcDocker.EVENT.DETACHED,
                wcDocker.EVENT.MOVE_STARTED, wcDocker.EVENT.MOVE_ENDED,
                wcDocker.EVENT.MOVED, wcDocker.EVENT.RESIZE_STARTED,
                wcDocker.EVENT.RESIZE_ENDED, wcDocker.EVENT.RESIZED,
                wcDocker.EVENT.SCROLLED], function(ev) {
                  myPanel.on(ev, that.eventFunc.bind(myPanel, ev));
                });

            if (that.onCreate && _.isFunction(that.onCreate)) {
              that.onCreate.apply(that, [myPanel, frame, $container]);
            }
          }
        });
      }
    },
    eventFunc: function(eventName) {
      var name = $(this).data('pgAdminName');

      try {
        pgBrowser.Events.trigger('pgadmin-browser:frame', eventName, this, arguments);
        pgBrowser.Events.trigger('pgadmin-browser:frame:' + eventName, this, arguments);

        if (name) {
          pgBrowser.Events.trigger('pgadmin-browser:frame-' + name, eventName, this, arguments);
          pgBrowser.Events.trigger('pgadmin-browser:frame-' + name + ':' + eventName, this, arguments);
        }
      } catch (e) {
        console.log(e);
      }
    }
  });

  return pgAdmin.Browser.Frame;
});
