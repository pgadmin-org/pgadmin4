define(
    ['underscore', 'pgadmin', 'wcdocker'],
function(_, pgAdmin) {

  pgAdmin.Browser = pgAdmin.Browser || {};
  pgAdmin.Browser.Frame = function(options) {
    var defaults = [
      'name', 'title', 'width', 'height', 'showTitle', 'isClosable',
      'isPrivate', 'url'];
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
    url: 'about:blank',
    panel: null,
    frame: null,
    load: function(docker) {
      var that = this;
      if (!that.panel) {
        docker.registerPanelType(this.name, {
        title: that.title,
        isPrivate: that.isPrivate,
        onCreate: function(myPanel) {
          myPanel.initSize(that.width, that.height);
          if (myPanel.showTitle == false)
            myPanle.title(false);
          myPanel.closeable(that.isCloseable == true);

          var $frameArea = $('<div style="width:100%;height:100%;position:relative;">');
          myPanel.layout().addItem($frameArea).parent().css('height', '100%');
          that.panel = myPanel;
          that.frame = new wcIFrame($frameArea, myPanel);

          setTimeout(function() { that.frame.openURL(that.url); }, 500);
          }
        });
      }
    }
  });

  return pgAdmin.Browser.Frame;
});
