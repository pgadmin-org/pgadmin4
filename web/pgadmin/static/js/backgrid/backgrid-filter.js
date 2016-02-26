/*
  backgrid-filter
  http://github.com/wyuenho/backgrid

  Copyright (c) 2013 Jimmy Yuen Ho Wong and contributors
  Licensed under the MIT @license.
*/
(function (root, factory) {

  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(["underscore", "backbone", "backgrid"], factory);
  } else if (typeof exports == "object") {
    // CommonJS
    (function () {
      var lunr;
      try { lunr = require("lunr"); } catch (e) {}
      module.exports = factory(require("underscore"),
                               require("backbone"),
                               require("backgrid"),
                               lunr);
    }());
  } else {
    // Browser
    factory(root._, root.Backbone, root.Backgrid, root.lunr);
  }

}(this, function (_, Backbone, Backgrid, lunr) {

  "use strict";

  /**
     ServerSideFilter is a search form widget that submits a query to the server
     for filtering the current collection.

     @class Backgrid.Extension.ServerSideFilter
  */
  var ServerSideFilter = Backgrid.Extension.ServerSideFilter = Backbone.View.extend({

    /** @property */
    tagName: "form",

    /** @property */
    className: "backgrid-filter form-search",

    /** @property {function(Object, ?Object=): string} template */
    template: function (data) {
      return '<span class="search">&nbsp;</span><input type="search" ' + (data.placeholder ? 'placeholder="' + data.placeholder + '"' : '') + ' name="' + data.name + '" ' + (data.value ? 'value="' + data.value + '"' : '') + '/><a class="clear" data-backgrid-action="clear" href="#">&times;</a>';
    },

    /** @property */
    events: {
      "keyup input[type=search]": "showClearButtonMaybe",
      "click a[data-backgrid-action=clear]": "clear",
      "submit": "search"
    },

    /** @property {string} [name='q'] Query key */
    name: "q",

    /** @property {string} [value] The search box value.  */
    value: null,

    /**
       @property {string} [placeholder] The HTML5 placeholder to appear beneath
       the search box.
    */
    placeholder: null,

    /**
       @param {Object} options
       @param {Backbone.Collection} options.collection
       @param {string} [options.name]
       @param {string} [options.value]
       @param {string} [options.placeholder]
       @param {function(Object): string} [options.template]
    */
    initialize: function (options) {
      ServerSideFilter.__super__.initialize.apply(this, arguments);
      this.name = options.name || this.name;
      this.value = options.value || this.value;
      this.placeholder = options.placeholder || this.placeholder;
      this.template = options.template || this.template;

      // Persist the query on pagination
      var collection = this.collection, self = this;
      if (Backbone.PageableCollection &&
          collection instanceof Backbone.PageableCollection &&
          collection.mode == "server") {
        collection.queryParams[this.name] = function () {
          return self.searchBox().val() || null;
        };
      }
    },

    /**
       Event handler. Clear the search box and reset the internal search value.
     */
    clearSearchBox: function() {
      this.value = null;
      this.searchBox().val(null);
      this.showClearButtonMaybe();
    },

    /**
       Event handler. Show the clear button when the search box has text, hide
       it otherwise.
     */
    showClearButtonMaybe: function () {
      var $clearButton = this.clearButton();
      var searchTerms = this.searchBox().val();
      if (searchTerms) $clearButton.show();
      else $clearButton.hide();
    },

    /**
       Returns the search input box.
     */
    searchBox: function () {
      return this.$el.find("input[type=search]");
    },

    /**
       Returns the clear button.
     */
    clearButton: function () {
      return this.$el.find("a[data-backgrid-action=clear]");
    },


    /**
       Returns the current search query.
     */
    query: function() {
      this.value = this.searchBox().val();
      return this.value;
    },

    /**
       Upon search form submission, this event handler constructs a query
       parameter object and pass it to Collection#fetch for server-side
       filtering.

       If the collection is a PageableCollection, searching will go back to the
       first page.
    */
    search: function (e) {
      if (e) e.preventDefault();

      var data = {};
      var query = this.query();
      if (query) data[this.name] = query;

      var collection = this.collection;

      // go back to the first page on search
      if (Backbone.PageableCollection &&
          collection instanceof Backbone.PageableCollection) {
        collection.getFirstPage({data: data, reset: true, fetch: true});
      }
      else collection.fetch({data: data, reset: true});
    },

    /**
       Event handler for the clear button. Clears the search box and refetch the
       collection.

       If the collection is a PageableCollection, clearing will go back to the
       first page.
    */
    clear: function (e) {
      if (e) e.preventDefault();
      this.clearSearchBox();

      var collection = this.collection;

      // go back to the first page on clear
      if (Backbone.PageableCollection &&
          collection instanceof Backbone.PageableCollection) {
        collection.getFirstPage({reset: true, fetch: true});
      }
      else collection.fetch({reset: true});
    },

    /**
       Renders a search form with a text box, optionally with a placeholder and
       a preset value if supplied during initialization.
    */
    render: function () {
      this.$el.empty().append(this.template({
        name: this.name,
        placeholder: this.placeholder,
        value: this.value
      }));
      this.showClearButtonMaybe();
      this.delegateEvents();
      return this;
    }

  });

  /**
     ClientSideFilter is a search form widget that searches a collection for
     model matches against a query on the client side. The exact matching
     algorithm can be overriden by subclasses.

     @class Backgrid.Extension.ClientSideFilter
     @extends Backgrid.Extension.ServerSideFilter
  */
  var ClientSideFilter = Backgrid.Extension.ClientSideFilter = ServerSideFilter.extend({

    /** @property */
    events: _.extend({}, ServerSideFilter.prototype.events, {
      "click a[data-backgrid-action=clear]": function (e) {
        e.preventDefault();
        this.clear();
      },
      "keydown input[type=search]": "search",
      "submit": function (e) {
        e.preventDefault();
        this.search();
      }
    }),

    /**
       @property {?Array.<string>} [fields] A list of model field names to
       search for matches. If null, all of the fields will be searched.
    */
    fields: null,

    /**
       @property [wait=149] The time in milliseconds to wait since the last
       change to the search box's value before searching. This value can be
       adjusted depending on how often the search box is used and how large the
       search index is.
    */
    wait: 149,

    /**
       Debounces the #search and #clear methods and makes a copy of the given
       collection for searching.

       @param {Object} options
       @param {Backbone.Collection} options.collection
       @param {string} [options.placeholder]
       @param {string} [options.fields]
       @param {string} [options.wait=149]
    */
    initialize: function (options) {
      ClientSideFilter.__super__.initialize.apply(this, arguments);

      this.fields = options.fields || this.fields;
      this.wait = options.wait || this.wait;

      this._debounceMethods(["search", "clear"]);

      var collection = this.collection = this.collection.fullCollection || this.collection;
      var shadowCollection = this.shadowCollection = collection.clone();

      this.listenTo(collection, "add", function (model, collection, options) {
        shadowCollection.add(model, options);
      });
      this.listenTo(collection, "remove", function (model, collection, options) {
        shadowCollection.remove(model, options);
      });
      this.listenTo(collection, "sort", function (col) {
        if (!this.searchBox().val()) shadowCollection.reset(col.models);
      });
      this.listenTo(collection, "reset", function (col, options) {
        options = _.extend({reindex: true}, options || {});
        if (options.reindex && options.from == null && options.to == null) {
          shadowCollection.reset(col.models);
        }
      });
    },

    _debounceMethods: function (methodNames) {
      if (_.isString(methodNames)) methodNames = [methodNames];

      this.undelegateEvents();

      for (var i = 0, l = methodNames.length; i < l; i++) {
        var methodName = methodNames[i];
        var method = this[methodName];
        this[methodName] = _.debounce(method, this.wait);
      }

      this.delegateEvents();
    },

    /**
       Constructs a Javascript regular expression object for #makeMatcher.

       This default implementation takes a query string and returns a Javascript
       RegExp object that matches any of the words contained in the query string
       case-insensitively. Override this method to return a different regular
       expression matcher if this behavior is not desired.

       @param {string} query The search query in the search box.
       @return {RegExp} A RegExp object to match against model #fields.
     */
    makeRegExp: function (query) {
      return new RegExp(query.trim().split(/\s+/).join("|"), "i");
    },

    /**
       This default implementation takes a query string and returns a matcher
       function that looks for matches in the model's #fields or all of its
       fields if #fields is null, for any of the words in the query
       case-insensitively using the regular expression object returned from
       #makeRegExp.

       Most of time, you'd want to override the regular expression used for
       matching. If so, please refer to the #makeRegExp documentation,
       otherwise, you can override this method to return a custom matching
       function.

       Subclasses overriding this method must take care to conform to the
       signature of the matcher function. The matcher function is a function
       that takes a model as paramter and returns true if the model matches a
       search, or false otherwise.

       In addition, when the matcher function is called, its context will be
       bound to this ClientSideFilter object so it has access to the filter's
       attributes and methods.

       @param {string} query The search query in the search box.
       @return {function(Backbone.Model):boolean} A matching function.
    */
    makeMatcher: function (query) {
      var regexp = this.makeRegExp(query);
      return function (model) {
        var keys = this.fields || model.keys();
        for (var i = 0, l = keys.length; i < l; i++) {
          if (regexp.test(model.get(keys[i]) + "")) return true;
        }
        return false;
      };
    },

    /**
       Takes the query from the search box, constructs a matcher with it and
       loops through collection looking for matches. Reset the given collection
       when all the matches have been found.

       If the collection is a PageableCollection, searching will go back to the
       first page.
    */
    search: function () {
      var matcher = _.bind(this.makeMatcher(this.query()), this);
      var col = this.collection;
      if (col.pageableCollection) col.pageableCollection.getFirstPage({silent: true});
      col.reset(this.shadowCollection.filter(matcher), {reindex: false});
    },

    /**
       Clears the search box and reset the collection to its original.

       If the collection is a PageableCollection, clearing will go back to the
       first page.
    */
    clear: function () {
      this.clearSearchBox();
      var col = this.collection;
      if (col.pageableCollection) col.pageableCollection.getFirstPage({silent: true});
      col.reset(this.shadowCollection.models, {reindex: false});
    }

  });

  /**
     LunrFilter is a ClientSideFilter that uses [lunrjs](http://lunrjs.com/) to
     index the text fields of each model for a collection, and performs
     full-text searching.

     @class Backgrid.Extension.LunrFilter
     @extends Backgrid.Extension.ClientSideFilter
  */
  var LunrFilter = Backgrid.Extension.LunrFilter = ClientSideFilter.extend({

    /**
       @property {string} [ref="id"]｀lunrjs` document reference attribute name.
    */
    ref: "id",

    /**
       @property {Object} fields A hash of `lunrjs` index field names and boost
       value. Unlike ClientSideFilter#fields, LunrFilter#fields is _required_ to
       initialize the index.
    */
    fields: null,

    /**
       Indexes the underlying collection on construction. The index will refresh
       when the underlying collection is reset. If any model is added, removed
       or if any indexed fields of any models has changed, the index will be
       updated.

       @param {Object} options
       @param {Backbone.Collection} options.collection
       @param {string} [options.placeholder]
       @param {string} [options.ref] ｀lunrjs` document reference attribute name.
       @param {Object} [options.fields] A hash of `lunrjs` index field names and
       boost value.
       @param {number} [options.wait]
    */
    initialize: function (options) {
      LunrFilter.__super__.initialize.apply(this, arguments);

      this.ref = options.ref || this.ref;

      var collection = this.collection = this.collection.fullCollection || this.collection;
      this.listenTo(collection, "add", this.addToIndex);
      this.listenTo(collection, "remove", this.removeFromIndex);
      this.listenTo(collection, "reset", this.resetIndex);
      this.listenTo(collection, "change", this.updateIndex);

      this.resetIndex(collection);
    },

    /**
       Reindex the collection. If `options.reindex` is `false`, this method is a
       no-op.

       @param {Backbone.Collection} collection
       @param {Object} [options]
       @param {boolean} [options.reindex=true]
    */
    resetIndex: function (collection, options) {
      options = _.extend({reindex: true}, options || {});

      if (options.reindex) {
        var self = this;
        this.index = lunr(function () {
          _.each(self.fields, function (boost, fieldName) {
            this.field(fieldName, boost);
            this.ref(self.ref);
          }, this);
        });

        collection.each(function (model) {
          this.addToIndex(model);
        }, this);
      }
    },

    /**
       Adds the given model to the index.

       @param {Backbone.Model} model
    */
    addToIndex: function (model) {
      var index = this.index;
      var doc = model.toJSON();
      if (index.documentStore.has(doc[this.ref])) index.update(doc);
      else index.add(doc);
    },

    /**
       Removes the given model from the index.

       @param {Backbone.Model} model
    */
    removeFromIndex: function (model) {
      var index = this.index;
      var doc = model.toJSON();
      if (index.documentStore.has(doc[this.ref])) index.remove(doc);
    },

    /**
       Updates the index for the given model.

       @param {Backbone.Model} model
    */
    updateIndex: function (model) {
      var changed = model.changedAttributes();
      if (changed && !_.isEmpty(_.intersection(_.keys(this.fields),
                                               _.keys(changed)))) {
        this.index.update(model.toJSON());
      }
    },

    /**
       Takes the query from the search box and performs a full-text search on
       the client-side. The search result is returned by resetting the
       underlying collection to the models after interrogating the index for the
       query answer.

       If the collection is a PageableCollection, searching will go back to the
       first page.
    */
    search: function () {
      var col = this.collection;
      if (!this.query()) {
        col.reset(this.shadowCollection.models, {reindex: false});
        return;
      }

      var searchResults = this.index.search(this.query());
      var models = [];
      for (var i = 0; i < searchResults.length; i++) {
        var result = searchResults[i];
        models.push(this.shadowCollection.get(result.ref));
      }

      if (col.pageableCollection) col.pageableCollection.getFirstPage({silent: true});
      col.reset(models, {reindex: false});
    }

  });

}));
