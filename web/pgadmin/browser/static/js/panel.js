define(
    ['underscore', 'pgadmin', 'wcdocker'],
function(_, pgAdmin) {
  pgAdmin.Browser = pgAdmin.Browser || {};
  pgAdmin.Browser.Panel = function(options) {
    var defaults = [
      'name', 'title', 'width', 'height', 'showTitle', 'isCloseable',
      'isPrivate', 'content', 'events'];
    _.extend(this, _.pick(options, defaults));
  }

  _.extend(pgAdmin.Browser.Panel.prototype, {
    name:'',
    title: '',
    width: 300,
    height: 600,
    showTitle: true,
    isCloseable: true,
    isPrivate: false,
    content: '',
    panel: null,
    load: function(docker, title) {
      var that = this;
      if (!that.panel) {
        docker.registerPanelType(that.name, {
          title: that.title,
          isPrivate: that.isPrivate,
          onCreate: function(myPanel) {
            myPanel.initSize(that.width, that.height);
            if (!that.showTitle)
              myPanel.title(false);
            else
              myPanel.title(title || that.title);
            myPanel.closeable(that.isCloseable == true);
            myPanel.layout().addItem(that.content, 0, 0).parent().css('height', '100%');
            that.panel = myPanel;
            if (that.events && _.isObject(that.events)) {
              _.each(that.events, function(v, k) {
                if (v && _.isFunction(v)) {
                  myPanel.on(k, v);
                }
              });
            }
          }
        });
      }
    }
  });

  return pgAdmin.Browser.Panel;
});
