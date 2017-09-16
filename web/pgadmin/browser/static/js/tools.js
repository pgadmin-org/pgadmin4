define(
  'pgadmin.browser.tool', ['underscore', 'sources/pgadmin', 'pgadmin.browser'],
  function (_, pgAdmin, pgBrowser) {
    pgBrowser.Tool = {};

    // Helper function to correctly set up the property chain, for subclasses.
    // Uses a hash of class properties to be extended.
    //
    // It is unlikely - we will instantiate an object for this class.
    // (Inspired by Backbone.extend function)
    pgBrowser.Tool.extend = function(props) {
      var parent = this;
      var child;

      // The constructor function for the new subclass is defined to simply call
      // the parent's constructor.
      child = function(){ return parent.apply(this, arguments); };

      // Add static properties to the constructor function, if supplied.
      _.extend(child, parent, props);

      // Registering the module with the browser object.
      pgAdmin.register_module('browser', child);

      return child;
    };

    return pgBrowser.Tool;
  }
);
