/*
 * aciTree jQuery Plugin v4.5.0-rc.7
 * http://acoderinsights.ro
 *
 * Copyright (c) 2014 Dragos Ursu
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Require jQuery Library >= v1.9.0 http://jquery.com
 * + aciPlugin >= v1.5.1 https://github.com/dragosu/jquery-aciPlugin
 */

/*
 * The aciTree low-level DOM functions.
 *
 * A collection of functions optimised for aciTree DOM structure.
 *
 * Need to be included before the aciTree core and after aciPlugin.
 */

aciPluginClass.plugins.aciTree_dom = {
    // get the UL container from a LI
    // `node` must be valid LI DOM node
    // can return NULL
    container: function(node) {
        var container = node.lastChild;
        if (container && (container.nodeName == 'UL')) {
            return container;
        }
        return null;
    },
    // get the first children from a LI (with filtering)
    // `node` must be valid LI DOM node
    // `callback` can return FALSE to skip a node
    // can return NULL
    firstChild: function(node, callback) {
        var container = this.container(node);
        if (container) {
            var firstChild = container.firstChild;
            if (callback) {
                while (firstChild && !callback.call(this, firstChild)) {
                    firstChild = firstChild.nextSibling;
                }
            }
            return firstChild;
        }
        return null;
    },
    // get the last children from a LI (with filtering)
    // `node` must be valid LI DOM node
    // `callback` can return FALSE to skip a node
    // can return NULL
    lastChild: function(node, callback) {
        var container = this.container(node);
        if (container) {
            var lastChild = container.lastChild;
            if (callback) {
                while (lastChild && !callback.call(this, lastChild)) {
                    lastChild = lastChild.previousSibling;
                }
            }
            return lastChild;
        }
        return null;
    },
    // get the previous LI sibling (with filtering)
    // `node` must be valid LI DOM node
    // `callback` can return FALSE to skip a node
    // can return NULL
    prev: function(node, callback) {
        var previous = node.previousSibling;
        if (callback) {
            while (previous && !callback.call(this, previous)) {
                previous = previous.previousSibling;
            }
        }
        return previous;
    },
    // get the next LI sibling (with filtering)
    // `node` must be valid LI DOM node
    // `callback` can return FALSE to skip a node
    // can return NULL
    next: function(node, callback) {
        var next = node.nextSibling;
        if (callback) {
            while (next && !callback.call(this, next)) {
                next = next.nextSibling;
            }
        }
        return next;
    },
    // get the previous LI in tree order (with filtering)
    // `node` must be valid LI DOM node
    // `callback` can return FALSE to skip a node or NULL to prevent drill down/skip the node
    // can return NULL
    prevAll: function(node, callback) {
        var previous, lastChild, drillDown, match, prev, parent;
        while (true) {
            previous = this.prev(node);
            if (previous) {
                if (callback) {
                    match = callback.call(this, previous);
                    if (match === null) {
                        node = previous;
                        continue;
                    }
                }
                lastChild = this.lastChild(previous);
                if (lastChild) {
                    if (callback && (callback.call(this, lastChild) === null)) {
                        node = lastChild;
                        continue;
                    }
                    prev = false;
                    while (drillDown = this.lastChild(lastChild)) {
                        lastChild = drillDown;
                        if (callback) {
                            match = callback.call(this, lastChild);
                            if (match === null) {
                                node = lastChild;
                                prev = true;
                                break;
                            }
                        }
                    }
                    if (prev) {
                        continue;
                    }
                    if (callback) {
                        match = callback.call(this, lastChild);
                        if (match) {
                            return lastChild;
                        } else if (match !== null) {
                            node = lastChild;
                            continue;
                        }
                    } else {
                        return lastChild;
                    }
                } else {
                    if (!callback || match) {
                        return previous;
                    } else {
                        node = previous;
                        continue;
                    }
                }
            }
            parent = this.parent(node);
            if (parent) {
                if (callback) {
                    match = callback.call(this, parent);
                    if (match) {
                        return parent;
                    } else {
                        node = parent;
                    }
                } else {
                    return parent;
                }
            } else {
                return null;
            }
        }
        return null;
    },
    // get the next LI in tree order (with filtering)
    // `node` must be valid LI DOM node
    // `callback` can return FALSE to skip a node or NULL to prevent drill down/skip the node
    // can return NULL
    nextAll: function(node, callback) {
        var firstChild, match, next, parent, child;
        while (true) {
            firstChild = this.firstChild(node);
            if (firstChild) {
                if (callback) {
                    match = callback.call(this, firstChild);
                    if (match) {
                        return firstChild;
                    } else {
                        node = firstChild;
                        if (match !== null) {
                            continue;
                        }
                    }
                } else {
                    return firstChild;
                }
            }
            while (true) {
                next = this.next(node);
                if (next) {
                    if (callback) {
                        match = callback.call(this, next);
                        if (match) {
                            return next;
                        } else {
                            node = next;
                            if (match !== null) {
                                break;
                            } else {
                                continue;
                            }
                        }
                    } else {
                        return next;
                    }
                } else {
                    parent = node;
                    child = null;
                    while (parent = this.parent(parent)) {
                        next = this.next(parent);
                        if (next) {
                            if (callback) {
                                match = callback.call(this, next);
                                if (match) {
                                    return next;
                                } else {
                                    node = next;
                                    if (match !== null) {
                                        child = true;
                                    } else {
                                        child = false;
                                    }
                                    break;
                                }
                            } else {
                                return next;
                            }
                        }
                    }
                    if (child !== null) {
                        if (child) {
                            break;
                        } else {
                            continue;
                        }
                    }
                    return null;
                }
            }
        }
        return null;
    },
    // get the first LI in tree order (with filtering)
    // `node` must be valid LI DOM node
    // `callback` can return FALSE to skip a node or NULL to prevent drill down/skip the node
    // can return NULL
    first: function(node, callback) {
        var container = this.container(node);
        if (container) {
            var firstChild = container.firstChild;
            if (firstChild) {
                if (callback && !callback.call(this, firstChild)) {
                    return this.nextAll(firstChild, callback);
                }
                return firstChild;
            }
        }
        return null;
    },
    // get the last LI in tree order (with filtering)
    // `node` must be valid LI DOM node
    // `callback` can return FALSE to skip a node or NULL to prevent drill down/skip the node
    // can return NULL
    last: function(node, callback) {
        var container = this.container(node);
        if (container) {
            var lastChild = container.lastChild;
            if (lastChild) {
                if (callback && (callback.call(this, lastChild) === null)) {
                    return this.prevAll(lastChild, callback);
                } else {
                    var drillDown;
                    while (drillDown = this.lastChild(lastChild)) {
                        lastChild = drillDown;
                    }
                    if (callback && !callback.call(this, lastChild)) {
                        return this.prevAll(lastChild, callback);
                    }
                    return lastChild;
                }
            }
        }
        return null;
    },
    // get the children LI from the node
    // `node` must be valid LI DOM node
    // `drillDown` if TRUE all children are returned
    // `callback` can return FALSE to skip a node or NULL to prevent drill down/skip the node
    children: function(node, drillDown, callback) {
        var children = [], levels = [], match, next, skip;
        var firstChild = this.firstChild(node);
        if (firstChild) {
            while (true) {
                skip = false;
                do {
                    if (callback) {
                        match = callback.call(this, firstChild);
                        if (match) {
                            children.push(firstChild);
                        }
                        if (drillDown && (match !== null)) {
                            next = this.firstChild(firstChild);
                            if (next) {
                                levels.push(firstChild);
                                firstChild = next;
                                skip = true;
                                break;
                            }
                        }
                    } else {
                        children.push(firstChild);
                        if (drillDown) {
                            next = this.firstChild(firstChild);
                            if (next) {
                                levels.push(firstChild);
                                firstChild = next;
                                skip = true;
                                break;
                            }
                        }
                    }
                } while (firstChild = firstChild.nextSibling);
                if (!skip) {
                    while (firstChild = levels.pop()) {
                        firstChild = firstChild.nextSibling;
                        if (firstChild) {
                            break;
                        }
                    }
                    if (!firstChild) {
                        break;
                    }
                }
            }
        }
        return children;
    },
    // get a children from the node
    // `node` must be valid DOM node
    // `callback` can return FALSE to skip a node or NULL to stop the search
    // can return NULL
    childrenTill: function(node, callback) {
        var levels = [], match, next, skip;
        var firstChild = node.firstChild;
        if (firstChild) {
            while (true) {
                skip = false;
                do {
                    match = callback.call(this, firstChild);
                    if (match) {
                        return firstChild;
                    } else if (match === null) {
                        return null;
                    }
                    next = firstChild.firstChild;
                    if (next) {
                        levels.push(firstChild);
                        firstChild = next;
                        skip = true;
                        break;
                    }
                } while (firstChild = firstChild.nextSibling);
                if (!skip) {
                    while (firstChild = levels.pop()) {
                        firstChild = firstChild.nextSibling;
                        if (firstChild) {
                            break;
                        }
                    }
                    if (!firstChild) {
                        break;
                    }
                }
            }
        }
        return null;
    },
    // get a children from the node having a class
    // `node` must be valid DOM node
    // `className` String or Array to check for
    // can return NULL
    childrenByClass: function(node, className) {
        if (node.getElementsByClassName) {
            var list = node.getElementsByClassName(className instanceof Array ? className.join(' ') : className);
            return list ? list[0] : null;
        } else {
            return this.childrenTill(node, function(node) {
                return this.hasClass(node, className);
            });
        }
    },
    // get the parent LI from the children LI
    // `node` must be valid LI DOM node
    // can return NULL
    parent: function(node) {
        var parent = node.parentNode.parentNode;
        if (parent && (parent.nodeName == 'LI')) {
            return parent;
        }
        return null;
    },
    // get the parent LI from any children
    // `node` must be valid children of a LI DOM node
    // can return NULL
    parentFrom: function(node) {
        while (node.nodeName != 'LI') {
            node = node.parentNode;
            if (!node) {
                return null;
            }
        }
        return node;
    },
    // get a parent from the node
    // `node` must be valid DOM node
    // `callback` can return FALSE to skip a node or NULL to stop the search
    // can return NULL
    parentTill: function(node, callback) {
        var match;
        while (node = node.parentNode) {
            match = callback.call(this, node);
            if (match) {
                return node;
            } else if (match === null) {
                return null;
            }
        }
        return null;
    },
    // get a parent from the node having a class
    // `node` must be valid DOM node
    // `className` String or Array to check for
    // can return NULL
    parentByClass: function(node, className) {
        return this.parentTill(node, function(node) {
            return this.hasClass(node, className);
        });
    },
    // test if node has class(es)
    // `className` String or Array to check for
    // `withOut` String or Array to exclude with
    hasClass: function(node, className, withOut) {
        var oldClass = ' ' + node.className + ' ';
        if (withOut instanceof Array) {
            for (var i = 0; i < withOut.length; i++) {
                if (oldClass.indexOf(' ' + withOut[i] + ' ') != -1) {
                    return false;
                }
            }
        } else {
            if (withOut && oldClass.indexOf(' ' + withOut + ' ') != -1) {
                return false;
            }
        }
        if (className instanceof Array) {
            for (var i = 0; i < className.length; i++) {
                if (oldClass.indexOf(' ' + className[i] + ' ') == -1) {
                    return false;
                }
            }
        } else {
            if (className && oldClass.indexOf(' ' + className + ' ') == -1) {
                return false;
            }
        }
        return true;
    },
    // filter nodes with class(es)
    // `nodes` Array of DOM nodes
    // @see `hasClass`
    withClass: function(nodes, className, withOut) {
        var filter = [];
        for (var i = 0; i < nodes.length; i++) {
            if (this.hasClass(nodes[i], className, withOut)) {
                filter.push(nodes[i]);
            }
        }
        return filter;
    },
    // test if node has any class(es)
    // `className` String or Array to check for (any class)
    // `withOut` String or Array to exclude with
    hasAnyClass: function(node, className, withOut) {
        var oldClass = ' ' + node.className + ' ';
        if (withOut instanceof Array) {
            for (var i = 0; i < withOut.length; i++) {
                if (oldClass.indexOf(' ' + withOut[i] + ' ') != -1) {
                    return false;
                }
            }
        } else {
            if (withOut && oldClass.indexOf(' ' + withOut + ' ') != -1) {
                return false;
            }
        }
        if (className instanceof Array) {
            for (var i = 0; i < className.length; i++) {
                if (oldClass.indexOf(' ' + className[i] + ' ') != -1) {
                    return true;
                }
            }
        } else {
            if (className && oldClass.indexOf(' ' + className + ' ') != -1) {
                return true;
            }
        }
        return false;
    },
    // filter nodes with any class(es)
    // `nodes` Array of DOM nodes
    // @see `hasAnyClass`
    withAnyClass: function(nodes, className, withOut) {
        var filter = [];
        for (var i = 0; i < nodes.length; i++) {
            if (this.hasAnyClass(nodes[i], className, withOut)) {
                filter.push(nodes[i]);
            }
        }
        return filter;
    },
    // add class(es) to node
    // `node` must be valid DOM node
    // `className` String or Array to add
    // return TRUE if className changed
    addClass: function(node, className) {
        var oldClass = ' ' + node.className + ' ', append = '';
        if (className instanceof Array) {
            for (var i = 0; i < className.length; i++) {
                if (oldClass.indexOf(' ' + className[i] + ' ') == -1) {
                    append += ' ' + className[i];
                }
            }
        } else {
            if (oldClass.indexOf(' ' + className + ' ') == -1) {
                append += ' ' + className;
            }
        }
        if (append) {
            node.className = node.className + append;
            return true;
        }
        return false;
    },
    // add class(es) to nodes
    // `nodes` Array of DOM nodes
    // @see `addClass`
    addListClass: function(nodes, className, callback) {
        for (var i = 0; i < nodes.length; i++) {
            this.addClass(nodes[i], className);
            if (callback) {
                callback.call(this, nodes[i]);
            }
        }
    },
    // remove class(es) from node
    // `node` must be valid DOM node
    // `className` String or Array to remove
    // return TRUE if className changed
    removeClass: function(node, className) {
        var oldClass = ' ' + node.className + ' ';
        if (className instanceof Array) {
            for (var i = 0; i < className.length; i++) {
                oldClass = oldClass.replace(' ' + className[i] + ' ', ' ');
            }
        } else {
            oldClass = oldClass.replace(' ' + className + ' ', ' ');
        }
        oldClass = oldClass.substr(1, oldClass.length - 2);
        if (node.className != oldClass) {
            node.className = oldClass;
            return true;
        }
        return false;
    },
    // remove class(es) from nodes
    // `nodes` Array of DOM nodes
    // @see `removeClass`
    removeListClass: function(nodes, className, callback) {
        for (var i = 0; i < nodes.length; i++) {
            this.removeClass(nodes[i], className);
            if (callback) {
                callback.call(this, nodes[i]);
            }
        }
    },
    // toggle node class(es)
    // `node` must be valid DOM node
    // `className` String or Array to toggle
    // `add` TRUE to add them
    // return TRUE if className changed
    toggleClass: function(node, className, add) {
        if (add) {
            return this.addClass(node, className);
        } else {
            return this.removeClass(node, className);
        }
    },
    // toggle nodes class(es)
    // `nodes` Array of DOM nodes
    // @see `toggleClass`
    toggleListClass: function(nodes, className, add, callback) {
        for (var i = 0; i < nodes.length; i++) {
            this.toggleClass(nodes[i], className, add);
            if (callback) {
                callback.call(this, nodes[i]);
            }
        }
    },
    // add/remove and keep old class(es)
    // `node` must be valid DOM node
    // `addClass` String or Array to add
    // `removeClass` String or Array to remove
    // return TRUE if className changed
    addRemoveClass: function(node, addClass, removeClass) {
        var oldClass = ' ' + node.className + ' ';
        if (removeClass) {
            if (removeClass instanceof Array) {
                for (var i = 0; i < removeClass.length; i++) {
                    oldClass = oldClass.replace(' ' + removeClass[i] + ' ', ' ');
                }
            } else {
                oldClass = oldClass.replace(' ' + removeClass + ' ', ' ');
            }
        }
        if (addClass) {
            var append = '';
            if (addClass instanceof Array) {
                for (var i = 0; i < addClass.length; i++) {
                    if (oldClass.indexOf(' ' + addClass[i] + ' ') == -1) {
                        append += addClass[i] + ' ';
                    }
                }
            } else {
                if (oldClass.indexOf(' ' + addClass + ' ') == -1) {
                    append += addClass + ' ';
                }
            }
            oldClass += append;
        }
        oldClass = oldClass.substr(1, oldClass.length - 2);
        if (node.className != oldClass) {
            node.className = oldClass;
            return true;
        }
        return false;
    },
    // add/remove and keep old class(es)
    // `nodes` Array of DOM nodes
    // @see `addRemoveClass`
    addRemoveListClass: function(nodes, addClass, removeClass, callback) {
        for (var i = 0; i < nodes.length; i++) {
            this.addRemoveClass(nodes[i], addClass, removeClass);
            if (callback) {
                callback.call(this, nodes[i]);
            }
        }
    }
};

/*
 * aciTree jQuery Plugin v4.5.0-rc.7
 * http://acoderinsights.ro
 *
 * Copyright (c) 2014 Dragos Ursu
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Require jQuery Library >= v1.9.0 http://jquery.com
 * + aciPlugin >= v1.5.1 https://github.com/dragosu/jquery-aciPlugin
 */

/*
 * The aciTree core.
 *
 * A few words about how item data looks like:
 *
 * for a leaf node (a node that does not have any children):
 *
 * {
 *   id: 'some_file_ID',                // should be unique item ID
 *   label: 'This is a File Item',      // the item label (text value)
 *   inode: false,                      // FALSE means is a leaf node (can be omitted)
 *   icon: 'fileIcon',                  // CSS class name for the icon (if any), can also be an Array ['CSS class name', background-position-x, background-position-y]
 *   disabled: false,                   // TRUE means the item is disabled (can be omitted)
 *   random_prop: 'random 1'            // sample user defined property (you can have any number defined)
 * }
 *
 * for a inner node (a node that have at least a children under it):
 *
 * {
 *   id: 'some_folder_ID',              // should be unique item ID
 *   label: 'This is a Folder Item',    // the item label (text value)
 *   inode: true,                       // can also be NULL to find at runtime if its an inode (on load will be transformed in a leaf node if there aren't any children)
 *   open: false,                       // if TRUE then the node will be opened when the tree is loaded (can be omitted)
 *   icon: 'folderIcon',                // CSS class name for the icon (if any), can also be an Array ['CSS class name', background-position-x, background-position-y]
 *   disabled: false,                   // TRUE means the item is disabled (can be omitted)
 *   source: 'myDataSource',            // the data source name (if any) to read the children from, by default `aciTree.options.ajax` is used
 *   branch: [                          // a list of children
 *      { ... item data ... },
 *      { ... item data ... },
 *      ...
 *   ],
 *   random_prop: 'random 2'            // sample user defined property (you can have any number defined)
 * }
 *
 * The `branch` array can be empty, in this case the children will be loaded when the node will be opened for the first time.
 *
 * Please note that the item data should be valid (in the expected format). No checking is done and errors can appear on invalid data.
 *
 * One note about a item: a item is always the LI element with the class 'aciTreeLi'.
 * The children of a node are all added under a UL element with the class 'aciTreeUl'.
 *
 * Almost all API functions expect only one item. If you need to process more at once then you'll need to loop between all of them yourself.
 *
 * The `options` parameter for all API methods (when there is one) is a object with the properties (not all are required or used):
 *
 * {
 *   uid: string -> operation UID (defaults to `ui`)
 *   success: function (item, options) -> callback to be called on success (you can access plugin API with `this` keyword inside the callback)
 *   fail: function (item, options) -> callback to be called on fail (you can access plugin API with `this` keyword inside the callback)
 *   notify: function (item, options) -> notify callback (internal use for when already in the requested state, will call `success` by default)
 *   expand: true/false -> propagate on open/toggle
 *   collapse: true/false -> propagate on close/toggle
 *   unique: true/false -> should other branches be closed (on open/toggle) ?
 *   unanimated: true/false -> if it's TRUE then no animations are to be run (used on open/close/toggle)
 *   itemData: object[item data]/array[item data] -> used when adding/updating items
 * }
 *
 * Note: when using the API methods that support the `options` parameter, you will need to use the success/fail callbacks if you need to do
 * any processing after the API call. This because there can be async operations that will complete at a later time and the API methods will
 * exit before the job is actually completed. This will happen when items are loaded with AJAX, on animations and other delayed operations (see _queue).
 *
 */

(function($, window, undefined) {

    // default options

    var options = {
        // the AJAX options (see jQuery.ajax) where the `success` and `error` are overridden by aciTree
        ajax: {
            url: null, // URL from where to take the data, something like `path/script?nodeId=` (the node ID value will be added for each request)
            dataType: 'json'
        },
        dataSource: null, // a list of data sources to be used (each entry in `aciTree.options.ajax` format)
        rootData: null, // initial ROOT data for the Tree (if NULL then one initial AJAX request is made on init)
        queue: {
            async: 4, // the number of simultaneous async (AJAX) tasks
            interval: 50, // interval [ms] after which to insert a `delay`
            delay: 20                   // how many [ms] delay between tasks (after `interval` expiration)
        },
        loaderDelay: 500, // how many msec to wait before showing the main loader ? (on lengthy operations)
        expand: false, // if TRUE then all children of a node are expanded when the node is opened
        collapse: false, // if TRUE then all children of a node are collapsed when the node is closed
        unique: false, // if TRUE then a single tree branch will stay open, the oters are closed when a node is opened
        empty: false, // if TRUE then all children of a node are removed when the node is closed
        show: {// show node/ROOT animation (default is slideDown)
            props: {
                'height': 'show'
            },
            duration: 'medium',
            easing: 'linear'
        },
        animateRoot: true, // if the ROOT should be animated on init
        hide: {// hide node animation (default is slideUp)
            props: {
                'height': 'hide'
            },
            duration: 'medium',
            easing: 'linear'
        },
        view: {// scroll item into view animation
            duration: 'medium',
            easing: 'linear'
        },
        // called for each AJAX request when a node needs to be loaded
        // `item` is the item who will be loaded
        // `settings` is the `aciTree.options.ajax` object or an entry from `aciTree.options.dataSource`
        ajaxHook: function(item, settings) {
            // the default implementation changes the URL by adding the item ID at the end
            settings.url += (item ? this.getId(item) : '');
        },
        // called after each item is created but before is inserted into the DOM
        // `parent` is the parent item (can be empty)
        // `item` is the new created item
        // `itemData` is the object used to create the item
        // `level` is the #0 based item level
        itemHook: function(parent, item, itemData, level) {
            // there is no default implementation
        },
        // called for each item to serialize its value
        // `item` is the tree item to be serialized
        // `what` is the option telling what is being serialized
        // `value` is the current serialized value (from the `item`, value type depending of `what`)
        serialize: function(item, what, value) {
            if (typeof what == 'object') {
                return value;
            } else {
                // the default implementation uses a `|` (pipe) character to separate values
                return '|' + value;
            }
        }
    };

    // aciTree plugin core

    var aciTree_core = {
        // add extra data
        __extend: function() {
            $.extend(this._instance, {
                queue: new this._queue(this, this._instance.options.queue) // the global tree queue
            });
            $.extend(this._private, {
                locked: false, // to tell the tree state
                itemClone: {// keep a clone of the LI for faster tree item creation
                },
                // timeouts for the loader
                loaderHide: null,
                loaderInterval: null,
                // busy delay counter
                delayBusy: 0
            });
        },
        // init the treeview
        init: function(options) {
            options = this._options(options);
            // check if was init already
            if (this.wasInit()) {
                this._trigger(null, 'wasinit', options);
                this._fail(null, options);
                return;
            }
            // check if is locked
            if (this.isLocked()) {
                this._trigger(null, 'locked', options);
                this._fail(null, options);
                return;
            }
            // a way to cancel the operation
            if (!this._trigger(null, 'beforeinit', options)) {
                this._trigger(null, 'initfail', options);
                this._fail(null, options);
                return;
            }
            this._private.locked = true;
            this._instance.jQuery.addClass('aciTree' + this._instance.index).attr('role', 'tree').on('click' + this._instance.nameSpace, '.aciTreeButton', this.proxy(function(e) {
                // process click on button
                var item = this.itemFrom(e.target);
                // skip when busy
                if (!this.isBusy(item)) {
                    // tree button pressed
                    this.toggle(item, {
                        collapse: this._instance.options.collapse,
                        expand: this._instance.options.expand,
                        unique: this._instance.options.unique
                    });
                }
            })).on('mouseenter' + this._instance.nameSpace + ' mouseleave' + this._instance.nameSpace, '.aciTreePush', function(e) {
                // handle the aciTreeHover class
                var element = e.target;
                if (!domApi.hasClass(element, 'aciTreePush')) {
                    element = domApi.parentByClass(element, 'aciTreePush');
                }
                domApi.toggleClass(element, 'aciTreeHover', e.type == 'mouseenter');
            }).on('mouseenter' + this._instance.nameSpace + ' mouseleave' + this._instance.nameSpace, '.aciTreeLine', function(e) {
                // handle the aciTreeHover class
                var element = e.target;
                if (!domApi.hasClass(element, 'aciTreeLine')) {
                    element = domApi.parentByClass(element, 'aciTreeLine');
                }
                domApi.toggleClass(element, 'aciTreeHover', e.type == 'mouseenter');
            });
            this._initHook();
            // call on success
            var success = this.proxy(function() {
                // call the parent
                this._super();
                this._private.locked = false;
                this._trigger(null, 'init', options);
                this._success(null, options);
            });
            // call on fail
            var fail = this.proxy(function() {
                // call the parent
                this._super();
                this._private.locked = false;
                this._trigger(null, 'initfail', options);
                this._fail(null, options);
            });
            if (this._instance.options.rootData) {
                // the rootData was set, use it to init the tree
                this.loadFrom(null, this._inner(options, {
                    success: success,
                    fail: fail,
                    itemData: this._instance.options.rootData
                }));
            } else if (this._instance.options.ajax.url) {
                // the AJAX url was set, init with AJAX
                this.ajaxLoad(null, this._inner(options, {
                    success: success,
                    fail: fail
                }));
            } else {
                success.apply(this);
            }
        },
        _initHook: function() {
            // override this to do extra init
        },
        // check locked state
        isLocked: function() {
            return this._private.locked;
        },
        // get a formatted message
        // `raw` is the raw message text (can contain %NUMBER sequences, replaced with values from `params`)
        // `params` is a list of values to be replaced into the message (by #0 based index)
        _format: function(raw, params) {
            if (!(params instanceof Array)) {
                return raw;
            }
            var parts = raw.split(/(%[0-9]+)/gm);
            var compile = '', part, index, last = false, len;
            var test = new window.RegExp('^%[0-9]+$');
            for (var i = 0; i < parts.length; i++) {
                part = parts[i];
                len = part.length;
                if (len) {
                    if (!last && test.test(part)) {
                        index = window.parseInt(part.substr(1)) - 1;
                        if ((index >= 0) && (index < params.length)) {
                            compile += params[index];
                            continue;
                        }
                    } else {
                        last = false;
                        if (part.substr(len - 1) == '%') {
                            if (part.substr(len - 2) != '%%') {
                                last = true;
                            }
                            part = part.substr(0, len - 1);
                        }
                    }
                    compile += part;
                }
            }
            return compile;
        },
        // low level DOM functions
        _coreDOM: {
            // set as leaf node
            leaf: function(items) {
                domApi.addRemoveListClass(items.toArray(), 'aciTreeLeaf', ['aciTreeInode', 'aciTreeInodeMaybe', 'aciTreeOpen'], function(node) {
                    node.firstChild.removeAttribute('aria-expanded');
                });
            },
            // set as inner node
            inode: function(items, branch) {
                domApi.addRemoveListClass(items.toArray(), branch ? 'aciTreeInode' : 'aciTreeInodeMaybe', 'aciTreeLeaf', function(node) {
                    node.firstChild.setAttribute('aria-expanded', false);
                });
            },
            // set as open/closed
            toggle: function(items, state) {
                domApi.toggleListClass(items.toArray(), 'aciTreeOpen', state, function(node) {
                    node.firstChild.setAttribute('aria-expanded', state);
                });
            },
            // set odd/even classes
            oddEven: function(items, odd) {
                var list = items.toArray();
                for (var i = 0; i < list.length; i++) {
                    domApi.addRemoveClass(list[i], odd ? 'aciTreeOdd' : 'aciTreeEven', odd ? 'aciTreeEven' : 'aciTreeOdd');
                    odd = !odd;
                }
            }
        },
        // a small queue implementation
        // `context` the context to be used with `callback.call`
        // `options` are the queue options
        _queue: function(context, options) {
            var locked = false;
            var fifo = [], fifoAsync = [];
            var load = 0, loadAsync = 0, schedule = 0, stack = 0;
            // run the queue
            var run = function() {
                if (locked) {
                    stack--;
                    return;
                }
                var now = new window.Date().getTime();
                if (schedule > now) {
                    stack--;
                    return;
                }
                var callback, async = false;
                if (load < options.async * 2) {
                    // get the next synchronous callback
                    callback = fifo.shift();
                }
                if (!callback && (loadAsync < options.async)) {
                    // get the next async callback
                    callback = fifoAsync.shift();
                    async = true;
                }
                if (callback) {
                    // run the callback
                    if (async) {
                        loadAsync++;
                        callback.call(context, function() {
                            loadAsync--;
                        });
                        if (stack < 40) {
                            stack++;
                            run();
                        }
                    } else {
                        load++;
                        callback.call(context, function() {
                            if (now - schedule > options.interval) {
                                schedule = now + options.delay;
                            }
                            load--;
                            if (stack < 40) {
                                stack++;
                                run();
                            }
                        });
                    }
                }
                stack--;
            };
            var interval = [];
            // start the queue
            var start = function() {
                for (var i = 0; i < 4; i++) {
                    interval[i] = window.setInterval(function() {
                        if (stack < 20) {
                            stack++;
                            run();
                        }
                    }, 10);
                }
            };
            // stop the queue
            var stop = function() {
                for (var i = 0; i < interval.length; i++) {
                    window.clearInterval(interval[i]);
                }
            };
            start();
            // init the queue
            this.init = function() {
                this.destroy();
                start();
                return this;
            };
            // push `callback` function (complete) for later call
            // `async` tells if is async callback
            this.push = function(callback, async) {
                if (!locked) {
                    if (async) {
                        fifoAsync.push(callback);
                    } else {
                        fifo.push(callback);
                    }
                }
                return this;
            };
            // test if busy
            this.busy = function() {
                return (load != 0) || (loadAsync != 0) || (fifo.length != 0) || (fifoAsync.length != 0);
            };
            // destroy queue
            this.destroy = function() {
                locked = true;
                stop();
                fifo = [];
                fifoAsync = [];
                load = 0;
                loadAsync = 0;
                schedule = 0;
                stack = 0;
                locked = false;
                return this;
            };
        },
        // used with a `queue` to execute something at the end
        // `endCallback` function (complete) is the callback called at the end
        _task: function(queue, endCallback) {
            var counter = 0, finish = false;
            // push a `callback` function (complete) for later call
            this.push = function(callback, async) {
                counter++;
                queue.push(function(complete) {
                    var context = this;
                    callback.call(this, function() {
                        counter--;
                        if ((counter < 1) && !finish) {
                            finish = true;
                            endCallback.call(context, complete);
                        } else {
                            complete();
                        }
                    });
                }, async);
            };
        },
        // helper function to extend the `options` object
        // `object` the initial options object
        // _success, _fail, _notify are callbacks or string (the event name to be triggered)
        // `item` is the item to trigger events for
        _options: function(object, _success, _fail, _notify, item) {
            // options object (need to be in this form for all API functions
            // that have the `options` parameter, not all properties are required)
            var options = $.extend({
                uid: 'ui',
                success: null, // success callback
                fail: null, // fail callback
                notify: null, // notify callback (internal use for when already in the requested state)
                expand: this._instance.options.expand, // propagate (on open)
                collapse: this._instance.options.collapse, // propagate (on close)
                unique: this._instance.options.unique, // keep a single branch open (on open)
                unanimated: false, // unanimated (open/close/toggle)
                itemData: {
                } // items data (object) or a list (array) of them (used when creating branches)
            },
            object);
            var success = _success ? ((typeof _success == 'string') ? function() {
                this._trigger(item, _success, options);
            } : _success) : null;
            var fail = _fail ? ((typeof _fail == 'string') ? function() {
                this._trigger(item, _fail, options);
            } : _fail) : null;
            var notify = _notify ? ((typeof _notify == 'string') ? function() {
                this._trigger(item, _notify, options);
            } : _notify) : null;
            if (success) {
                // success callback
                if (object && object.success) {
                    options.success = function() {
                        success.apply(this, arguments);
                        object.success.apply(this, arguments);
                    };
                } else {
                    options.success = success;
                }
            }
            if (fail) {
                // fail callback
                if (object && object.fail) {
                    options.fail = function() {
                        fail.apply(this, arguments);
                        object.fail.apply(this, arguments);
                    };
                } else {
                    options.fail = fail;
                }
            }
            if (notify) {
                // notify callback
                if (object && object.notify) {
                    options.notify = function() {
                        notify.apply(this, arguments);
                        object.notify.apply(this, arguments);
                    };
                } else if (!options.notify && object && object.success) {
                    options.notify = function() {
                        notify.apply(this, arguments);
                        object.success.apply(this, arguments);
                    };
                } else {
                    options.notify = notify;
                }
            } else if (!options.notify && object && object.success) {
                // by default, run success callback
                options.notify = object.success;
            }
            return options;
        },
        // helper for passing `options` object to inner methods
        // the callbacks are removed and `override` can be used to update properties
        _inner: function(options, override) {
            // removing success/fail/notify from options
            return $.extend({
            }, options, {
                success: null,
                fail: null,
                notify: null
            },
            override);
        },
        // trigger the aciTree events on the tree container
        _trigger: function(item, eventName, options) {
            var event = $.Event('acitree');
            if (!options) {
                options = this._options();
            }
            this._instance.jQuery.trigger(event, [this, item, eventName, options]);
            return !event.isDefaultPrevented();
        },
        // call on success
        _success: function(item, options) {
            if (options && options.success) {
                options.success.call(this, item, options);
            }
        },
        // call on fail
        _fail: function(item, options) {
            if (options && options.fail) {
                options.fail.call(this, item, options);
            }
        },
        // call on notify (should be same as `success` but called when already in the requested state)
        _notify: function(item, options) {
            if (options && options.notify) {
                options.notify.call(this, item, options);
            }
        },
        // delay callback on busy item
        _delayBusy: function(item, callback) {
            if ((this._private.delayBusy < 10) && this.isBusy(item)) {
                this._private.delayBusy++;
                window.setTimeout(this.proxy(function() {
                    this._delayBusy.call(this, item, callback);
                    this._private.delayBusy--;
                }), 10);
                return;
            }
            callback.apply(this);
        },
        // return the data source for item
        // defaults to `aciTree.options.ajax` if not set on the item/his parents
        _dataSource: function(item) {
            var dataSource = this._instance.options.dataSource;
            if (dataSource) {
                var data = this.itemData(item);
                if (data && data.source && dataSource[data.source]) {
                    return dataSource[data.source];
                }
                var parent;
                do {
                    parent = this.parent(item);
                    data = this.itemData(parent);
                    if (data && data.source && dataSource[data.source]) {
                        return dataSource[data.source];
                    }
                } while (parent.length);
            }
            return this._instance.options.ajax;
        },
        // process item loading with AJAX
        // `item` can be NULL to load the ROOT
        // loaded data need to be array of item objects
        // each item can have children (defined as `itemData.branch` - array of item data objects)
        ajaxLoad: function(item, options) {
            if (item && this.isBusy(item)) {
                // delay the load if busy
                this._delayBusy(item, function() {
                    this.ajaxLoad(item, options);
                });
                return;
            }
            options = this._options(options, function() {
                this._loading(item);
                this._trigger(item, 'loaded', options);
            }, function() {
                this._loading(item);
                this._trigger(item, 'loadfail', options);
            }, function() {
                this._loading(item);
                this._trigger(item, 'wasloaded', options);
            });
            if (!item || this.isInode(item)) {
                // add the task to the queue
                this._instance.queue.push(function(complete) {
                    // a way to cancel the operation
                    if (!this._trigger(item, 'beforeload', options)) {
                        this._fail(item, options);
                        complete();
                        return;
                    }
                    this._loading(item, true);
                    if (this.wasLoad(item)) {
                        // was load already
                        this._notify(item, options);
                        complete();
                        return;
                    }
                    // ensure we work on a copy of the dataSource object
                    var settings = $.extend({
                    }, this._dataSource(item));
                    // call the `aciTree.options.ajaxHook`
                    this._instance.options.ajaxHook.call(this, item, settings);
                    // loaded data need to be array of item objects
                    settings.success = this.proxy(function(itemList) {
                        if (itemList && (itemList instanceof Array) && itemList.length) {
                            // the AJAX returned some items
                            var process = function() {
                                if (this.wasLoad(item)) {
                                    this._notify(item, options);
                                    complete();
                                } else {
                                    // create a branch from `itemList`
                                    this._createBranch(item, this._inner(options, {
                                        success: function() {
                                            this._success(item, options);
                                            complete();
                                        },
                                        fail: function() {
                                            this._fail(item, options);
                                            complete();
                                        },
                                        itemData: itemList
                                    }));
                                }
                            };
                            if (!item || this.isInode(item)) {
                                process.apply(this);
                            } else {
                                // change the item to inode, then load
                                this.setInode(item, this._inner(options, {
                                    success: process,
                                    fail: options.fail
                                }));
                            }
                        } else {
                            // the AJAX response was not just right (or not a inode)
                            var process = function() {
                                this._fail(item, options);
                                complete();
                            };
                            if (!item || this.isLeaf(item)) {
                                process.apply(this);
                            } else {
                                // change the item to leaf
                                this.setLeaf(item, this._inner(options, {
                                    success: process,
                                    fail: process
                                }));
                            }
                        }
                    });
                    settings.error = this.proxy(function() {
                        // AJAX failed
                        this._fail(item, options);
                        complete();
                    });
                    $.ajax(settings);
                }, true);
            } else {
                this._fail(item, options);
            }
        },
        // process item loading
        // `item` can be NULL to load the ROOT
        // `options.itemData` need to be array of item objects
        // each item can have children (defined as `itemData.branch` - array of item data objects)
        loadFrom: function(item, options) {
            if (item && this.isBusy(item)) {
                // delay the load if busy
                this._delayBusy(item, function() {
                    this.loadFrom(item, options);
                });
                return;
            }
            options = this._options(options, function() {
                this._loading(item);
                this._trigger(item, 'loaded', options);
            }, function() {
                this._loading(item);
                this._trigger(item, 'loadfail', options);
            }, function() {
                this._loading(item);
                this._trigger(item, 'wasloaded', options);
            });
            if (!item || this.isInode(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeload', options)) {
                    this._fail(item, options);
                    return;
                }
                this._loading(item, true);
                if (this.wasLoad(item)) {
                    // was load already
                    this._notify(item, options);
                    return;
                }
                // data need to be array of item objects
                if (options.itemData && (options.itemData instanceof Array) && options.itemData.length) {
                    // create the branch from `options.itemData`
                    var process = function() {
                        if (this.wasLoad(item)) {
                            this._notify(item, options);
                        } else {
                            this._createBranch(item, options);
                        }
                    };
                    if (!item || this.isInode(item)) {
                        process.apply(this);
                    } else {
                        // change the item to inode, then create children
                        this.setInode(item, this._inner(options, {
                            success: process,
                            fail: options.fail
                        }));
                    }
                } else {
                    // this is not a inode
                    if (!item || this.isLeaf(item)) {
                        this._fail(item, options);
                    } else {
                        // change the item to leaf
                        this.setLeaf(item, this._inner(options, {
                            success: options.fail,
                            fail: options.fail
                        }));
                    }
                }
            } else {
                this._fail(item, options);
            }
        },
        // unload item
        // `item` can be NULL to unload the entire tree
        unload: function(item, options) {
            options = this._options(options, function() {
                this._loading(item);
                this._trigger(item, 'unloaded', options);
            }, function() {
                this._loading(item);
                this._trigger(item, 'unloadfail', options);
            }, function() {
                this._loading(item);
                this._trigger(item, 'notloaded', options);
            });
            if (!item || this.isInode(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeunload', options)) {
                    this._fail(item, options);
                    return;
                }
                this._loading(item, true);
                if (!this.wasLoad(item)) {
                    // if was not loaded
                    this._notify(item, options);
                    return;
                }
                // first check each children
                var cancel = false;
                var children = this.children(item, true, true);
                children.each(this.proxy(function(element) {
                    var item = $(element);
                    if (this.isInode(item)) {
                        if (this.isOpen(item)) {
                            // a way to cancel the operation
                            if (!this._trigger(item, 'beforeclose', options)) {
                                cancel = true;
                                return false;
                            }
                        }
                        if (this.wasLoad(item)) {
                            // a way to cancel the operation
                            if (!this._trigger(item, 'beforeunload', options)) {
                                cancel = true;
                                return false;
                            }
                        }
                    }
                    // a way to cancel the operation
                    if (!this._trigger(item, 'beforeremove', options)) {
                        cancel = true;
                        return false;
                    }
                }, true));
                if (cancel) {
                    // it was canceled
                    this._fail(item, options);
                    return;
                }
                var process = function() {
                    children.each(this.proxy(function(element) {
                        // trigger the events before DOM changes
                        var item = $(element);
                        if (this.isInode(item)) {
                            if (this.isOpen(item)) {
                                this._trigger(item, 'closed', options);
                            }
                            if (this.wasLoad(item)) {
                                this._trigger(item, 'unloaded', options);
                            }
                        }
                        this._trigger(item, 'removed', options);
                    }, true));
                };
                // process the child remove
                if (item) {
                    if (this.isOpen(item)) {
                        // first close the item, then remove children
                        this.close(item, this._inner(options, {
                            success: function() {
                                process.call(this);
                                this._removeContainer(item);
                                this._success(item, options);
                            },
                            fail: options.fail
                        }));
                    } else {
                        process.call(this);
                        this._removeContainer(item);
                        this._success(item, options);
                    }
                } else {
                    // unload the ROOT
                    this._animate(item, false, !this._instance.options.animateRoot || options.unanimated, function() {
                        process.call(this);
                        this._removeContainer();
                        this._success(item, options);
                    });
                }
            } else {
                this._fail(item, options);
            }
        },
        // remove item
        remove: function(item, options) {
            if (this.isItem(item)) {
                if (this.hasSiblings(item, true)) {
                    options = this._options(options, function() {
                        if (this.isOpenPath(item)) {
                            // if the parents are opened (visible) update the item states
                            domApi.removeClass(item[0], 'aciTreeVisible');
                            this._setOddEven(item);
                        }
                        this._trigger(item, 'removed', options);
                    }, 'removefail', null, item);
                    // a way to cancel the operation
                    if (!this._trigger(item, 'beforeremove', options)) {
                        this._fail(item, options);
                        return;
                    }
                    if (this.wasLoad(item)) {
                        // unload the inode then remove
                        this.unload(item, this._inner(options, {
                            success: function() {
                                this._success(item, options);
                                this._removeItem(item);
                            },
                            fail: options.fail
                        }));
                    } else {
                        // just remove the item
                        this._success(item, options);
                        this._removeItem(item);
                    }
                } else {
                    var parent = this.parent(item);
                    if (parent.length) {
                        this.setLeaf(parent, options);
                    } else {
                        this.unload(null, options);
                    }
                }
            } else {
                this._trigger(item, 'removefail', options)
                this._fail(item, options);
            }
        },
        // open item children
        _openChildren: function(item, options) {
            if (options.expand) {
                var queue = this._instance.queue;
                // process the children inodes
                this.inodes(this.children(item)).each(function() {
                    var item = $(this);
                    // queue node opening
                    queue.push(function(complete) {
                        this.open(item, this._inner(options));
                        complete();
                    });
                });
                queue.push(function(complete) {
                    this._success(item, options);
                    complete();
                });
            } else {
                this._success(item, options);
            }
        },
        // process item open
        _openItem: function(item, options) {
            if (!options.unanimated && !this.isVisible(item)) {
                options.unanimated = true;
            }
            if (options.unique) {
                // close other opened nodes
                this.closeOthers(item);
                options.unique = false;
            }
            // open the node
            this._coreDOM.toggle(item, true);
            // (temporarily) update children states
            this._setOddEvenChildren(item);
            this._animate(item, true, options.unanimated, function() {
                this._openChildren(item, options);
            });
        },
        // open item and his children if requested
        open: function(item, options) {
            options = this._options(options, function() {
                if (this.isOpenPath(item)) {
                    // if all parents are open, update the items after
                    this._updateVisible(item);
                    this._setOddEven(item);
                }
                this._trigger(item, 'opened', options);
            }, 'openfail', 'wasopened', item);
            if (this.isInode(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeopen', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isOpen(item)) {
                    options.success = options.notify;
                    // propagate/open children (if required)
                    this._openChildren(item, options);
                } else {
                    if (this.wasLoad(item)) {
                        this._openItem(item, options);
                    } else {
                        // try to load the node, then open
                        this.ajaxLoad(item, this._inner(options, {
                            success: function() {
                                this._openItem(item, options);
                            },
                            fail: options.fail
                        }));
                    }
                }
            } else {
                this._fail(item, options);
            }
        },
        // close item children
        _closeChildren: function(item, options) {
            if (this._instance.options.empty) {
                // unload on close
                options.unanimated = true;
                this.unload(item, options);
            } else if (options.collapse) {
                var queue = this._instance.queue;
                // process the children inodes
                this.inodes(this.children(item)).each(function() {
                    var item = $(this);
                    // queue node close
                    queue.push(function(complete) {
                        this.close(item, this._inner(options, {
                            unanimated: true
                        }));
                        complete();
                    });
                });
                queue.push(function(complete) {
                    this._success(item, options);
                    complete();
                });
            } else {
                this._success(item, options);
            }
        },
        // process item close
        _closeItem: function(item, options) {
            if (!options.unanimated && !this.isVisible(item)) {
                options.unanimated = true;
            }
            // close the item
            this._coreDOM.toggle(item, false);
            this._animate(item, false, options.unanimated, function() {
                this._closeChildren(item, options);
            });
        },
        // close item and his children if requested
        close: function(item, options) {
            options = this._options(options, function() {
                if (this.isOpenPath(item)) {
                    // if all parents are open, update the items after
                    this._updateVisible(item);
                    this._setOddEven(item);
                }
                this._trigger(item, 'closed', options);
            }, 'closefail', 'wasclosed', item);
            if (this.isInode(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeclose', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isOpen(item)) {
                    this._closeItem(item, options);
                } else if (this.wasLoad(item)) {
                    options.success = options.notify;
                    // propagate/close/empty children (if required)
                    this._closeChildren(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // update visible state
        _updateVisible: function(item) {
            if (this.isOpenPath(item)) {
                if (!this.isHidden(item)) {
                    // if open parents and not hidden
                    domApi.addClass(item[0], 'aciTreeVisible');
                    if (this.isOpen(item)) {
                        // process children
                        domApi.children(item[0], false, this.proxy(function(node) {
                            if (!domApi.hasClass(node, 'aciTreeVisible')) {
                                this._updateVisible($(node));
                            }
                        }));
                    } else {
                        // children are not visible
                        domApi.children(item[0], true, function(node) {
                            return domApi.removeClass(node, 'aciTreeVisible') ? true : null;
                        });
                    }
                }
            } else if (domApi.removeClass(item[0], 'aciTreeVisible')) {
                domApi.children(item[0], true, function(node) {
                    return domApi.removeClass(node, 'aciTreeVisible') ? true : null;
                });
            }
        },
        // keep just one branch open
        closeOthers: function(item, options) {
            options = this._options(options);
            if (this.isItem(item)) {
                var queue = this._instance.queue;
                // exclude the item and his parents
                var exclude = item.add(this.path(item)).add(this.children(item, true));
                // close all other open nodes
                this.inodes(this.children(null, true, true), true).not(exclude).each(function() {
                    var item = $(this);
                    // add node to close queue
                    queue.push(function(complete) {
                        this.close(item, this._inner(options));
                        complete();
                    });
                });
                queue.push(function(complete) {
                    this._success(item, options);
                    complete();
                });
            } else {
                this._fail(item, options);
            }
        },
        // toggle item
        toggle: function(item, options) {
            options = this._options(options, 'toggled', 'togglefail', null, item);
            if (this.isInode(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforetoggle', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isOpen(item)) {
                    this.close(item, options);
                } else {
                    this.open(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // get item path starting from the top parent (ROOT)
        // when `reverse` is TRUE returns the path in reverse order
        path: function(item, reverse) {
            if (item) {
                var parent = item[0], list = [];
                while (parent = domApi.parent(parent)) {
                    list.push(parent);
                }
                return reverse ? $(list) : $(list.reverse());
            }
            return $([]);
        },
        // test if item is in view
        // when `center` is TRUE will test if is centered in view
        isVisible: function(item, center) {
            if (item && domApi.hasClass(item[0], 'aciTreeVisible')) {
                // the item path need to be open
                var rect = this._instance.jQuery[0].getBoundingClientRect();
                var size = item[0].firstChild;
                var test = size.getBoundingClientRect();
                var height = size.offsetHeight;
                var offset = center ? (rect.bottom - rect.top) / 2 : 0;
                if ((test.bottom - height < rect.top + offset) || (test.top + height > rect.bottom - offset)) {
                    // is out of view
                    return false;
                }
                return true;
            }
            return false;
        },
        // open path to item
        openPath: function(item, options) {
            options = this._options(options);
            if (this.isItem(item)) {
                var queue = this._instance.queue;
                // process closed inodes
                this.inodes(this.path(item), false).each(function() {
                    var item = $(this);
                    // add node to open queue
                    queue.push(function(complete) {
                        this.open(item, this._inner(options));
                        complete();
                    });
                });
                queue.push(function(complete) {
                    this._success(item, options);
                    complete();
                });
            } else {
                this._fail(item, options);
            }
        },
        // test if path to item is open
        isOpenPath: function(item) {
            var parent = this.parent(item);
            return parent[0] ? this.isOpen(parent) && domApi.hasClass(parent[0], 'aciTreeVisible') : true;
        },
        // get animation speed vs. offset size
        // `speed` is the raw speed
        // `totalSize` is the available size
        // `required` is the offset used for calculations
        _speedFraction: function(speed, totalSize, required) {
            if ((required < totalSize) && totalSize) {
                var numeric = parseInt(speed);
                if (isNaN(numeric)) {
                    // predefined string values
                    switch (speed) {
                        case 'slow':
                            numeric = 600;
                            break;
                        case 'medium':
                            numeric = 400;
                            break;
                        case 'fast':
                            numeric = 200;
                            break;
                        default:
                            return speed;
                    }
                }
                return numeric * required / totalSize;
            }
            return speed;
        },
        // bring item in view
        // `options.center` says if should be centered in view
        setVisible: function(item, options) {
            options = this._options(options, 'visible', 'visiblefail', 'wasvisible', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforevisible', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isVisible(item)) {
                    // is visible already
                    this._notify(item, options);
                    return;
                }
                var process = function() {
                    // compute position with getBoundingClientRect
                    var rect = this._instance.jQuery[0].getBoundingClientRect();
                    var size = item[0].firstChild;
                    var test = size.getBoundingClientRect();
                    var height = size.offsetHeight;
                    var offset = options.center ? (rect.bottom - rect.top) / 2 : 0;
                    if (test.bottom - height < rect.top + offset) {
                        // item somewhere before the first visible
                        var diff = rect.top + offset - test.bottom + height;
                        if (!options.unanimated && this._instance.options.view) {
                            this._instance.jQuery.stop(true).animate({
                                scrollTop: this._instance.jQuery.scrollTop() - diff
                            },
                            {
                                duration: this._speedFraction(this._instance.options.view.duration, rect.bottom - rect.top, diff),
                                easing: this._instance.options.view.easing,
                                complete: this.proxy(function() {
                                    this._success(item, options);
                                })
                            });
                        } else {
                            this._instance.jQuery.stop(true)[0].scrollTop = this._instance.jQuery.scrollTop() - diff;
                            this._success(item, options);
                        }
                    } else if (test.top + height > rect.bottom - offset) {
                        // item somewhere after the last visible
                        var diff = test.top - rect.bottom + offset + height;
                        if (!options.unanimated && this._instance.options.view) {
                            this._instance.jQuery.stop(true).animate({
                                scrollTop: this._instance.jQuery.scrollTop() + diff
                            },
                            {
                                duration: this._speedFraction(this._instance.options.view.duration, rect.bottom - rect.top, diff),
                                easing: this._instance.options.view.easing,
                                complete: this.proxy(function() {
                                    this._success(item, options);
                                })
                            });
                        } else {
                            this._instance.jQuery.stop(true)[0].scrollTop = this._instance.jQuery.scrollTop() + diff;
                            this._success(item, options);
                        }
                    } else {
                        this._success(item, options);
                    }
                };
                if (this.hasParent(item)) {
                    // first we need to open the path to item
                    this.openPath(item, this._inner(options, {
                        success: process,
                        fail: options.fail
                    }));
                } else {
                    process.apply(this);
                }
            } else {
                this._fail(item, options);
            }
        },
        // test if item has parent
        hasParent: function(item) {
            return this.parent(item).length > 0;
        },
        // get item parent
        parent: function(item) {
            return item ? $(domApi.parent(item[0])) : $([]);
        },
        // get item top (ROOT) parent
        topParent: function(item) {
            return this.path(item).eq(0);
        },
        // create tree branch
        // `options.itemData` need to be in the same format as for .append
        _createBranch: function(item, options) {
            var total = 0;
            var count = function(itemList) {
                var itemData;
                for (var i = 0; i < itemList.length; i++) {
                    itemData = itemList[i];
                    if (itemData.branch && (itemData.branch instanceof Array) && itemData.branch.length) {
                        count(itemData.branch);
                    }
                }
                total++;
            };
            count(options.itemData);
            var index = 0;
            var complete = this.proxy(function() {
                index++;
                if (index >= total) {
                    this._success(item, options);
                }
            });
            var process = this.proxy(function(node, itemList) {
                if (node) {
                    // set it as a inode
                    domApi.addRemoveClass(node[0], 'aciTreeInode', 'aciTreeInodeMaybe');
                }
                // use .append to add new items
                this.append(node, this._inner(options, {
                    success: function(item, options) {
                        var itemData;
                        for (var i = 0; i < options.itemData.length; i++) {
                            itemData = options.itemData[i];
                            // children need to be array of item objects
                            if (itemData.branch && (itemData.branch instanceof Array) && itemData.branch.length) {
                                process(options.items.eq(i), itemData.branch);
                            }
                            if (itemData.open) {
                                // open the item is requuested
                                this.open(options.items.eq(i), this._inner(options, {
                                    itemData: null,
                                    items: null
                                }));
                            }
                        }
                        complete();
                    },
                    fail: options.fail,
                    itemData: itemList
                }));
            });
            process(item, options.itemData);
        },
        // get first/last items
        _getFirstLast: function(parent) {
            if (!parent) {
                parent = this._instance.jQuery;
            }
            return $(domApi.withAnyClass(domApi.children(parent[0]), ['aciTreeFirst', 'aciTreeLast']));
        },
        // update first/last items
        _setFirstLast: function(parent, clear) {
            if (clear) {
                domApi.removeListClass(clear.toArray(), ['aciTreeFirst', 'aciTreeLast']);
            }
            var first = this.first(parent);
            if (first[0]) {
                domApi.addClass(first[0], 'aciTreeFirst');
                domApi.addClass(this.last(parent)[0], 'aciTreeLast');
            }
        },
        // update odd/even state
        _setOddEven: function(items) {
            // consider only visible items
            var visible;
            if (this._instance.jQuery[0].getElementsByClassName) {
                visible = this._instance.jQuery[0].getElementsByClassName('aciTreeVisible');
                visible = visible ? window.Array.prototype.slice.call(visible) : [];
            } else {
                visible = $(domApi.children(this._instance.jQuery[0], true, function(node) {
                    return this.hasClass(node, 'aciTreeVisible') ? true : null;
                }));
            }
            var odd = true;
            if (visible.length) {
                var index = 0;
                if (items) {
                    // search the item to start with (by index)
                    items.each(function() {
                        if (visible.indexOf) {
                            var found = visible.indexOf(this);
                            if (found != -1) {
                                index = window.Math.min(found, index);
                            }
                        } else {
                            for (var i = 0; i < visible.length; i++) {
                                if (visible[i] === this) {
                                    index = window.Math.min(i, index);
                                    break;
                                }
                            }
                        }
                    });
                    index = window.Math.max(index - 1, 0);
                }
                if (index > 0) {
                    // determine with what to start with (odd/even)
                    var first = visible[index];
                    if (domApi.hasClass(first, 'aciTreOdd')) {
                        odd = false;
                    }
                    // process only after index
                    visible = visible.slice(index + 1);
                }
            }
            this._coreDOM.oddEven($(visible), odd);
        },
        // update odd/even state for direct children
        _setOddEvenChildren: function(item) {
            var odd = domApi.hasClass(item[0], 'aciTreeOdd');
            var children = this.children(item);
            this._coreDOM.oddEven(children, !odd);
        },
        // process item before inserting into the DOM
        _itemHook: function(parent, item, itemData, level) {
            if (this._instance.options.itemHook) {
                this._instance.options.itemHook.apply(this, arguments);
            }
        },
        // create item by `itemData`
        // `level` is the #0 based item level
        _createItem: function(itemData, level) {
            if (this._private.itemClone[level]) {
                var li = this._private.itemClone[level].cloneNode(true);
                var line = li.firstChild;
                var icon = line;
                for (var i = 0; i < level; i++) {
                    icon = icon.firstChild;
                }
                icon = icon.firstChild.lastChild.firstChild;
                var text = icon.nextSibling;
            } else {
                var li = window.document.createElement('LI');
                li.setAttribute('role', 'presentation');
                var line = window.document.createElement('DIV');
                li.appendChild(line);
                line.setAttribute('tabindex', -1);
                line.setAttribute('role', 'treeitem');
                line.setAttribute('aria-selected', false);
                line.className = 'aciTreeLine';
                var last = line, branch;
                for (var i = 0; i < level; i++) {
                    branch = window.document.createElement('DIV');
                    last.appendChild(branch);
                    branch.className = 'aciTreeBranch aciTreeLevel' + i;
                    last = branch;
                }
                var entry = window.document.createElement('DIV');
                last.appendChild(entry);
                entry.className = 'aciTreeEntry';
                var button = window.document.createElement('SPAN');
                entry.appendChild(button);
                button.className = 'aciTreeButton';
                var push = window.document.createElement('SPAN');
                button.appendChild(push);
                push.className = 'aciTreePush';
                push.appendChild(window.document.createElement('SPAN'));
                var item = window.document.createElement('SPAN');
                entry.appendChild(item);
                item.className = 'aciTreeItem';
                var icon = window.document.createElement('SPAN');
                item.appendChild(icon);
                var text = window.document.createElement('SPAN');
                item.appendChild(text);
                text.className = 'aciTreeText';
                this._private.itemClone[level] = li.cloneNode(true);
            }
            li.className = 'aciTreeLi' + (itemData.inode || (itemData.inode === null) ? (itemData.inode || (itemData.branch && itemData.branch.length) ? ' aciTreeInode' : ' aciTreeInodeMaybe') : ' aciTreeLeaf') + ' aciTreeLevel' + level + (itemData.disabled ? ' aciTreeDisabled' : '');
            line.setAttribute('aria-level', level + 1);
            if (itemData.inode || (itemData.inode === null)) {
                line.setAttribute('aria-expanded', false);
            }
            if (itemData.icon) {
                if (itemData.icon instanceof Array) {
                    icon.className = 'aciTreeIcon ' + itemData.icon[0];
                    icon.style.backgroundPosition = itemData.icon[1] + 'px ' + itemData.icon[2] + 'px';
                } else {
                    icon.className = 'aciTreeIcon ' + itemData.icon;
                }
            } else {
                icon.parentNode.removeChild(icon);
            }
            text.innerHTML = itemData.label;
            var $li = $(li);
            $li.data('itemData' + this._instance.nameSpace, $.extend({
            }, itemData, {
                branch: itemData.branch && itemData.branch.length
            }));
            return $li;
        },
        // remove item
        _removeItem: function(item) {
            var parent = this.parent(item);
            item.remove();
            // update sibling state
            this._setFirstLast(parent.length ? parent : null);
        },
        // create & add one or more items
        // `ul`, `before` and `after` are set depending on the caller
        // `itemData` need to be array of objects or just an object (one item)
        // `level` is the #0 based level
        // `callback` function (items) is called at the end of the operation
        _createItems: function(ul, before, after, itemData, level, callback) {
            var items = [], fragment = window.document.createDocumentFragment();
            var task = new this._task(this._instance.queue, function(complete) {
                items = $(items);
                if (items.length) {
                    // add the new items
                    if (ul) {
                        ul[0].appendChild(fragment);
                    } else if (before) {
                        before[0].parentNode.insertBefore(fragment, before[0]);
                    } else if (after) {
                        after[0].parentNode.insertBefore(fragment, after[0].nextSibling);
                    }
                }
                callback.call(this, items);
                complete();
            });
            if (itemData) {
                this._loader(true);
                var parent;
                if (ul) {
                    parent = this.itemFrom(ul);
                } else if (before) {
                    parent = this.parent(before);
                } else if (after) {
                    parent = this.parent(after);
                }
                if (itemData instanceof Array) {
                    // this is a list of items
                    for (var i = 0; i < itemData.length; i++) {
                        (function(itemData) {
                            task.push(function(complete) {
                                var item = this._createItem(itemData, level);
                                this._itemHook(parent, item, itemData, level);
                                fragment.appendChild(item[0]);
                                items.push(item[0]);
                                complete();
                            });
                        })(itemData[i]);
                    }
                } else {
                    task.push(function(complete) {
                        // only one item
                        var item = this._createItem(itemData, level);
                        this._itemHook(parent, item, itemData, level);
                        fragment.appendChild(item[0]);
                        items.push(item[0]);
                        complete();
                    });
                }
            }
            // run at least once
            task.push(function(complete) {
                complete();
            });
        },
        // create children container
        _createContainer: function(item) {
            if (!item) {
                item = this._instance.jQuery;
            }
            // ensure we have a UL in place
            var ul = domApi.container(item[0]);
            if (!ul) {
                var ul = window.document.createElement('UL');
                ul.setAttribute('role', 'group');
                ul.className = 'aciTreeUl';
                ul.style.display = 'none';
                item[0].appendChild(ul);
            }
            return $(ul);
        },
        // remove children container
        _removeContainer: function(item) {
            if (!item) {
                item = this._instance.jQuery;
            }
            var ul = domApi.container(item[0]);
            ul.parentNode.removeChild(ul);
        },
        // append one or more items to item
        // `options.itemData` can be a item object or array of item objects
        // `options.items` will keep a list of added items
        append: function(item, options) {
            options = this._options(options, 'appended', 'appendfail', null, item);
            if (item) {
                if (this.isInode(item)) {
                    // a way to cancel the operation
                    if (!this._trigger(item, 'beforeappend', options)) {
                        this._fail(item, options);
                        return;
                    }
                    var container = this._createContainer(item);
                    var last = this.last(item);
                    this._createItems(container, null, null, options.itemData, this.level(item) + 1, function(list) {
                        if (list.length) {
                            // some items created, update states
                            domApi.addRemoveClass(item[0], 'aciTreeInode', 'aciTreeInodeMaybe');
                            this._setFirstLast(item, last);
                            if (this.isHidden(item)) {
                                domApi.addListClass(list.toArray(), 'aciTreeHidden');
                            } else if (this.isOpenPath(item) && this.isOpen(item)) {
                                domApi.addListClass(list.toArray(), 'aciTreeVisible');
                                this._setOddEven(list.first());
                            }
                            // trigger `added` for each item
                            list.each(this.proxy(function(element) {
                                this._trigger($(element), 'added', options);
                            }, true));
                        } else if (!this.hasChildren(item, true)) {
                            container.remove();
                        }
                        options.items = list;
                        this._success(item, options);
                    });
                } else {
                    this._fail(item, options);
                }
            } else {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeappend', options)) {
                    this._fail(item, options);
                    return;
                }
                var container = this._createContainer();
                var last = this.last();
                this._createItems(container, null, null, options.itemData, 0, function(list) {
                    if (list.length) {
                        // some items created, update states
                        this._setFirstLast(null, last);
                        domApi.addListClass(list.toArray(), 'aciTreeVisible');
                        this._setOddEven();
                        // trigger `added` for each item
                        list.each(this.proxy(function(element) {
                            this._trigger($(element), 'added', options);
                        }, true));
                        this._animate(null, true, !this._instance.options.animateRoot || options.unanimated);
                    } else if (!this.hasChildren(null, true)) {
                        // remove the children container
                        container.remove();
                    }
                    options.items = list;
                    this._success(item, options);
                });
            }
        },
        // insert one or more items before item
        // `options.itemData` can be a item object or array of item objects
        // `options.items` will keep a list of added items
        before: function(item, options) {
            options = this._options(options, 'before', 'beforefail', null, item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforebefore', options)) {
                    this._fail(item, options);
                    return;
                }
                var prev = this.prev(item);
                this._createItems(null, item, null, options.itemData, this.level(item), function(list) {
                    if (list.length) {
                        // some items created, update states
                        if (!prev.length) {
                            domApi.removeClass(item[0], 'aciTreeFirst');
                            domApi.addClass(list.first()[0], 'aciTreeFirst');
                        }
                        var parent = this.parent(item);
                        if (parent.length && this.isHidden(parent)) {
                            domApi.addListClass(list.toArray(), 'aciTreeHidden');
                        } else if (this.isOpenPath(item)) {
                            domApi.addListClass(list.toArray(), 'aciTreeVisible');
                            this._setOddEven(list.first());
                        }
                        // trigger `added` for each item
                        list.each(this.proxy(function(element) {
                            this._trigger($(element), 'added', options);
                        }, true));
                    }
                    options.items = list;
                    this._success(item, options);
                });
            } else {
                this._fail(item, options);
            }
        },
        // insert one or more items after item
        // `options.itemData` can be a item object or array of item objects
        // `options.items` will keep a list of added items
        after: function(item, options) {
            options = this._options(options, 'after', 'afterfail', null, item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeafter', options)) {
                    this._fail(item, options);
                    return;
                }
                var next = this.next(item);
                this._createItems(null, null, item, options.itemData, this.level(item), function(list) {
                    if (list.length) {
                        // some items created, update states
                        if (!next.length) {
                            domApi.removeClass(item[0], 'aciTreeLast');
                            domApi.addClass(list.last()[0], 'aciTreeLast');
                        }
                        var parent = this.parent(item);
                        if (parent.length && this.isHidden(parent)) {
                            domApi.addListClass(list.toArray(), 'aciTreeHidden');
                        } else if (this.isOpenPath(item)) {
                            domApi.addListClass(list.toArray(), 'aciTreeVisible');
                            this._setOddEven(list.first());
                        }
                        // trigger `added` for each item
                        list.each(this.proxy(function(element) {
                            this._trigger($(element), 'added', options);
                        }, true));
                    }
                    options.items = list;
                    this._success(item, options);
                });
            } else {
                this._fail(item, options);
            }
        },
        // get item having the element
        itemFrom: function(element) {
            if (element) {
                var item = $(element);
                if (item[0] === this._instance.jQuery[0]) {
                    return $([]);
                } else {
                    return $(domApi.parentFrom(item[0]));
                }
            }
            return $([]);
        },
        // get item children
        // if `branch` is TRUE then all children are returned
        // if `hidden` is TRUE then the hidden items will be considered too
        children: function(item, branch, hidden) {
            return $(domApi.children(item && item[0] ? item[0] : this._instance.jQuery[0], branch, hidden ? null : function(node) {
                return this.hasClass(node, 'aciTreeHidden') ? null : true;
            }));
        },
        // filter only the visible items (items with all parents opened)
        // if `view` is TRUE then only the items in view are returned
        visible: function(items, view) {
            var list = domApi.withClass(items.toArray(), 'aciTreeVisible');
            if (view) {
                var filter = [];
                for (var i = 0; i < list.length; i++) {
                    if (this.isVisible($(list[i]))) {
                        filter.push(list[i]);
                    }
                }
                return $(filter);
            }
            return $(list);
        },
        // filter only inner nodes from items
        // if `state` is set then filter only open/closed ones
        inodes: function(items, state) {
            if (state !== undefined) {
                if (state) {
                    return $(domApi.withClass(items.toArray(), 'aciTreeOpen'));
                } else {
                    return $(domApi.withAnyClass(items.toArray(), ['aciTreeInode', 'aciTreeInodeMaybe'], 'aciTreeOpen'));
                }
            }
            return $(domApi.withAnyClass(items.toArray(), ['aciTreeInode', 'aciTreeInodeMaybe']));
        },
        // filter only leaf nodes from items
        leaves: function(items) {
            return $(domApi.withClass(items.toArray(), 'aciTreeLeaf'));
        },
        // test if is a inner node
        isInode: function(item) {
            return item && domApi.hasAnyClass(item[0], ['aciTreeInode', 'aciTreeInodeMaybe']);
        },
        // test if is a leaf node
        isLeaf: function(item) {
            return item && domApi.hasClass(item[0], 'aciTreeLeaf');
        },
        // test if item was loaded
        wasLoad: function(item) {
            if (item) {
                return domApi.container(item[0]) !== null;
            }
            return domApi.container(this._instance.jQuery[0]) !== null;
        },
        // set item as inner node
        setInode: function(item, options) {
            options = this._options(options, 'inodeset', 'inodefail', 'wasinode', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeinode', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isLeaf(item)) {
                    this._coreDOM.inode(item, true);
                    this._success(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // set item as leaf node
        setLeaf: function(item, options) {
            options = this._options(options, 'leafset', 'leaffail', 'wasleaf', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeleaf', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isInode(item)) {
                    var process = function() {
                        this._coreDOM.leaf(item);
                        this._success(item, options);
                    };
                    if (this.wasLoad(item)) {
                        // first unload the node
                        this.unload(item, this._inner(options, {
                            success: process,
                            fail: options.fail
                        }));
                    } else {
                        process.apply(this);
                    }
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // add/update item icon
        // `options.icon` can be the CSS class name or array['CSS class name', background-position-x, background-position-y]
        // `options.oldIcon` will keep the old icon
        addIcon: function(item, options) {
            options = this._options(options, 'iconadded', 'addiconfail', 'wasicon', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeaddicon', options)) {
                    this._fail(item, options);
                    return;
                }
                var data = this.itemData(item);
                // keep the old one
                options.oldIcon = data.icon;
                var parent = domApi.childrenByClass(item[0].firstChild, 'aciTreeItem');
                var found = domApi.childrenByClass(parent, 'aciTreeIcon');
                if (found && data.icon && (options.icon.toString() == data.icon.toString())) {
                    this._notify(item, options);
                } else {
                    if (!found) {
                        found = window.document.createElement('DIV');
                        parent.insertBefore(found, parent.firstChild);
                    }
                    if (options.icon instanceof Array) {
                        // icon with background-position
                        found.className = 'aciTreeIcon ' + options.icon[0];
                        found.style.backgroundPosition = options.icon[1] + 'px ' + options.icon[2] + 'px';
                    } else {
                        // only the CSS class name
                        found.className = 'aciTreeIcon ' + options.icon;
                    }
                    // remember this one
                    data.icon = options.icon;
                    this._success(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // remove item icon
        // options.oldIcon will keep the old icon
        removeIcon: function(item, options) {
            options = this._options(options, 'iconremoved', 'removeiconfail', 'noticon', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeremoveicon', options)) {
                    this._fail(item, options);
                    return;
                }
                var data = this.itemData(item);
                // keep the old one
                options.oldIcon = data.icon;
                var parent = domApi.childrenByClass(item[0].firstChild, 'aciTreeItem');
                var found = domApi.childrenByClass(parent, 'aciTreeIcon');
                if (found) {
                    parent.removeChild(found);
                    // remember was removed
                    data.icon = null;
                    this._success(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // test if item has icon
        hasIcon: function(item) {
            return !!this.getIcon(item);
        },
        // get item icon
        getIcon: function(item) {
            var data = this.itemData(item);
            return data ? data.icon : null;
        },
        // set item label
        // `options.label` is the new label
        // `options.oldLabel` will keep the old label
        setLabel: function(item, options) {
            options = this._options(options, 'labelset', 'labelfail', 'waslabel', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforelabel', options)) {
                    this._fail(item, options);
                    return;
                }
                var data = this.itemData(item);
                // keep the old one
                options.oldLabel = data.label;
                if (options.label == options.oldLabel) {
                    this._notify(item, options);
                } else {
                    // set the label
                    domApi.childrenByClass(item[0].firstChild, 'aciTreeText').innerHTML = options.label;
                    // remember this one
                    data.label = options.label;
                    this._success(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // disable item
        disable: function(item, options) {
            options = this._options(options, 'disabled', 'disablefail', 'wasdisabled', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforedisable', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isDisabled(item)) {
                    this._notify(item, options);
                } else {
                    domApi.addClass(item[0], 'aciTreeDisabled');
                    this._success(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // test if item is disabled
        isDisabled: function(item) {
            return item && domApi.hasClass(item[0], 'aciTreeDisabled');
        },
        // test if any of parents are disabled
        isDisabledPath: function(item) {
            return domApi.withClass(this.path(item).toArray(), 'aciTreeDisabled').length > 0;
        },
        // filter only the disabled items
        disabled: function(items) {
            return $(domApi.withClass(items.toArray(), 'aciTreeDisabled'));
        },
        // enable item
        enable: function(item, options) {
            options = this._options(options, 'enabled', 'enablefail', 'wasenabled', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeenable', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isDisabled(item)) {
                    domApi.removeClass(item[0], 'aciTreeDisabled');
                    this._success(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // test if item is enabled
        isEnabled: function(item) {
            return item && !domApi.hasClass(item[0], 'aciTreeDisabled');
        },
        // test if all parents are enabled
        isEnabledPath: function(item) {
            return domApi.withClass(this.path(item).toArray(), 'aciTreeDisabled').length == 0;
        },
        // filter only the enabled items
        enabled: function(items) {
            return $(domApi.withClass(items.toArray(), null, 'aciTreeDisabled'));
        },
        // set item as hidden
        hide: function(item, options) {
            options = this._options(options, 'hidden', 'hidefail', 'washidden', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforehide', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isHidden(item)) {
                    this._notify(item, options);
                } else {
                    domApi.addRemoveClass(item[0], 'aciTreeHidden', 'aciTreeVisible');
                    // process children
                    domApi.addRemoveClass(this.children(item, true).toArray(), 'aciTreeHidden', 'aciTreeVisible');
                    // update item states
                    var parent = this.parent(item);
                    this._setFirstLast(parent.length ? parent : null, item);
                    this._setOddEven(item);
                    this._success(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // test if item is hidden
        isHidden: function(item) {
            return item && domApi.hasClass(item[0], 'aciTreeHidden');
        },
        // test if any of parents are hidden
        isHiddenPath: function(item) {
            var parent = this.parent(item);
            return parent[0] && domApi.hasClass(parent[0], 'aciTreeHidden');
        },
        // update hidden state
        _updateHidden: function(item) {
            if (this.isHiddenPath(item)) {
                if (!this.isHidden(item)) {
                    domApi.addClass(item[0], 'aciTreeHidden');
                    this._updateVisible(item);
                }
            } else {
                this._updateVisible(item);
            }
        },
        // filter only the hidden items
        hidden: function(items) {
            return $(domApi.withClass(items.toArray(), 'aciTreeHidden'));
        },
        // show hidden item
        _showHidden: function(item) {
            var parent = null;
            this.path(item).add(item).each(this.proxy(function(element) {
                var item = $(element);
                if (this.isHidden(item)) {
                    domApi.removeClass(item[0], 'aciTreeHidden');
                    if (this.isOpenPath(item) && (!parent || this.isOpen(parent))) {
                        domApi.addClass(item[0], 'aciTreeVisible');
                    }
                    // update item states
                    this._setFirstLast(parent, this._getFirstLast(parent));
                }
                parent = item;
            }, true));
        },
        // show hidden item
        show: function(item, options) {
            options = this._options(options, 'shown', 'showfail', 'wasshown', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeshow', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isHidden(item)) {
                    this._showHidden(item);
                    var parent = this.topParent(item);
                    // update item states
                    this._setOddEven(parent.length ? parent : item);
                    this._success(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // test if item is open
        isOpen: function(item) {
            return item && domApi.hasClass(item[0], 'aciTreeOpen');
        },
        // test if item is closed
        isClosed: function(item) {
            return item && !domApi.hasClass(item[0], 'aciTreeOpen');
        },
        // test if item has children
        // if `hidden` is TRUE then the hidden items will be considered too
        hasChildren: function(item, hidden) {
            return this.children(item, false, hidden).length > 0;
        },
        // test if item has siblings
        // if `hidden` is TRUE then the hidden items will be considered too
        hasSiblings: function(item, hidden) {
            return this.siblings(item, hidden).length > 0;
        },
        // test if item has another before
        // if `hidden` is TRUE then the hidden items will be considered too
        hasPrev: function(item, hidden) {
            return this.prev(item, hidden).length > 0;
        },
        // test if item has another after
        // if `hidden` is TRUE then the hidden items will be considered too
        hasNext: function(item, hidden) {
            return this.next(item, hidden).length > 0;
        },
        // get item siblings
        // if `hidden` is TRUE then the hidden items will be considered too
        siblings: function(item, hidden) {
            return item ? $(domApi.children(item[0].parentNode.parentNode, false, function(node) {
                return (node != item[0]) && (hidden || !this.hasClass(node, 'aciTreeHidden'));
            })) : $([]);
        },
        // get previous item
        // if `hidden` is TRUE then the hidden items will be considered too
        prev: function(item, hidden) {
            return item ? $(domApi.prev(item[0], hidden ? null : function(node) {
                return !this.hasClass(node, 'aciTreeHidden');
            })) : $([]);
        },
        // get next item
        // if `hidden` is TRUE then the hidden items will be considered too
        next: function(item, hidden) {
            return item ? $(domApi.next(item[0], hidden ? null : function(node) {
                return !this.hasClass(node, 'aciTreeHidden');
            })) : $([]);
        },
        // get item level - starting from 0
        // return -1 for invalid items
        level: function(item) {
            var level = -1;
            if (item) {
                var node = item[0];
                while (domApi.hasClass(node, 'aciTreeLi')) {
                    node = node.parentNode.parentNode;
                    level++;
                }
            }
            return level;
        },
        // get item ID
        getId: function(item) {
            var data = this.itemData(item);
            return data ? data.id : null;
        },
        // get item data
        itemData: function(item) {
            return item ? item.data('itemData' + this._instance.nameSpace) : null;
        },
        // set item ID
        // `options.id` is the new item ID
        // `options.oldId` will keep the old ID
        setId: function(item, options) {
            options = this._options(options, 'idset', 'idfail', 'wasid', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeid', options)) {
                    this._fail(item, options);
                    return;
                }
                var data = this.itemData(item);
                // keep the old one
                options.oldId = data.id;
                if (options.id == options.oldId) {
                    this._notify(item, options);
                } else {
                    // remember this one
                    data.id = options.id;
                    this._success(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // get item index - starting from #0
        getIndex: function(item) {
            if (item && item[0]) {
                if (window.Array.prototype.indexOf) {
                    return window.Array.prototype.indexOf.call(item[0].parentNode.childNodes, item[0]);
                } else {
                    var children = item[0].parentNode.childNodes;
                    for (var i = 0; i < children.length; i++) {
                        if (children[i] == item[0]) {
                            return i;
                        }
                    }
                }
            }
            return null;
        },
        // set item index - #0 based
        // `options.index` is the new index
        // `options.oldIndex` will keep the old index
        setIndex: function(item, options) {
            options = this._options(options, 'indexset', 'indexfail', 'wasindex', item);
            if (this.isItem(item)) {
                var oldIndex = this.getIndex(item);
                var siblings = this.siblings(item);
                if ((options.index != oldIndex) && !siblings.length) {
                    this._fail(item, options);
                    return;
                }
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeindex', options)) {
                    this._fail(item, options);
                    return;
                }
                // keep the old one
                options.oldIndex = oldIndex;
                if (options.index == oldIndex) {
                    this._notify(item, options);
                } else {
                    // set the new index
                    if (options.index < 1) {
                        siblings.first().before(item);
                    } else if (options.index >= siblings.length) {
                        siblings.last().after(item);
                    } else {
                        siblings.eq(options.index).before(item);
                    }
                    var parent = this.parent(item);
                    // update item states
                    this._setFirstLast(parent.length ? parent : null, item.add([siblings[0], siblings.get(-1)]));
                    this._setOddEven(parent);
                    this._success(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // get item label
        getLabel: function(item) {
            var data = this.itemData(item);
            return data ? data.label : null;
        },
        // test if is valid item
        isItem: function(item) {
            return item && domApi.hasClass(item[0], 'aciTreeLi');
        },
        // item animation
        // `state` if TRUE then show, FALSE then hide
        // `unanimated` if TRUE then don't use animations
        // `callback` function () to call at the end
        _animate: function(item, state, unanimated, callback) {
            if (!item) {
                item = this._instance.jQuery;
            }
            if (!unanimated) {
                // use the defined animation props
                var setting = state ? this._instance.options.show : this._instance.options.hide;
                if (setting) {
                    var ul = domApi.container(item[0]);
                    if (ul) {
                        // animate children container
                        $(ul).stop(true, true).animate(setting.props, {
                            duration: setting.duration,
                            easing: setting.easing,
                            complete: callback ? this.proxy(callback) : null
                        });
                    } else if (callback) {
                        callback.apply(this);
                    }
                    return;
                }
            }
            // use no animation
            $(domApi.container(item[0])).stop(true, true).toggle(state);
            if (callback) {
                callback.apply(this);
            }
        },
        // get first children of item
        // if `hidden` is TRUE then the hidden items will be considered too
        first: function(item, hidden) {
            if (!item) {
                item = this._instance.jQuery;
            }
            return $(domApi.firstChild(item[0], hidden ? null : function(node) {
                return !this.hasClass(node, 'aciTreeHidden');
            }));
        },
        // test if item is the first one for his parent
        // if `hidden` is TRUE then the hidden items will be considered too
        isFirst: function(item, hidden) {
            if (item) {
                var parent = domApi.parent(item[0]);
                return this.first(parent ? $(parent) : null, hidden)[0] == item[0];
            }
            return false;
        },
        // get last children of item
        // if `hidden` is TRUE then the hidden items will be considered too
        last: function(item, hidden) {
            if (!item) {
                item = this._instance.jQuery;
            }
            return $(domApi.lastChild(item[0], hidden ? null : function(node) {
                return !this.hasClass(node, 'aciTreeHidden');
            }));
        },
        // test if item is the last one for his parent
        // if `hidden` is TRUE then the hidden items will be considered too
        isLast: function(item, hidden) {
            if (item) {
                var parent = domApi.parent(item[0]);
                return this.last(parent ? $(parent) : null, hidden)[0] == item[0];
            }
            return false;
        },
        // test if item is busy/loading
        isBusy: function(item) {
            if (item) {
                return domApi.hasClass(item[0], 'aciTreeLoad');
            } else {
                return this._instance.queue.busy();
            }
        },
        // set loading state
        _loading: function(item, state) {
            if (item) {
                domApi.toggleClass(item[0], 'aciTreeLoad', state);
                if (state) {
                    item[0].firstChild.setAttribute('aria-busy', true);
                } else {
                    item[0].firstChild.removeAttribute('aria-busy');
                }
            } else if (state) {
                this._loader(state);
            }
        },
        // show loader image
        _loader: function(show) {
            if (show || this.isBusy()) {
                if (!this._private.loaderInterval) {
                    this._private.loaderInterval = window.setInterval(this.proxy(function() {
                        this._loader();
                    }), this._instance.options.loaderDelay);
                }
                domApi.addClass(this._instance.jQuery[0], 'aciTreeLoad');
                window.clearTimeout(this._private.loaderHide);
                this._private.loaderHide = window.setTimeout(this.proxy(function() {
                    domApi.removeClass(this._instance.jQuery[0], 'aciTreeLoad');
                }), this._instance.options.loaderDelay * 2);
            }
        },
        // test if parent has children
        isChildren: function(parent, children) {
            if (!parent) {
                parent = this._instance.jQuery;
            }
            return children && (parent.has(children).length > 0);
        },
        // test if parent has immediate children
        isImmediateChildren: function(parent, children) {
            if (!parent) {
                parent = this._instance.jQuery;
            }
            return children && parent.children('.aciTreeUl').children('.aciTreeLi').is(children);
        },
        // test if items share the same parent
        sameParent: function(item1, item2) {
            if (item1 && item2) {
                var parent1 = this.parent(item1);
                var parent2 = this.parent(item2);
                return (!parent1.length && !parent2.length) || (parent1[0] == parent2[0]);
            }
            return false;
        },
        // test if items share the same top parent
        sameTopParent: function(item1, item2) {
            if (item1 && item2) {
                var parent1 = this.topParent(item1);
                var parent2 = this.topParent(item2);
                return (!parent1.length && !parent2.length) || (parent1[0] == parent2[0]);
            }
            return false;
        },
        // return the updated item data
        // `callback` function (item) called for each item
        _serialize: function(item, callback) {
            var data = this.itemData(item);
            if (this.isInode(item)) {
                data.inode = true;
                if (this.wasLoad(item)) {
                    if (data.hasOwnProperty('open')) {
                        data.open = this.isOpen(item);
                    } else if (this.isOpen(item)) {
                        data.open = true;
                    }
                    data.branch = [];
                    this.children(item, false, true).each(this.proxy(function(element) {
                        var entry = this._serialize($(element), callback);
                        if (callback) {
                            entry = callback.call(this, $(element), {
                            }, entry);
                        } else {
                            entry = this._instance.options.serialize.call(this, $(element), {
                            }, entry);
                        }
                        if (entry) {
                            data.branch.push(entry);
                        }
                    }, true));
                    if (!data.branch.length) {
                        data.branch = null;
                    }
                } else {
                    if (data.hasOwnProperty('open')) {
                        data.open = false;
                    }
                    if (data.hasOwnProperty('branch')) {
                        data.branch = null;
                    }
                }
            } else {
                if (data.hasOwnProperty('inode')) {
                    data.inode = false;
                }
                if (data.hasOwnProperty('open')) {
                    data.open = null;
                }
                if (data.hasOwnProperty('branch')) {
                    data.branch = null;
                }
            }
            if (data.hasOwnProperty('disabled')) {
                data.disabled = this.isDisabled(item);
            } else if (this.isDisabled(item)) {
                data.disabled = true;
            }
            return data;
        },
        // return serialized data
        // `callback` function (item, what, value) - see `aciTree.options.serialize`
        serialize: function(item, what, callback) {
            // override this to provide serialized data
            if (typeof what == 'object') {
                if (item) {
                    var data = this._serialize(item, callback);
                    if (callback) {
                        data = callback.call(this, item, {
                        }, data);
                    } else {
                        data = this._instance.options.serialize.call(this, item, {
                        }, data);
                    }
                    return data;
                } else {
                    var list = [];
                    this.children(null, false, true).each(this.proxy(function(element) {
                        var data = this._serialize($(element), callback);
                        if (callback) {
                            data = callback.call(this, $(element), {
                            }, data);
                        } else {
                            data = this._instance.options.serialize.call(this, $(element), {
                            }, data);
                        }
                        if (data) {
                            list.push(data);
                        }
                    }, true));
                    return list;
                }
            }
            return '';
        },
        // destroy the control
        destroy: function(options) {
            options = this._options(options);
            // check if was init
            if (!this.wasInit()) {
                this._trigger(null, 'notinit', options);
                this._fail(null, options);
                return;
            }
            // check if is locked
            if (this.isLocked()) {
                this._trigger(null, 'locked', options);
                this._fail(null, options);
                return;
            }
            // a way to cancel the operation
            if (!this._trigger(null, 'beforedestroy', options)) {
                this._trigger(null, 'destroyfail', options);
                this._fail(null, options);
                return;
            }
            this._private.locked = true;
            this._instance.jQuery.addClass('aciTreeLoad').attr('aria-busy', true);
            this._instance.queue.destroy();
            this._destroyHook(false);
            // unload the entire treeview
            this.unload(null, this._inner(options, {
                success: this.proxy(function() {
                    window.clearTimeout(this._private.loaderHide);
                    window.clearInterval(this._private.loaderInterval);
                    this._private.itemClone = {
                    };
                    this._destroyHook(true);
                    this._instance.jQuery.unbind(this._instance.nameSpace).off(this._instance.nameSpace, '.aciTreeButton').off(this._instance.nameSpace, '.aciTreeLine');
                    this._instance.jQuery.removeClass('aciTree' + this._instance.index + ' aciTreeLoad').removeAttr('role aria-busy');
                    this._private.locked = false;
                    // call the parent
                    this._super();
                    this._trigger(null, 'destroyed', options);
                    this._success(null, options);
                }),
                fail: function() {
                    this._instance.jQuery.removeClass('aciTreeLoad');
                    this._private.locked = false;
                    this._trigger(null, 'destroyfail', options);
                    this._fail(null, options);
                }
            }));
        },
        _destroyHook: function(unloaded) {
            // override this to do extra destroy before/after unload
        }

    };

    // extend the base aciPluginUi class and store into aciPluginClass.plugins
    aciPluginClass.plugins.aciTree = aciPluginClass.aciPluginUi.extend(aciTree_core, 'aciTreeCore');

    // publish the plugin & the default options
    aciPluginClass.publish('aciTree', options);

    // for internal access
    var domApi = aciPluginClass.plugins.aciTree_dom;

})(jQuery, this);

/*
 * aciTree jQuery Plugin v4.5.0-rc.7
 * http://acoderinsights.ro
 *
 * Copyright (c) 2014 Dragos Ursu
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Require jQuery Library >= v1.9.0 http://jquery.com
 * + aciPlugin >= v1.5.1 https://github.com/dragosu/jquery-aciPlugin
 */

/*
 * A few utility functions for aciTree.
 */

(function($, window, undefined) {

    // extra default options

    var options = {
        // called when items need to be filtered, for each tree item
        // return TRUE/FALSE to include/exclude items on filtering
        filterHook: function(item, search, regexp) {
            return search.length ? regexp.test(window.String(this.getLabel(item))) : true;
        }
    };

    // aciTree utils extension
    // adds item update option, branch processing, moving items & item swapping, item search by ID

    var aciTree_utils = {
        __extend: function() {
            // add extra data
            $.extend(this._instance, {
                filter: new this._queue(this, this._instance.options.queue)
            });
            // stop queue until needed
            this._instance.filter.destroy();
            // call the parent
            this._super();
        },
        // call the `callback` function (item) for each children of item
        // when `load` is TRUE will also try to load nodes
        branch: function(item, callback, load) {
            var queue = this._instance.queue;
            var process = this.proxy(function(item, callback, next) {
                var child = next ? this.next(item) : this.first(item);
                if (child.length) {
                    if (this.isInode(child)) {
                        if (this.wasLoad(child)) {
                            queue.push(function(complete) {
                                callback.call(this, child);
                                process(child, callback);
                                process(child, callback, true);
                                complete();
                            });
                        } else if (load) {
                            // load the item first
                            this.ajaxLoad(child, {
                                success: function() {
                                    callback.call(this, child);
                                    process(child, callback);
                                    process(child, callback, true);
                                },
                                fail: function() {
                                    process(child, callback, true);
                                }
                            });
                        } else {
                            queue.push(function(complete) {
                                callback.call(this, child);
                                process(child, callback, true);
                                complete();
                            });
                        }
                    } else {
                        queue.push(function(complete) {
                            callback.call(this, child);
                            process(child, callback, true);
                            complete();
                        });
                    }
                }
            });
            process(item, callback);
        },
        // swap two items (they can't be parent & children)
        // `options.item1` & `options.item2` are the swapped items
        swap: function(options) {
            options = this._options(options, null, 'swapfail', null, null);
            var item1 = options.item1;
            var item2 = options.item2;
            if (this.isItem(item1) && this.isItem(item2) && !this.isChildren(item1, item2) && !this.isChildren(item2, item1) && (item1[0] != item2[0])) {
                // a way to cancel the operation
                if (!this._trigger(null, 'beforeswap', options)) {
                    this._fail(null, options);
                    return;
                }
                var prev = this.prev(item1);
                if (prev.length) {
                    if (item2[0] == prev[0]) {
                        item2.before(item1);
                    } else {
                        item1.insertAfter(item2);
                        item2.insertAfter(prev);
                    }
                } else {
                    var next = this.next(item1);
                    if (next.length) {
                        if (item2[0] == next[0]) {
                            item2.after(item1);
                        } else {
                            item1.insertAfter(item2);
                            item2.insertBefore(next);
                        }
                    } else {
                        var parent = item1.parent();
                        item1.insertAfter(item2);
                        parent.append(item2);
                    }
                }
                // update item states
                this._updateLevel(item1);
                var parent = this.parent(item1);
                this._setFirstLast(parent.length ? parent : null, item1);
                this._updateHidden(item1);
                this._updateLevel(item2);
                parent = this.parent(item2);
                this._setFirstLast(parent.length ? parent : null, item2);
                this._updateHidden(item2);
                this._setOddEven(item1.add(item2));
                this._trigger(null, 'swapped', options);
                this._success(null, options);
            } else {
                this._fail(null, options);
            }
        },
        // update item level
        _updateItemLevel: function(item, fromLevel, toLevel) {
            domApi.addRemoveClass(item[0], 'aciTreeLevel' + toLevel, 'aciTreeLevel' + fromLevel);
            var line = item[0].firstChild;
            line.setAttribute('aria-level', toLevel + 1);
            var entry = domApi.childrenByClass(line, 'aciTreeEntry');
            if (fromLevel < toLevel) {
                line = entry.parentNode;
                var branch;
                for (var i = fromLevel; i < toLevel; i++) {
                    branch = window.document.createElement('DIV');
                    line.appendChild(branch);
                    branch.className = 'aciTreeBranch aciTreeLevel' + i;
                    line = branch;
                }
                line.appendChild(entry);
            } else {
                var branch = entry;
                for (var i = toLevel; i <= fromLevel; i++) {
                    branch = branch.parentNode;
                }
                branch.removeChild(branch.firstChild);
                branch.appendChild(entry);
            }
        },
        // update child level
        _updateChildLevel: function(item, fromLevel, toLevel) {
            this.children(item, false, true).each(this.proxy(function(element) {
                var item = $(element);
                this._updateItemLevel(item, fromLevel, toLevel);
                if (this.isInode(item)) {
                    this._updateChildLevel(item, fromLevel + 1, toLevel + 1);
                }
            }, true));
        },
        // update item level
        _updateLevel: function(item) {
            var level = this.level(item);
            var found = window.parseInt(item.attr('class').match(/aciTreeLevel[0-9]+/)[0].match(/[0-9]+/));
            if (level != found) {
                this._updateItemLevel(item, found, level);
                this._updateChildLevel(item, found + 1, level + 1);
            }
        },
        // move item up
        moveUp: function(item, options) {
            options = this._options(options);
            options.index = window.Math.max(this.getIndex(item) - 1, 0);
            this.setIndex(item, options);
        },
        // move item down
        moveDown: function(item, options) {
            options = this._options(options);
            options.index = window.Math.min(this.getIndex(item) + 1, this.siblings(item).length);
            this.setIndex(item, options);
        },
        // move item in first position
        moveFirst: function(item, options) {
            options = this._options(options);
            options.index = 0;
            this.setIndex(item, options);
        },
        // move item in last position
        moveLast: function(item, options) {
            options = this._options(options);
            options.index = this.siblings(item).length;
            this.setIndex(item, options);
        },
        // move item before another (they can't be parent & children)
        // `options.before` is the element before which the item will be moved
        moveBefore: function(item, options) {
            options = this._options(options, null, 'movefail', 'wasbefore', item);
            var before = options.before;
            if (this.isItem(item) && this.isItem(before) && !this.isChildren(item, before) && (item[0] != before[0])) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforemove', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.prev(before, true)[0] == item[0]) {
                    this._notify(item, options);
                } else {
                    var parent = this.parent(item);
                    var prev = this.prev(item, true);
                    if (!prev.length) {
                        prev = parent.length ? parent : this.first();
                    }
                    item.insertBefore(before);
                    if (parent.length && !this.hasChildren(parent, true)) {
                        this.setLeaf(parent);
                    }
                    this._updateLevel(item);
                    // update item states
                    this._setFirstLast(parent.length ? parent : null);
                    parent = this.parent(item);
                    this._setFirstLast(parent.length ? parent : null, item.add(before));
                    this._updateHidden(item);
                    this._setOddEven(item.add(before).add(prev));
                    this._trigger(item, 'moved', options);
                    this._success(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // move item after another (they can't be parent & children)
        // `options.after` is the element after which the item will be moved
        moveAfter: function(item, options) {
            options = this._options(options, null, 'movefail', 'wasafter', item);
            var after = options.after;
            if (this.isItem(item) && this.isItem(after) && !this.isChildren(item, after) && (item[0] != after[0])) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforemove', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.next(after, true)[0] == item[0]) {
                    this._notify(item, options);
                } else {
                    var parent = this.parent(item);
                    var prev = this.prev(item, true);
                    if (!prev.length) {
                        prev = parent.length ? parent : this.first();
                    }
                    item.insertAfter(after);
                    if (parent.length && !this.hasChildren(parent, true)) {
                        this.setLeaf(parent);
                    }
                    this._updateLevel(item);
                    this._setFirstLast(parent.length ? parent : null);
                    parent = this.parent(item);
                    this._setFirstLast(parent.length ? parent : null, item.add(after));
                    this._updateHidden(item);
                    this._setOddEven(item.add(after).add(prev));
                    this._trigger(item, 'moved', options);
                    this._success(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // move item to be a child of another (they can't be parent & children and the targeted parent item must be empty)
        // `options.parent` is the parent element on which the item will be added
        asChild: function(item, options) {
            options = this._options(options, null, 'childfail', null, item);
            var parent = options.parent;
            if (this.isItem(item) && this.isItem(parent) && !this.isChildren(item, parent) && !this.hasChildren(parent, true) && (item[0] != parent[0])) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforechild', options)) {
                    this._fail(item, options);
                    return;
                }
                var process = function() {
                    var oldParent = this.parent(item);
                    var prev = this.prev(item);
                    if (!prev.length) {
                        prev = oldParent.length ? oldParent : this.first();
                    }
                    var container = this._createContainer(parent);
                    container.append(item);
                    if (oldParent.length && !this.hasChildren(oldParent, true)) {
                        // no more children
                        this.setLeaf(oldParent);
                    }
                    // update item states
                    this._updateLevel(item);
                    this._setFirstLast(oldParent.length ? oldParent : null);
                    this._setFirstLast(parent.length ? parent : null, item);
                    this._updateHidden(item);
                    this._setOddEven(item.add(prev));
                    this._trigger(item, 'childset', options);
                    this._success(item, options);
                };
                if (this.isInode(parent)) {
                    process.apply(this);
                } else {
                    // set as inode first
                    this.setInode(parent, this._inner(options, {
                        success: process,
                        fail: options.fail
                    }));
                }
            } else {
                this._fail(item, options);
            }
        },
        // search a `path` ID from a parent
        _search: function(parent, pathId) {
            var items = this.children(parent);
            var item, id, length, found, exact = false;
            for (var i = 0, size = items.length; i < size; i++) {
                item = items.eq(i);
                id = window.String(this.getId(item));
                length = id.length;
                if (length) {
                    if (id == pathId.substr(0, length)) {
                        found = item;
                        exact = pathId.length == length;
                        break;
                    }
                }
            }
            if (found) {
                if (!exact) {
                    // try to search children
                    var child = this._search(found, pathId);
                    if (child) {
                        return child;
                    }
                }
                return {
                    item: found,
                    exact: exact
                };
            } else {
                return null;
            }
        },
        // search items by ID
        // `options.id` is the ID to search for
        // if `path` is TRUE then the search will be more optimized
        // and reduced to the first branch that matches the ID
        // but the ID must be set like a path otherwise will not work
        // if `load` is TRUE will also try to load nodes (works only when `path` is TRUE)
        searchId: function(path, load, options) {
            options = this._options(options);
            var id = options.id;
            if (path) {
                if (load) {
                    var process = this.proxy(function(item) {
                        var found = this._search(item, id);
                        if (found) {
                            if (found.exact) {
                                this._success(found.item, options);
                            } else {
                                if (this.wasLoad(found.item)) {
                                    this._fail(item, options);
                                } else {
                                    // load the item
                                    this.ajaxLoad(found.item, this._inner(options, {
                                        success: function() {
                                            process(found.item);
                                        },
                                        fail: options.fail
                                    }));
                                }
                            }
                        } else {
                            this._fail(item, options);
                        }
                    });
                    process();
                } else {
                    var found = this._search(null, id);
                    if (found && found.exact) {
                        this._success(found.item, options);
                    } else {
                        this._fail(null, options);
                    }
                }
            } else {
                var found = $();
                this._instance.jQuery.find('.aciTreeLi').each(this.proxy(function(element) {
                    if (id == this.getId($(element))) {
                        found = $(element);
                        return false;
                    }
                }, true));
                if (found.length) {
                    this._success(found, options);
                } else {
                    this._fail(null, options);
                }
            }
        },
        // search nodes by ID or custom property starting from item
        // `options.search` is the value to be searched
        // `options.load` if TRUE will try to load nodes
        // `options.callback` function (item, search) return TRUE for the custom match
        // `options.results` will keep the search results
        search: function(item, options) {
            var results = [];
            options = this._options(options);
            var task = new this._task(new this._queue(this, this._instance.options.queue), function(complete) {
                // run this at the end
                if (results.length) {
                    options.results = $(results);
                    this._success($(results[0]), options);
                } else {
                    this._fail(item, options);
                }
                complete();
            });
            var children = this.proxy(function(item) {
                this.children(item, false, true).each(this.proxy(function(element) {
                    if (options.callback) {
                        // custom search
                        var match = options.callback.call(this, $(element), options.search);
                        if (match) {
                            results.push(element);
                        } else if (match === null) {
                            // skip childrens
                            return;
                        }
                    } else if (this.getId($(element)) == options.search) {
                        // default ID match
                        results.push(element);
                    }
                    if (this.isInode($(element))) {
                        // process children
                        task.push(function(complete) {
                            search($(element));
                            complete();
                        });
                    }
                }, true));
            });
            var search = this.proxy(function(item) {
                if (this.wasLoad(item)) {
                    // process children
                    task.push(function(complete) {
                        children(item);
                        complete();
                    });
                } else if (options.load) {
                    task.push(function(complete) {
                        // load the item first
                        this.ajaxLoad(item, {
                            success: function() {
                                children(item);
                                complete();
                            },
                            fail: complete
                        });
                    });
                }
            });
            // run the search
            task.push(function(complete) {
                search(item);
                complete();
            });
        },
        // search node by a list of IDs starting from item
        // `options.path` is a list of IDs to be searched - the path to the node
        // `options.load` if TRUE will try to load nodes
        searchPath: function(item, options) {
            options = this._options(options);
            var path = options.path;
            var search = this.proxy(function(item, id) {
                this.search(item, {
                    success: function(item) {
                        if (path.length) {
                            search(item, path.shift());
                        } else {
                            this._success(item, options);
                        }
                    },
                    fail: function() {
                        this._fail(item, options);
                    },
                    search: id,
                    load: options.load,
                    callback: function(item, search) {
                        // prevent drill-down
                        return (this.getId(item) == search) ? true : null;
                    }
                });
            });
            search(item, path.shift());
        },
        // get item path IDs starting from the top parent (ROOT)
        // when `reverse` is TRUE returns the IDs in reverse order
        pathId: function(item, reverse) {
            var path = this.path(item, reverse), id = [];
            path.each(this.proxy(function(element) {
                id.push(this.getId($(element)));
            }, true));
            return id;
        },
        // escape string and return RegExp
        _regexp: function(search) {
            return new window.RegExp(window.String(search).replace(/([-()\[\]{}+?*.$\^|,:#<!\\])/g, '\\$1').replace(/\x08/g, '\\x08'), 'i');
        },
        // filter the tree items based on search criteria
        // `options.search` is the keyword
        // `options.first` will be the first matched item (if any)
        filter: function(item, options) {
            options = this._options(options, null, 'filterfail', null, item);
            if (!item || this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforefilter', options)) {
                    this._fail(item, options);
                    return;
                }
                var search = window.String(options.search);
                var regexp = this._regexp(search);
                var first = null;
                this._instance.filter.init();
                var task = new this._task(this._instance.filter, function(complete) {
                    // run this at the end
                    this._instance.filter.destroy();
                    options.first = first;
                    this._setOddEven();
                    this._trigger(item, 'filtered', options);
                    this._success(item, options);
                    complete();
                });
                // process children
                var process = this.proxy(function(parent) {
                    var children = this.children(parent, false, true);
                    var found = false;
                    children.each(this.proxy(function(element) {
                        var item = $(element);
                        if (this._instance.options.filterHook.call(this, item, search, regexp)) {
                            if (!first) {
                                first = item;
                            }
                            found = true;
                            domApi.removeClass(item[0], 'aciTreeHidden');
                        } else {
                            domApi.addRemoveClass(item[0], 'aciTreeHidden', 'aciTreeVisible');
                        }
                        if (this.isInode(item)) {
                            // continue with the children
                            task.push(function(complete) {
                                process(item);
                                complete();
                            });
                        }
                    }, true));
                    if (found) {
                        // update item states
                        if (parent && this.isHidden(parent)) {
                            this._showHidden(parent);
                        }
                        if (!parent || (this.isOpenPath(parent) && this.isOpen(parent))) {
                            children.not('.aciTreeHidden').addClass('aciTreeVisible');
                        }
                        this._setFirstLast(parent, this._getFirstLast(parent));
                    }
                });
                task.push(function(complete) {
                    process(item);
                    complete();
                });
            } else {
                this._fail(item, options);
            }
        },
        // call the `callback` function (item) for the first item
        _firstAll: function(callback) {
            callback.call(this, this.first());
        },
        // call the `callback` function (item) for the last item
        // when `load` is TRUE will also try to load nodes
        _lastAll: function(item, callback, load) {
            if (item) {
                if (this.isInode(item)) {
                    if (this.wasLoad(item)) {
                        this._lastAll(this.last(item), callback, load);
                        return;
                    } else if (load) {
                        this.ajaxLoad(item, {
                            success: function() {
                                this._lastAll(this.last(item), callback, load);
                            },
                            fail: function() {
                                callback.call(this, item);
                            }
                        });
                        return;
                    }
                }
                callback.call(this, item);
            } else {
                callback.call(this, this.last());
            }
        },
        // call the `callback` function (item) for the next item from tree
        // when `load` is TRUE will also try to load nodes
        _nextAll: function(item, callback, load) {
            if (item) {
                if (this.isInode(item)) {
                    if (this.wasLoad(item)) {
                        callback.call(this, this.first(item));
                        return;
                    } else if (load) {
                        this.ajaxLoad(item, {
                            success: function() {
                                callback.call(this, this.first(item));
                            },
                            fail: function() {
                                this._nextAll(item, callback, load);
                            }
                        });
                        return;
                    }
                }
                var next = this.next(item);
                if (next.length) {
                    callback.call(this, next);
                } else {
                    // search next by parents
                    var search = this.proxy(function(item) {
                        var parent = this.parent(item);
                        if (parent.length) {
                            var next = this.next(parent);
                            if (next.length) {
                                return next;
                            } else {
                                return search(parent);
                            }
                        }
                        return null;
                    });
                    callback.call(this, search(item));
                }
            } else {
                callback.call(this, this.first());
            }
        },
        // call the `callback` function (item) for the previous item from tree
        // when `load` is TRUE will also try to load nodes
        _prevAll: function(item, callback, load) {
            if (item) {
                var prev = this.prev(item);
                if (prev.length) {
                    if (this.isInode(prev)) {
                        this._lastAll(prev, callback, load);
                    } else {
                        callback.call(this, prev);
                    }
                } else {
                    var parent = this.parent(item);
                    callback.call(this, parent.length ? parent : null);
                }
            } else {
                callback.call(this, this.last());
            }
        },
        // call the `callback` function (item) with the previous found item based on search criteria
        // `search` is the keyword
        prevMatch: function(item, search, callback) {
            var regexp = this._regexp(search);
            this._instance.filter.init();
            var task = new this._task(this._instance.filter, function(complete) {
                this._instance.filter.destroy();
                complete();
            });
            var process = function(item) {
                task.push(function(complete) {
                    this._prevAll(item, function(item) {
                        if (item) {
                            if (this._instance.options.filterHook.call(this, item, search, regexp)) {
                                callback.call(this, item);
                            } else {
                                process(item);
                            }
                        } else {
                            callback.call(this, null);
                        }
                        complete();
                    });
                });
            };
            process(this.isItem(item) ? item : null);
        },
        // call the `callback` function (item) with the next found item based on search criteria
        // `search` is the keyword
        nextMatch: function(item, search, callback) {
            var regexp = this._regexp(search);
            this._instance.filter.init();
            var task = new this._task(this._instance.filter, function(complete) {
                this._instance.filter.destroy();
                complete();
            });
            var process = function(item) {
                task.push(function(complete) {
                    this._nextAll(item, function(item) {
                        if (item) {
                            if (this._instance.options.filterHook.call(this, item, search, regexp)) {
                                callback.call(this, item);
                            } else {
                                process(item);
                            }
                        } else {
                            callback.call(this, null);
                        }
                        complete();
                    });
                });
            };
            process(this.isItem(item) ? item : null);
        }

    };

    // extend the base aciTree class and add the utils stuff
    aciPluginClass.plugins.aciTree = aciPluginClass.plugins.aciTree.extend(aciTree_utils, 'aciTreeUtils');

    // add extra default options
    aciPluginClass.defaults('aciTree', options);

    // for internal access
    var domApi = aciPluginClass.plugins.aciTree_dom;

})(jQuery, this);

/*
 * aciTree jQuery Plugin v4.5.0-rc.7
 * http://acoderinsights.ro
 *
 * Copyright (c) 2014 Dragos Ursu
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Require jQuery Library >= v1.9.0 http://jquery.com
 * + aciPlugin >= v1.5.1 https://github.com/dragosu/jquery-aciPlugin
 */

/*
 * This extension adds item selection/keyboard navigation to aciTree and need to
 * be always included if you care about accessibility.
 *
 * There is an extra property for the item data:
 *
 * {
 *   ...
 *   selected: false,                    // TRUE means the item will be selected
 *   ...
 * }
 *
 */

(function($, window, undefined) {

    // extra default options

    var options = {
        selectable: true,               // if TRUE then one item can be selected (and the tree navigation with the keyboard will be enabled)
        multiSelectable: false,         // if TRUE then multiple items can be selected at a time
        // the 'tabIndex' attribute need to be >= 0 set on the tree container (by default will be set to 0)
        fullRow: false,                 // if TRUE then the selection will be made on the entire row (the CSS should reflect this)
        textSelection: false            // if FALSE then the item text can't be selected
    };

    // aciTree selectable extension
    // adds item selection & keyboard navigation (left/right, up/down, pageup/pagedown, home/end, space, enter, escape)
    // dblclick also toggles the item

    var aciTree_selectable = {
        __extend: function() {
            // add extra data
            $.extend(this._instance, {
                focus: false
            });
            $.extend(this._private, {
                blurTimeout: null,
                spinPoint: null // the selected item to operate against when using the shift key with selection
            });
            // call the parent
            this._super();
        },
        // test if has focus
        hasFocus: function() {
            return this._instance.focus;
        },
        // init selectable
        _selectableInit: function() {
            if (this._instance.jQuery.attr('tabindex') === undefined) {
                // ensure the tree can get focus
                this._instance.jQuery.attr('tabindex', 0);
            }
            if (!this._instance.options.textSelection) {
                // disable text selection
                this._selectable(false);
            }
            this._instance.jQuery.bind('acitree' + this._private.nameSpace, function(event, api, item, eventName, options) {
                switch (eventName) {
                    case 'closed':
                        var focused = api.focused();
                        if (api.isChildren(item, focused)) {
                            // move focus to parent on close
                            api._focusOne(item);
                        }
                        // deselect children on parent close
                        api.children(item, true).each(api.proxy(function(element) {
                            var item = $(element);
                            if (this.isSelected(item)) {
                                this.deselect(item);
                            }
                        }, true));
                        break;
                }
            }).bind('focusin' + this._private.nameSpace, this.proxy(function() {
                // handle tree focus
                window.clearTimeout(this._private.blurTimeout);
                if (!this.hasFocus()) {
                    this._instance.focus = true;
                    domApi.addClass(this._instance.jQuery[0], 'aciTreeFocus');
                    this._trigger(null, 'focused');
                }
            })).bind('focusout' + this._private.nameSpace, this.proxy(function() {
                // handle tree focus
                window.clearTimeout(this._private.blurTimeout);
                this._private.blurTimeout = window.setTimeout(this.proxy(function() {
                    if (this.hasFocus()) {
                        this._instance.focus = false;
                        domApi.removeClass(this._instance.jQuery[0], 'aciTreeFocus');
                        this._trigger(null, 'blurred');
                    }
                }), 10);
            })).bind('keydown' + this._private.nameSpace, this.proxy(function(e) {
                if (!this.hasFocus()) {
                    // do not handle if we do not have focus
                    return;
                }
                var focused = this.focused();
                if (focused.length && this.isBusy(focused)) {
                    // skip when busy
                    return false;
                }
                var item = $([]);
                switch (e.which) {
                    case 65: // aA
                        if (this._instance.options.multiSelectable && e.ctrlKey) {
                            // select all visible items
                            var select = this.visible(this.enabled(this.children(null, true))).not(this.selected());
                            select.each(this.proxy(function(element) {
                                this.select($(element), {
                                    focus: false
                                });
                            }, true));
                            if (!this.focused().length) {
                                // ensure one item has focus
                                this._focusOne(this.visible(select, true).first());
                            }
                            // prevent default action
                            e.preventDefault();
                        }
                        break;
                    case 38: // up
                        item = focused.length ? this._prev(focused) : this.first();
                        break;
                    case 40: // down
                        item = focused.length ? this._next(focused) : this.first();
                        break;
                    case 37: // left
                        if (focused.length) {
                            if (this.isOpen(focused)) {
                                item = focused;
                                // close the item
                                this.close(focused, {
                                    collapse: this._instance.options.collapse,
                                    expand: this._instance.options.expand,
                                    unique: this._instance.options.unique
                                });
                            } else {
                                item = this.parent(focused);
                            }
                        } else {
                            item = this._first();
                        }
                        break;
                    case 39: // right
                        if (focused.length) {
                            if (this.isInode(focused) && this.isClosed(focused)) {
                                item = focused;
                                // open the item
                                this.open(focused, {
                                    collapse: this._instance.options.collapse,
                                    expand: this._instance.options.expand,
                                    unique: this._instance.options.unique
                                });
                            } else {
                                item = this.first(focused);
                            }
                        } else {
                            item = this._first();
                        }
                        break;
                    case 33: // pgup
                        item = focused.length ? this._prevPage(focused) : this._first();
                        break;
                    case 34: // pgdown
                        item = focused.length ? this._nextPage(focused) : this._first();
                        break;
                    case 36: // home
                        item = this._first();
                        break;
                    case 35: // end
                        item = this._last();
                        break;
                    case 13: // enter
                    case 107: // numpad [+]
                        item = focused;
                        if (this.isInode(focused) && this.isClosed(focused)) {
                            // open the item
                            this.open(focused, {
                                collapse: this._instance.options.collapse,
                                expand: this._instance.options.expand,
                                unique: this._instance.options.unique
                            });
                        }
                        break;
                    case 27: // escape
                    case 109: // numpad [-]
                        item = focused;
                        if (this.isOpen(focused)) {
                            // close the item
                            this.close(focused, {
                                collapse: this._instance.options.collapse,
                                expand: this._instance.options.expand,
                                unique: this._instance.options.unique
                            });
                        }
                        if (e.which == 27) {
                            // prevent default action on ESC
                            e.preventDefault();
                        }
                        break;
                    case 32: // space
                        item = focused;
                        if (this.isInode(focused) && !e.ctrlKey) {
                            // toggle the item
                            this.toggle(focused, {
                                collapse: this._instance.options.collapse,
                                expand: this._instance.options.expand,
                                unique: this._instance.options.unique
                            });
                        }
                        // prevent page scroll
                        e.preventDefault();
                        break;
                    case 106: // numpad [*]
                        item = focused;
                        if (this.isInode(focused)) {
                            // open all children
                            this.open(focused, {
                                collapse: this._instance.options.collapse,
                                expand: true,
                                unique: this._instance.options.unique
                            });
                        }
                        break;
                }
                if (item.length) {
                    if (this._instance.options.multiSelectable && !e.ctrlKey && !e.shiftKey) {
                        // unselect others
                        this._unselect(this.selected().not(item));
                    }
                    if (!this.isVisible(item)) {
                        // bring it into view
                        this.setVisible(item);
                    }
                    if (e.ctrlKey) {
                        if ((e.which == 32) && this.isEnabled(item)) { // space
                            if (this.isSelected(item)) {
                                this.deselect(item);
                            } else {
                                this.select(item);
                            }
                            // remember for later
                            this._private.spinPoint = item;
                        } else {
                            this._focusOne(item);
                        }
                    } else if (e.shiftKey) {
                        this._shiftSelect(item);
                    } else {
                        if (!this.isSelected(item) && this.isEnabled(item)) {
                            this.select(item);
                        } else {
                            this._focusOne(item);
                        }
                        // remember for later
                        this._private.spinPoint = item;
                    }
                    return false;
                }
            }));
            this._fullRow(this._instance.options.fullRow);
            this._multiSelectable(this._instance.options.multiSelectable);
        },
        // change full row mode
        _fullRow: function(state) {
            this._instance.jQuery.off(this._private.nameSpace, '.aciTreeLine,.aciTreeItem').off(this._private.nameSpace, '.aciTreeItem');
            this._instance.jQuery.on('mousedown' + this._private.nameSpace + ' click' + this._private.nameSpace, state ? '.aciTreeLine,.aciTreeItem' : '.aciTreeItem', this.proxy(function(e) {
                var item = this.itemFrom(e.target);
                if (!this.isVisible(item)) {
                    this.setVisible(item);
                }
                if (e.ctrlKey) {
                    if (e.type == 'click') {
                        if (this.isEnabled(item)) {
                            // (de)select item
                            if (this.isSelected(item)) {
                                this.deselect(item);
                                this._focusOne(item);
                            } else {
                                this.select(item);
                            }
                        } else {
                            this._focusOne(item);
                        }
                    }
                } else if (this._instance.options.multiSelectable && e.shiftKey) {
                    this._shiftSelect(item);
                } else {
                    if (this._instance.options.multiSelectable && (!this.isSelected(item) || (e.type == 'click'))) {
                        // deselect all other (keep the old focus)
                        this._unselect(this.selected().not(item));
                    }
                    this._selectOne(item);
                }
                if (!e.shiftKey) {
                    this._private.spinPoint = item;
                }
            })).on('dblclick' + this._private.nameSpace, state ? '.aciTreeLine,.aciTreeItem' : '.aciTreeItem', this.proxy(function(e) {
                var item = this.itemFrom(e.target);
                if (this.isInode(item)) {
                    // toggle the item
                    this.toggle(item, {
                        collapse: this._instance.options.collapse,
                        expand: this._instance.options.expand,
                        unique: this._instance.options.unique
                    });
                    return false;
                }
            }));
            if (state) {
                domApi.addClass(this._instance.jQuery[0], 'aciTreeFullRow');
            } else {
                domApi.removeClass(this._instance.jQuery[0], 'aciTreeFullRow');
            }
        },
        // change selection mode
        _multiSelectable: function(state) {
            if (state) {
                this._instance.jQuery.attr('aria-multiselectable', true);
            } else {
                var focused = this.focused();
                this._unselect(this.selected().not(focused));
                this._instance.jQuery.removeAttr('aria-multiselectable');
            }
        },
        // process `shift` key selection
        _shiftSelect: function(item) {
            var spinPoint = this._private.spinPoint;
            if (!spinPoint || !$.contains(this._instance.jQuery[0], spinPoint[0]) || !this.isOpenPath(spinPoint)) {
                spinPoint = this.focused();
            }
            if (spinPoint.length) {
                // select a range of items
                var select = [item[0]], start = spinPoint[0], found = false, stop = item[0];
                var visible = this.visible(this.children(null, true));
                visible.each(this.proxy(function(element) {
                    // find what items to select
                    if (found) {
                        if (this.isEnabled($(element))) {
                            select.push(element);
                        }
                        if ((element == start) || (element == stop)) {
                            return false;
                        }
                    } else if ((element == start) || (element == stop)) {
                        if (this.isEnabled($(element))) {
                            select.push(element);
                        }
                        if ((element == start) && (element == stop)) {
                            return false;
                        }
                        found = true;
                    }
                }, true));
                this._unselect(this.selected().not(select));
                // select the items
                $(select).not(item).each(this.proxy(function(element) {
                    var item = $(element);
                    if (!this.isSelected(item)) {
                        // select item (keep the old focus)
                        this.select(item, {
                            focus: false
                        });
                    }
                }, true));
            }
            this._selectOne(item);
        },
        // override `_initHook`
        _initHook: function() {
            if (this.extSelectable()) {
                this._selectableInit();
            }
            // call the parent
            this._super();
        },
        // override `_itemHook`
        _itemHook: function(parent, item, itemData, level) {
            if (this.extSelectable() && itemData.selected) {
                this._selectableDOM.select(item, true);
            }
            // call the parent
            this._super(parent, item, itemData, level);
        },
        // low level DOM functions
        _selectableDOM: {
            // (de)select one or more items
            select: function(items, state) {
                if (state) {
                    domApi.addListClass(items.toArray(), 'aciTreeSelected', function(node) {
                        node.firstChild.setAttribute('aria-selected', true);
                    });
                } else {
                    domApi.removeListClass(items.toArray(), 'aciTreeSelected', function(node) {
                        node.firstChild.setAttribute('aria-selected', false);
                    });
                }
            },
            // focus one item, unfocus one or more items
            focus: function(items, state) {
                if (state) {
                    domApi.addClass(items[0], 'aciTreeFocus');
                    items[0].firstChild.focus();
                } else {
                    domApi.removeListClass(items.toArray(), 'aciTreeFocus');
                }
            }
        },
        // make element (un)selectable
        _selectable: function(state) {
            if (state) {
                this._instance.jQuery.css({
                    '-webkit-user-select': 'text',
                    '-moz-user-select': 'text',
                    '-ms-user-select': 'text',
                    '-o-user-select': 'text',
                    'user-select': 'text'
                }).attr({
                    'unselectable': null,
                    'onselectstart': null
                }).unbind('selectstart' + this._private.nameSpace);
            } else {
                this._instance.jQuery.css({
                    '-webkit-user-select': 'none',
                    '-moz-user-select': '-moz-none',
                    '-ms-user-select': 'none',
                    '-o-user-select': 'none',
                    'user-select': 'none'
                }).attr({
                    'unselectable': 'on',
                    'onselectstart': 'return false'
                }).bind('selectstart' + this._private.nameSpace, function(e) {
                    if (!$(e.target).is('input,textarea')) {
                        return false;
                    }
                });
            }
        },
        // get first visible item
        _first: function() {
            return $(domApi.first(this._instance.jQuery[0], function(node) {
                return this.hasClass(node, 'aciTreeVisible') ? true : null;
            }));
        },
        // get last visible item
        _last: function() {
            return $(domApi.last(this._instance.jQuery[0], function(node) {
                return this.hasClass(node, 'aciTreeVisible') ? true : null;
            }));
        },
        // get previous visible starting with item
        _prev: function(item) {
            return $(domApi.prevAll(item[0], function(node) {
                return this.hasClass(node, 'aciTreeVisible') ? true : null;
            }));
        },
        // get next visible starting with item
        _next: function(item) {
            return $(domApi.nextAll(item[0], function(node) {
                return this.hasClass(node, 'aciTreeVisible') ? true : null;
            }));
        },
        // get previous page starting with item
        _prevPage: function(item) {
            var space = this._instance.jQuery.height();
            var now = item[0].firstChild.offsetHeight;
            var prev = item, last = $();
            while (now < space) {
                prev = this._prev(prev);
                if (prev[0]) {
                    now += prev[0].firstChild.offsetHeight;
                    last = prev;
                } else {
                    break;
                }
            }
            return last;
        },
        // get next page starting with item
        _nextPage: function(item) {
            var space = this._instance.jQuery.height();
            var now = item[0].firstChild.offsetHeight;
            var next = item, last = $();
            while (now < space) {
                next = this._next(next);
                if (next[0]) {
                    now += next[0].firstChild.offsetHeight;
                    last = next;
                } else {
                    break;
                }
            }
            return last;
        },
        // select one item
        _selectOne: function(item) {
            if (this.isSelected(item)) {
                this._focusOne(item);
            } else {
                if (this.isEnabled(item)) {
                    // select the item
                    this.select(item);
                } else {
                    this._focusOne(item);
                }
            }
        },
        // unselect the items
        _unselect: function(items) {
            items.each(this.proxy(function(element) {
                this.deselect($(element));
            }, true));
        },
        // focus one item
        _focusOne: function(item) {
            if (!this._instance.options.multiSelectable) {
                this._unselect(this.selected().not(item));
            }
            if (!this.isFocused(item)) {
                this.focus(item);
            }
        },
        // select item
        // `options.focus` when set to FALSE will not set the focus
        // `options.oldSelected` will keep the old selected items
        select: function(item, options) {
            options = this._options(options, 'selected', 'selectfail', 'wasselected', item);
            if (this.extSelectable() && this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeselect', options)) {
                    this._fail(item, options);
                    return;
                }
                // keep the old ones
                options.oldSelected = this.selected();
                if (!this._instance.options.multiSelectable) {
                    // deselect all other
                    var unselect = options.oldSelected.not(item);
                    this._selectableDOM.select(unselect, false);
                    unselect.each(this.proxy(function(element) {
                        this._trigger($(element), 'deselected', options);
                    }, true));
                }
                if (this.isSelected(item)) {
                    this._notify(item, options);
                } else {
                    this._selectableDOM.select(item, true);
                    this._success(item, options);
                }
                // process focus
                if ((options.focus === undefined) || options.focus) {
                    if (!this.isFocused(item) || options.focus) {
                        this.focus(item, this._inner(options));
                    }
                }
            } else {
                this._fail(item, options);
            }
        },
        // deselect item
        deselect: function(item, options) {
            options = this._options(options, 'deselected', 'deselectfail', 'notselected', item);
            if (this.extSelectable() && this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforedeselect', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isSelected(item)) {
                    this._selectableDOM.select(item, false);
                    this._success(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // set `virtual` focus
        // `options.oldFocused` will keep the old focused item
        focus: function(item, options) {
            options = this._options(options, 'focus', 'focusfail', 'wasfocused', item);
            if (this.extSelectable() && this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforefocus', options)) {
                    this._fail(item, options);
                    return;
                }
                // keep the old ones
                options.oldFocused = this.focused();
                // blur all other
                var unfocus = options.oldFocused.not(item);
                this._selectableDOM.focus(unfocus, false);
                // unfocus all others
                unfocus.each(this.proxy(function(element) {
                    this._trigger($(element), 'blur', options);
                }, true));
                if (this.isFocused(item)) {
                    this._notify(item, options);
                } else {
                    this._selectableDOM.focus(item, true);
                    this._success(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // remove `virtual` focus
        blur: function(item, options) {
            options = this._options(options, 'blur', 'blurfail', 'notfocused', item);
            if (this.extSelectable() && this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeblur', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isFocused(item)) {
                    this._selectableDOM.focus(item, false);
                    this._success(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // get selected items
        selected: function() {
            return this._instance.jQuery.find('.aciTreeSelected');
        },
        // override `_serialize`
        _serialize: function(item, callback) {
            // call the parent
            var data = this._super(item, callback);
            if (data && this.extSelectable()) {
                if (data.hasOwnProperty('selected')) {
                    data.selected = this.isSelected(item);
                } else if (this.isSelected(item)) {
                    data.selected = true;
                }
            }
            return data;
        },
        // test if item is selected
        isSelected: function(item) {
            return item && domApi.hasClass(item[0], 'aciTreeSelected');
        },
        // return the focused item
        focused: function() {
            return this._instance.jQuery.find('.aciTreeFocus');
        },
        // test if item is focused
        isFocused: function(item) {
            return item && domApi.hasClass(item[0], 'aciTreeFocus');
        },
        // test if selectable is enabled
        extSelectable: function() {
            return this._instance.options.selectable;
        },
        // override set `option`
        option: function(option, value) {
            if (this.wasInit() && !this.isLocked()) {
                if ((option == 'selectable') && (value != this.extSelectable())) {
                    if (value) {
                        this._selectableInit();
                    } else {
                        this._selectableDone();
                    }
                }
                if ((option == 'multiSelectable') && (value != this._instance.options.multiSelectable)) {
                    this._multiSelectable(value);
                }
                if ((option == 'fullRow') && (value != this._instance.options.fullRow)) {
                    this._fullRow(value);
                }
                if ((option == 'textSelection') && (value != this._instance.options.textSelection)) {
                    this._selectable(value);
                }
            }
            // call the parent
            this._super(option, value);
        },
        // done selectable
        _selectableDone: function(destroy) {
            if (this._instance.jQuery.attr('tabindex') == 0) {
                this._instance.jQuery.removeAttr('tabindex');
            }
            if (!this._instance.options.textSelection) {
                this._selectable(true);
            }
            this._instance.jQuery.unbind(this._private.nameSpace);
            this._instance.jQuery.off(this._private.nameSpace, '.aciTreeLine,.aciTreeItem').off(this._private.nameSpace, '.aciTreeItem');
            domApi.removeClass(this._instance.jQuery[0], ['aciTreeFocus', 'aciTreeFullRow']);
            this._instance.jQuery.removeAttr('aria-multiselectable');
            this._instance.focus = false;
            this._private.spinPoint = null;
            if (!destroy) {
                // remove selection
                this._unselect(this.selected());
                var focused = this.focused();
                if (focused.length) {
                    this.blur(focused);
                }
            }
        },
        // override `_destroyHook`
        _destroyHook: function(unloaded) {
            if (unloaded) {
                this._selectableDone(true);
            }
            // call the parent
            this._super(unloaded);
        }

    };

    // extend the base aciTree class and add the selectable stuff
    aciPluginClass.plugins.aciTree = aciPluginClass.plugins.aciTree.extend(aciTree_selectable, 'aciTreeSelectable');

    // add extra default options
    aciPluginClass.defaults('aciTree', options);

    // for internal access
    var domApi = aciPluginClass.plugins.aciTree_dom;

})(jQuery, this);

/*
 * aciTree jQuery Plugin v4.5.0-rc.7
 * http://acoderinsights.ro
 *
 * Copyright (c) 2014 Dragos Ursu
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Require jQuery Library >= v1.9.0 http://jquery.com
 * + aciPlugin >= v1.5.1 https://github.com/dragosu/jquery-aciPlugin
 */

/*
 * This extension adds checkbox support to aciTree,
 * should be used with the selectable extension.
 *
 * The are a few extra properties for the item data:
 *
 * {
 *   ...
 *   checkbox: true,                    // TRUE (default) means the item will have a checkbox (can be omitted if the `radio` extension is not used)
 *   checked: false,                    // if should be checked or not
 *   ...
 * }
 *
 */

(function($, window, undefined) {

    // extra default options

    var options = {
        checkbox: false,                // if TRUE then each item will have a checkbox
        checkboxChain: true,
        // if TRUE the selection will propagate to the parents/children
        // if -1 the selection will propagate only to parents
        // if +1 the selection will propagate only to children
        // if FALSE the selection will not propagate in any way
        checkboxBreak: true,            // if TRUE then a missing checkbox will break the chaining
        checkboxClick: false            // if TRUE then a click will trigger a state change only when made over the checkbox itself
    };

    // aciTree checkbox extension

    var aciTree_checkbox = {
        // init checkbox
        _checkboxInit: function() {
            this._instance.jQuery.bind('acitree' + this._private.nameSpace, function(event, api, item, eventName, options) {
                switch (eventName) {
                    case 'loaded':
                        // check/update on item load
                        api._checkboxLoad(item);
                        break;
                }
            }).bind('keydown' + this._private.nameSpace, this.proxy(function(e) {
                switch (e.which) {
                    case 32: // space
                        // support `selectable` extension
                        if (this.extSelectable && this.extSelectable() && !e.ctrlKey) {
                            var item = this.focused();
                            if (this.hasCheckbox(item) && this.isEnabled(item)) {
                                if (this.isChecked(item)) {
                                    this.uncheck(item);
                                } else {
                                    this.check(item);
                                }
                                e.stopImmediatePropagation();
                                // prevent page scroll
                                e.preventDefault();
                            }
                        }
                        break;
                }
            })).on('click' + this._private.nameSpace, '.aciTreeItem', this.proxy(function(e) {
                if (!this._instance.options.checkboxClick || $(e.target).is('.aciTreeCheck')) {
                    var item = this.itemFrom(e.target);
                    if (this.hasCheckbox(item) && this.isEnabled(item) && (!this.extSelectable || !this.extSelectable() || (!e.ctrlKey && !e.shiftKey))) {
                        // change state on click
                        if (this.isChecked(item)) {
                            this.uncheck(item);
                        } else {
                            this.check(item);
                        }
                        e.preventDefault();
                    }
                }
            }));
        },
        // override `_initHook`
        _initHook: function() {
            if (this.extCheckbox()) {
                this._checkboxInit();
            }
            // call the parent
            this._super();
        },
        // override `_itemHook`
        _itemHook: function(parent, item, itemData, level) {
            if (this.extCheckbox()) {
                // support `radio` extension
                var radio = this.extRadio && this.hasRadio(item);
                if (!radio && (itemData.checkbox || ((itemData.checkbox === undefined) && (!this.extRadio || !this.extRadio())))) {
                    this._checkboxDOM.add(item, itemData);
                }
            }
            // call the parent
            this._super(parent, item, itemData, level);
        },
        // low level DOM functions
        _checkboxDOM: {
            // add item checkbox
            add: function(item, itemData) {
                domApi.addClass(item[0], itemData.checked ? ['aciTreeCheckbox', 'aciTreeChecked'] : 'aciTreeCheckbox');
                var text = domApi.childrenByClass(item[0].firstChild, 'aciTreeText');
                var parent = text.parentNode;
                var label = window.document.createElement('LABEL');
                var check = window.document.createElement('SPAN');
                check.className = 'aciTreeCheck';
                label.appendChild(check);
                label.appendChild(text);
                parent.appendChild(label);
                item[0].firstChild.setAttribute('aria-checked', !!itemData.checked);
            },
            // remove item checkbox
            remove: function(item) {
                domApi.removeClass(item[0], ['aciTreeCheckbox', 'aciTreeChecked', 'aciTreeTristate']);
                var text = domApi.childrenByClass(item[0].firstChild, 'aciTreeText');
                var label = text.parentNode;
                var parent = label.parentNode;
                parent.replaceChild(text, label)
                item[0].firstChild.removeAttribute('aria-checked');
            },
            // (un)check items
            check: function(items, state) {
                domApi.toggleListClass(items.toArray(), 'aciTreeChecked', state, function(node) {
                    node.firstChild.setAttribute('aria-checked', state);
                });
            },
            // (un)set tristate items
            tristate: function(items, state) {
                domApi.toggleListClass(items.toArray(), 'aciTreeTristate', state);
            }
        },
        // update items on load, starting from the loaded node
        _checkboxLoad: function(item) {
            if (this._instance.options.checkboxChain === false) {
                // do not update on load
                return;
            }
            var state = undefined;
            if (this.hasCheckbox(item)) {
                if (this.isChecked(item)) {
                    if (!this.checkboxes(this.children(item, false, true), true).length) {
                        // the item is checked but no children are, check them all
                        state = true;
                    }
                } else {
                    // the item is not checked, uncheck all children
                    state = false;
                }
            }
            this._checkboxUpdate(item, state);
        },
        // get children list
        _checkboxChildren: function(item) {
            if (this._instance.options.checkboxBreak) {
                var list = [];
                var process = this.proxy(function(item) {
                    var children = this.children(item, false, true);
                    children.each(this.proxy(function(element) {
                        var item = $(element);
                        // break on missing checkbox
                        if (this.hasCheckbox(item)) {
                            list.push(element);
                            process(item);
                        }
                    }, true));
                });
                process(item);
                return $(list);
            } else {
                var children = this.children(item, true, true);
                return this.checkboxes(children);
            }
        },
        // update checkbox state
        _checkboxUpdate: function(item, state) {
            // update children
            var checkDown = this.proxy(function(item, count, state) {
                var children = this.children(item, false, true);
                var total = 0;
                var checked = 0;
                children.each(this.proxy(function(element) {
                    var item = $(element);
                    var subCount = {
                        total: 0,
                        checked: 0
                    };
                    if (this.hasCheckbox(item)) {
                        if ((state !== undefined) && (this._instance.options.checkboxChain !== -1)) {
                            this._checkboxDOM.check(item, state);
                        }
                        total++;
                        if (this.isChecked(item)) {
                            checked++;
                        }
                        checkDown(item, subCount, state);
                    } else {
                        if (this._instance.options.checkboxBreak) {
                            var reCount = {
                                total: 0,
                                checked: 0
                            };
                            checkDown(item, reCount);
                        } else {
                            checkDown(item, subCount, state);
                        }
                    }
                    total += subCount.total;
                    checked += subCount.checked;
                }, true));
                if (item) {
                    this._checkboxDOM.tristate(item, (checked > 0) && (checked != total));
                    count.total += total;
                    count.checked += checked;
                }
            });
            var count = {
                total: 0,
                checked: 0
            };
            checkDown(item, count, state);
            // update parents
            var checkUp = this.proxy(function(item, tristate, state) {
                var parent = this.parent(item);
                if (parent.length) {
                    if (!tristate) {
                        var children = this._checkboxChildren(parent);
                        var checked = this.checkboxes(children, true).length;
                        var tristate = (checked > 0) && (checked != children.length);
                    }
                    if (this.hasCheckbox(parent)) {
                        if ((state !== undefined) && (this._instance.options.checkboxChain !== 1)) {
                            this._checkboxDOM.check(parent, tristate ? true : state);
                        }
                        this._checkboxDOM.tristate(parent, tristate);
                        checkUp(parent, tristate, state);
                    } else {
                        if (this._instance.options.checkboxBreak) {
                            checkUp(parent);
                        } else {
                            checkUp(parent, tristate, state);
                        }
                    }
                }
            });
            checkUp(item, undefined, state);
        },
        // test if item have a checkbox
        hasCheckbox: function(item) {
            return item && domApi.hasClass(item[0], 'aciTreeCheckbox');
        },
        // add checkbox
        addCheckbox: function(item, options) {
            options = this._options(options, 'checkboxadded', 'addcheckboxfail', 'wascheckbox', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeaddcheckbox', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.hasCheckbox(item)) {
                    this._notify(item, options);
                } else {
                    var process = function() {
                        this._checkboxDOM.add(item, {
                        });
                        this._success(item, options);
                    };
                    // support `radio` extension
                    if (this.extRadio && this.hasRadio(item)) {
                        // remove radio first
                        this.removeRadio(item, this._inner(options, {
                            success: process,
                            fail: options.fail
                        }));
                    } else {
                        process.apply(this);
                    }
                }
            } else {
                this._fail(item, options);
            }
        },
        // remove checkbox
        removeCheckbox: function(item, options) {
            options = this._options(options, 'checkboxremoved', 'removecheckboxfail', 'notcheckbox', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeremovecheckbox', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.hasCheckbox(item)) {
                    this._checkboxDOM.remove(item);
                    this._success(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // test if it's checked
        isChecked: function(item) {
            if (this.hasCheckbox(item)) {
                return domApi.hasClass(item[0], 'aciTreeChecked');
            }
            // support `radio` extension
            if (this._super) {
                // call the parent
                return this._super(item);
            }
            return false;
        },
        // check checkbox
        check: function(item, options) {
            if (this.extCheckbox && this.hasCheckbox(item)) {
                options = this._options(options, 'checked', 'checkfail', 'waschecked', item);
                // a way to cancel the operation
                if (!this._trigger(item, 'beforecheck', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isChecked(item)) {
                    this._notify(item, options);
                } else {
                    this._checkboxDOM.check(item, true);
                    if (this._instance.options.checkboxChain !== false) {
                        // chain them
                        this._checkboxUpdate(item, true);
                    }
                    this._success(item, options);
                }
            } else {
                // support `radio` extension
                if (this._super) {
                    // call the parent
                    this._super(item, options);
                } else {
                    this._trigger(item, 'checkfail', options);
                    this._fail(item, options);
                }
            }
        },
        // uncheck checkbox
        uncheck: function(item, options) {
            if (this.extCheckbox && this.hasCheckbox(item)) {
                options = this._options(options, 'unchecked', 'uncheckfail', 'notchecked', item);
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeuncheck', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isChecked(item)) {
                    this._checkboxDOM.check(item, false);
                    if (this._instance.options.checkboxChain !== false) {
                        // chain them
                        this._checkboxUpdate(item, false);
                    }
                    this._success(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                // support `radio` extension
                if (this._super) {
                    // call the parent
                    this._super(item, options);
                } else {
                    this._trigger(item, 'uncheckfail', options);
                    this._fail(item, options);
                }
            }
        },
        // filter items with checkbox by state (if set)
        checkboxes: function(items, state) {
            if (state !== undefined) {
                return $(domApi.withClass(items.toArray(), state ? ['aciTreeCheckbox', 'aciTreeChecked'] : 'aciTreeCheckbox', state ? null : 'aciTreeChecked'));
            }
            return $(domApi.withClass(items.toArray(), 'aciTreeCheckbox'));
        },
        // override `_serialize`
        _serialize: function(item, callback) {
            var data = this._super(item, callback);
            if (data && this.extCheckbox()) {
                if (data.hasOwnProperty('checkbox')) {
                    data.checkbox = this.hasCheckbox(item);
                    data.checked = this.isChecked(item);
                } else if (this.hasCheckbox(item)) {
                    if (this.extRadio && this.extRadio()) {
                        data.checkbox = true;
                    }
                    data.checked = this.isChecked(item);
                }
            }
            return data;
        },
        // override `serialize`
        serialize: function(item, what, callback) {
            if (what == 'checkbox') {
                var serialized = '';
                var children = this.children(item, true, true);
                this.checkboxes(children, true).each(this.proxy(function(element) {
                    var item = $(element);
                    if (callback) {
                        serialized += callback.call(this, item, what, this.getId(item));
                    } else {
                        serialized += this._instance.options.serialize.call(this, item, what, this.getId(item));
                    }
                }, true));
                return serialized;
            }
            return this._super(item, what, callback);
        },
        // test if item is in tristate
        isTristate: function(item) {
            return item && domApi.hasClass(item[0], 'aciTreeTristate');
        },
        // filter tristate items
        tristate: function(items) {
            return $(domApi.withClass(items.toArray(), 'aciTreeTristate'));
        },
        // test if checkbox is enabled
        extCheckbox: function() {
            return this._instance.options.checkbox;
        },
        // override set `option`
        option: function(option, value) {
            if (this.wasInit() && !this.isLocked()) {
                if ((option == 'checkbox') && (value != this.extCheckbox())) {
                    if (value) {
                        this._checkboxInit();
                    } else {
                        this._checkboxDone();
                    }
                }
            }
            // call the parent
            this._super(option, value);
        },
        // done checkbox
        _checkboxDone: function(destroy) {
            this._instance.jQuery.unbind(this._private.nameSpace);
            this._instance.jQuery.off(this._private.nameSpace, '.aciTreeItem');
            if (!destroy) {
                // remove checkboxes
                this.checkboxes(this.children(null, true, true)).each(this.proxy(function(element) {
                    this.removeCheckbox($(element));
                }, true));
            }
        },
        // override `_destroyHook`
        _destroyHook: function(unloaded) {
            if (unloaded) {
                this._checkboxDone(true);
            }
            // call the parent
            this._super(unloaded);
        }

    };

    // extend the base aciTree class and add the checkbox stuff
    aciPluginClass.plugins.aciTree = aciPluginClass.plugins.aciTree.extend(aciTree_checkbox, 'aciTreeCheckbox');

    // add extra default options
    aciPluginClass.defaults('aciTree', options);

    // for internal access
    var domApi = aciPluginClass.plugins.aciTree_dom;

})(jQuery, this);

/*
 * aciTree jQuery Plugin v4.5.0-rc.7
 * http://acoderinsights.ro
 *
 * Copyright (c) 2014 Dragos Ursu
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Require jQuery Library >= v1.9.0 http://jquery.com
 * + aciPlugin >= v1.5.1 https://github.com/dragosu/jquery-aciPlugin
 */

/*
 * This extension adds radio-button support to aciTree,
 * should be used with the selectable extension.
 *
 * The are a few extra properties for the item data:
 *
 * {
 *   ...
 *   radio: true,                       // TRUE (default) means the item will have a radio button (can be omitted if the `checkbox` extension is not used)
 *   checked: false,                    // if should be checked or not
 *   ...
 * }
 *
 */

(function($, window, undefined) {

    // extra default options

    var options = {
        radio: false,                   // if TRUE then each item will have a radio button
        radioChain: true,               // if TRUE the selection will propagate to the parents/children
        radioBreak: true,               // if TRUE then a missing radio button will break the chaining
        radioClick: false               // if TRUE then a click will trigger a state change only when made over the radio-button itself
    };

    // aciTree radio extension

    var aciTree_radio = {
        // init radio
        _radioInit: function() {
            this._instance.jQuery.bind('acitree' + this._private.nameSpace, function(event, api, item, eventName, options) {
                switch (eventName) {
                    case 'loaded':
                        if (item) {
                            // check/update on item load
                            api._radioLoad(item);
                        }
                        break;
                }
            }).bind('keydown' + this._private.nameSpace, this.proxy(function(e) {
                switch (e.which) {
                    case 32: // space
                        // support `selectable` extension
                        if (this.extSelectable && this.extSelectable() && !e.ctrlKey) {
                            var item = this.focused();
                            if (this.hasRadio(item) && this.isEnabled(item)) {
                                if (!this.isChecked(item)) {
                                    this.check(item);
                                }
                                e.stopImmediatePropagation();
                                // prevent page scroll
                                e.preventDefault();
                            }
                        }
                        break;
                }
            })).on('click' + this._private.nameSpace, '.aciTreeItem', this.proxy(function(e) {
                if (!this._instance.options.radioClick || $(e.target).is('.aciTreeCheck')) {
                    var item = this.itemFrom(e.target);
                    if (this.hasRadio(item) && this.isEnabled(item) && (!this.extSelectable || !this.extSelectable() || (!e.ctrlKey && !e.shiftKey))) {
                        // change state on click
                        if (!this.isChecked(item)) {
                            this.check(item);
                        }
                        e.preventDefault();
                    }
                }
            }));
        },
        // override `_initHook`
        _initHook: function() {
            if (this.extRadio()) {
                this._radioInit();
            }
            // call the parent
            this._super();
        },
        // override `_itemHook`
        _itemHook: function(parent, item, itemData, level) {
            if (this.extRadio()) {
                // support `checkbox` extension
                var checkbox = this.extCheckbox && this.hasCheckbox(item);
                if (!checkbox && (itemData.radio || ((itemData.radio === undefined) && (!this.extCheckbox || !this.extCheckbox())))) {
                    this._radioDOM.add(item, itemData);
                }
            }
            // call the parent
            this._super(parent, item, itemData, level);
        },
        // low level DOM functions
        _radioDOM: {
            // add item radio
            add: function(item, itemData) {
                domApi.addClass(item[0], itemData.checked ? ['aciTreeRadio', 'aciTreeChecked'] : 'aciTreeRadio');
                var text = domApi.childrenByClass(item[0].firstChild, 'aciTreeText');
                var parent = text.parentNode;
                var label = window.document.createElement('LABEL');
                var check = window.document.createElement('SPAN');
                check.className = 'aciTreeCheck';
                label.appendChild(check);
                label.appendChild(text);
                parent.appendChild(label);
                item[0].firstChild.setAttribute('aria-checked', !!itemData.checked);
            },
            // remove item radio
            remove: function(item) {
                domApi.removeClass(item[0], ['aciTreeRadio', 'aciTreeChecked']);
                var text = domApi.childrenByClass(item[0].firstChild, 'aciTreeText');
                var label = text.parentNode;
                var parent = label.parentNode;
                parent.replaceChild(text, label)
                item[0].firstChild.removeAttribute('aria-checked');
            },
            // (un)check items
            check: function(items, state) {
                domApi.toggleListClass(items.toArray(), 'aciTreeChecked', state, function(node) {
                    node.firstChild.setAttribute('aria-checked', state);
                });
            }
        },
        // update item on load
        _radioLoad: function(item) {
            if (!this._instance.options.radioChain) {
                // do not update on load
                return;
            }
            if (this.hasRadio(item)) {
                if (this.isChecked(item)) {
                    if (!this.radios(this.children(item, false, true), true).length) {
                        // the item is checked but no children are, check the children
                        this._radioUpdate(item, true);
                    }
                } else {
                    // the item is not checked, uncheck children
                    this._radioUpdate(item);
                }
            }
        },
        // get children list
        _radioChildren: function(item) {
            if (this._instance.options.radioBreak) {
                var list = [];
                var process = this.proxy(function(item) {
                    var children = this.children(item, false, true);
                    children.each(this.proxy(function(element) {
                        var item = $(element);
                        // break on missing radio
                        if (this.hasRadio(item)) {
                            list.push(element);
                            process(item);
                        }
                    }, true));
                });
                process(item);
                return $(list);
            } else {
                var children = this.children(item, true, true);
                return this.radios(children);
            }
        },
        // get children across items
        _radioLevel: function(items) {
            var list = [];
            items.each(this.proxy(function(element) {
                var item = $(element);
                var children = this.children(item, false, true);
                children.each(this.proxy(function(element) {
                    var item = $(element);
                    if (!this._instance.options.radioBreak || this.hasRadio(item)) {
                        list.push(element);
                    }
                }, true));
            }, true));
            return $(list);
        },
        // update radio state
        _radioUpdate: function(item, state) {
            // update siblings
            var siblings = this.proxy(function(item) {
                var siblings = this.siblings(item, true);
                this._radioDOM.check(this.radios(siblings), false);
                siblings.each(this.proxy(function(element) {
                    var item = $(element);
                    if (!this._instance.options.radioBreak || this.hasRadio(item)) {
                        this._radioDOM.check(this._radioChildren(item), false);
                    }
                }, true));
            });
            if (state) {
                siblings(item);
            }
            // update children
            var checkDown = this.proxy(function(item) {
                var children = this._radioLevel(item);
                var radios = this.radios(children);
                if (radios.length) {
                    var checked = this.radios(children, true);
                    if (checked.length) {
                        checked = checked.first();
                        this._radioDOM.check(checked, true);
                        siblings(checked);
                        checkDown(checked);
                    } else {
                        checked = radios.first();
                        this._radioDOM.check(checked, true);
                        siblings(checked);
                        checkDown(checked);
                    }
                } else if (children.length) {
                    checkDown(children);
                }
            });
            if (state) {
                checkDown(item);
            } else {
                this._radioDOM.check(this._radioChildren(item), false);
            }
            // update parents
            var checkUp = this.proxy(function(item) {
                var parent = this.parent(item);
                if (parent.length) {
                    if (this.hasRadio(parent)) {
                        if (state) {
                            siblings(parent);
                        }
                        this._radioDOM.check(parent, state);
                        checkUp(parent);
                    } else {
                        if (!this._instance.options.radioBreak) {
                            if (state) {
                                siblings(parent);
                            }
                            checkUp(parent);
                        }
                    }
                }
            });
            if (state !== undefined) {
                checkUp(item);
            }
        },
        // test if item have a radio
        hasRadio: function(item) {
            return item && domApi.hasClass(item[0], 'aciTreeRadio');
        },
        // add radio button
        addRadio: function(item, options) {
            options = this._options(options, 'radioadded', 'addradiofail', 'wasradio', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeaddradio', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.hasRadio(item)) {
                    this._notify(item, options);
                } else {
                    var process = function() {
                        this._radioDOM.add(item, {
                        });
                        this._success(item, options);
                    };
                    // support `checkbox` extension
                    if (this.extCheckbox && this.hasCheckbox(item)) {
                        // remove checkbox first
                        this.removeCheckbox(item, this._inner(options, {
                            success: process,
                            fail: options.fail
                        }));
                    } else {
                        process.apply(this);
                    }
                }
            } else {
                this._fail(item, options);
            }
        },
        // remove radio button
        removeRadio: function(item, options) {
            options = this._options(options, 'radioremoved', 'removeradiofail', 'notradio', item);
            if (this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeremoveradio', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.hasRadio(item)) {
                    this._radioDOM.remove(item);
                    this._success(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // test if it's checked
        isChecked: function(item) {
            if (this.hasRadio(item)) {
                return domApi.hasClass(item[0], 'aciTreeChecked');
            }
            // support `checkbox` extension
            if (this._super) {
                // call the parent
                return this._super(item);
            }
            return false;
        },
        // check radio button
        check: function(item, options) {
            if (this.extRadio && this.hasRadio(item)) {
                options = this._options(options, 'checked', 'checkfail', 'waschecked', item);
                // a way to cancel the operation
                if (!this._trigger(item, 'beforecheck', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isChecked(item)) {
                    this._notify(item, options);
                } else {
                    this._radioDOM.check(item, true);
                    if (this._instance.options.radioChain) {
                        // chain them
                        this._radioUpdate(item, true);
                    }
                    this._success(item, options);
                }
            } else {
                // support `checkbox` extension
                if (this._super) {
                    // call the parent
                    this._super(item, options);
                } else {
                    this._trigger(item, 'checkfail', options);
                    this._fail(item, options);
                }
            }
        },
        // uncheck radio button
        uncheck: function(item, options) {
            if (this.extRadio && this.hasRadio(item)) {
                options = this._options(options, 'unchecked', 'uncheckfail', 'notchecked', item);
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeuncheck', options)) {
                    this._fail(item, options);
                    return;
                }
                if (this.isChecked(item)) {
                    this._radioDOM.check(item, false);
                    if (this._instance.options.radioChain) {
                        // chain them
                        this._radioUpdate(item, false);
                    }
                    this._success(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                // support `checkbox` extension
                if (this._super) {
                    // call the parent
                    this._super(item, options);
                } else {
                    this._trigger(item, 'uncheckfail', options);
                    this._fail(item, options);
                }
            }
        },
        // filter items with radio by state (if set)
        radios: function(items, state) {
            if (state !== undefined) {
                return $(domApi.withClass(items.toArray(), state ? ['aciTreeRadio', 'aciTreeChecked'] : 'aciTreeRadio', state ? null : 'aciTreeChecked'));
            }
            return $(domApi.withClass(items.toArray(), 'aciTreeRadio'));
        },
        // override `_serialize`
        _serialize: function(item, callback) {
            var data = this._super(item, callback);
            if (data && this.extRadio()) {
                if (data.hasOwnProperty('radio')) {
                    data.radio = this.hasRadio(item);
                    data.checked = this.isChecked(item);
                } else if (this.hasRadio(item)) {
                    if (this.extCheckbox && this.extCheckbox()) {
                        data.radio = true;
                    }
                    data.checked = this.isChecked(item);
                }
            }
            return data;
        },
        // override `serialize`
        serialize: function(item, what, callback) {
            if (what == 'radio') {
                var serialized = '';
                var children = this.children(item, true, true);
                this.radios(children, true).each(this.proxy(function(element) {
                    var item = $(element);
                    if (callback) {
                        serialized += callback.call(this, item, what, this.getId(item));
                    } else {
                        serialized += this._instance.options.serialize.call(this, item, what, this.getId(item));
                    }
                }, true));
                return serialized;
            }
            return this._super(item, what, callback);
        },
        // test if radio is enabled
        extRadio: function() {
            return this._instance.options.radio;
        },
        // override set `option`
        option: function(option, value) {
            if (this.wasInit() && !this.isLocked()) {
                if ((option == 'radio') && (value != this.extRadio())) {
                    if (value) {
                        this._radioInit();
                    } else {
                        this._radioDone();
                    }
                }
            }
            // call the parent
            this._super(option, value);
        },
        // done radio
        _radioDone: function(destroy) {
            this._instance.jQuery.unbind(this._private.nameSpace);
            this._instance.jQuery.off(this._private.nameSpace, '.aciTreeItem');
            if (!destroy) {
                // remove radios
                this.radios(this.children(null, true, true)).each(this.proxy(function(element) {
                    this.removeRadio($(element));
                }, true));
            }
        },
        // override `_destroyHook`
        _destroyHook: function(unloaded) {
            if (unloaded) {
                this._radioDone(true);
            }
            // call the parent
            this._super(unloaded);
        }

    };

    // extend the base aciTree class and add the radio stuff
    aciPluginClass.plugins.aciTree = aciPluginClass.plugins.aciTree.extend(aciTree_radio, 'aciTreeRadio');

    // add extra default options
    aciPluginClass.defaults('aciTree', options);

    // for internal access
    var domApi = aciPluginClass.plugins.aciTree_dom;

})(jQuery, this);

/*
 * aciTree jQuery Plugin v4.5.0-rc.7
 * http://acoderinsights.ro
 *
 * Copyright (c) 2014 Dragos Ursu
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Require jQuery Library >= v1.9.0 http://jquery.com
 * + aciPlugin >= v1.5.1 https://github.com/dragosu/jquery-aciPlugin
 */

/*
 * This extension adds multiple column support to aciTree.
 *
 * The `columnData` option is used to tell what are the columns and show one or
 * more values that will be read from the item data object.
 *
 * Column data is an array of column definitions, each column definition is
 * an object:
 *
 * {
 *   width: 100,
 *   props: 'column_x',
 *   value: 'default'
 * }
 *
 * where the `width` is the column width in [px], if undefined - then the value
 * from the CSS will be used; the `props` is the property name that will be
 * read from the item data, if undefined (or the `item-data[column.props]`
 * is undefined) then a default value will be set for the column: the `value`.
 *
 */

(function($, window, undefined) {

    // extra default options

    var options = {
        columnData: []                  // column definitions list
    };

    // aciTree columns extension
    // adds item columns, set width with CSS or using the API

    var aciTree_column = {
        __extend: function() {
            // add extra data
            $.extend(this._private, {
                propsIndex: { // column index cache
                }
            });
            // call the parent
            this._super();
        },
        // override `_initHook`
        _initHook: function() {
            if (this._instance.options.columnData.length) {
                // check column width
                var found = false, data;
                for (var i in this._instance.options.columnData) {
                    data = this._instance.options.columnData[i];
                    if (data.width !== undefined) {
                        // update column width
                        this._updateCss('.aciTree.aciTree' + this._instance.index + ' .aciTreeColumn' + i, 'width:' + data.width + 'px;');
                        found = true;
                    }
                    this._private.propsIndex[data.props] = i;
                }
                if (found) {
                    // at least a column width set
                    this._updateWidth();
                }
            }
            // call the parent
            this._super();
        },
        // read property value from a CSS class name
        _getCss: function(className, property, numeric) {
            var id = '_getCss_' + window.String(className).replace(/[^a-z0-9_-]/ig, '_');
            var test = $('body').find('#' + id);
            if (!test.length) {
                if (className instanceof Array) {
                    var style = '', end = '';
                    for (var i in className) {
                        style += '<div class="' + className[i] + '">';
                        end += '</div>';
                    }
                    style += end;
                } else {
                    var style = '<div class="' + className + '"></div>';
                }
                $('body').append('<div id="' + id + '" style="position:relative;display:inline-block;width:0px;height:0px;line-height:0px;overflow:hidden">' + style + '</div>');
                test = $('body').find('#' + id);
            }
            var value = test.find('*:last').css(property);
            if (numeric) {
                value = parseInt(value);
                if (isNaN(value)) {
                    value = null;
                }
            }
            return value;
        },
        // dynamically change a CSS class definition
        _updateCss: function(className, definition) {
            var id = '_updateCss_' + window.String(className).replace('>', '_gt_').replace(/[^a-z0-9_-]/ig, '_');
            var style = '<style id="' + id + '" type="text/css">' + className + '{' + definition + '}</style>';
            var test = $('body').find('#' + id);
            if (test.length) {
                test.replaceWith(style);
            } else {
                $('body').prepend(style);
            }
        },
        // get column width
        // `index` is the #0 based column index
        getWidth: function(index) {
            if ((index >= 0) && (index < this.columns())) {
                return this._getCss(['aciTree aciTree' + this._instance.index, 'aciTreeColumn' + index], 'width', true);
            }
            return null;
        },
        // set column width
        // `index` is the #0 based column index
        setWidth: function(index, width) {
            if ((index >= 0) && (index < this.columns())) {
                this._updateCss('.aciTree.aciTree' + this._instance.index + ' .aciTreeColumn' + index, 'width:' + width + 'px;');
                this._updateWidth();
            }
        },
        // update item margins
        _updateWidth: function() {
            var width = 0;
            for (var i in this._instance.options.columnData) {
                if (this.isColumn(i)) {
                    width += this.getWidth(i);
                }
            }
            var icon = this._getCss(['aciTree', 'aciTreeIcon'], 'width', true);
            // add item padding
            width += this._getCss(['aciTree', 'aciTreeItem'], 'padding-left', true) + this._getCss(['aciTree', 'aciTreeItem'], 'padding-right', true);
            this._updateCss('.aciTree.aciTree' + this._instance.index + ' .aciTreeItem', 'margin-right:' + (icon + width) + 'px;');
            this._updateCss('.aciTree[dir=rtl].aciTree' + this._instance.index + ' .aciTreeItem', 'margin-right:0;margin-left:' + (icon + width) + 'px;');
        },
        // test if column is visible
        // `index` is the #0 based column index
        isColumn: function(index) {
            if ((index >= 0) && (index < this.columns())) {
                return this._getCss(['aciTree aciTree' + this._instance.index, 'aciTreeColumn' + index], 'display') != 'none';
            }
            return false;
        },
        // get column index by `props`
        // return -1 if the column does not exists
        columnIndex: function(props) {
            if (this._private.propsIndex[props] !== undefined) {
                return this._private.propsIndex[props];
            }
            return -1;
        },
        // get the column count
        columns: function() {
            return this._instance.options.columnData.length;
        },
        // set column to be visible or hidden
        // `index` is the #0 based column index
        // if `show` is undefined then the column visibility will be toggled
        toggleColumn: function(index, show) {
            if ((index >= 0) && (index < this.columns())) {
                if (show === undefined) {
                    var show = !this.isColumn(index);
                }
                this._updateCss('.aciTree.aciTree' + this._instance.index + ' .aciTreeColumn' + index, 'display:' + (show ? 'inherit' : 'none') + ';');
                this._updateWidth();
            }
        },
        // override `_itemHook`
        _itemHook: function(parent, item, itemData, level) {
            if (this.columns()) {
                var position = domApi.childrenByClass(item[0].firstChild, 'aciTreeEntry'), data, column;
                for (var i in this._instance.options.columnData) {
                    data = this._instance.options.columnData[i];
                    column = this._createColumn(itemData, data, i);
                    position.insertBefore(column, position.firstChild);
                }
            }
            // call the parent
            this._super(parent, item, itemData, level);
        },
        // create column markup
        // `itemData` item data object
        // `columnData` column data definition
        // `index` is the #0 based column index
        _createColumn: function(itemData, columnData, index) {
            var value = columnData.props && (itemData[columnData.props] !== undefined) ? itemData[columnData.props] :
                    ((columnData.value === undefined) ? '' : columnData.value);
            var column = window.document.createElement('DIV');
            column.className = 'aciTreeColumn aciTreeColumn' + index;
            column.innerHTML = value.length ? value : '&nbsp;';
            return column;
        },
        // set column content
        // `options.index` the #0 based column index
        // `options.value` is the new content
        // `options.oldValue` will keep the old content
        setColumn: function(item, options) {
            options = this._options(options, 'columnset', 'columnfail', 'wascolumn', item);
            if (this.isItem(item) && (options.index >= 0) && (options.index < this.columns())) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforecolumn', options)) {
                    this._fail(item, options);
                    return;
                }
                var data = this.itemData(item);
                // keep the old one
                options.oldValue = data[this._instance.options.columnData[options.index].props];
                if (options.value == options.oldValue) {
                    this._notify(item, options);
                } else {
                    // set the column
                    item.children('.aciTreeLine').find('.aciTreeColumn' + options.index).html(options.value);
                    // remember this one
                    data[this._instance.options.columnData[options.index].props] = options.value;
                    this._success(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // get column content
        getColumn: function(item, index) {
            if ((index >= 0) && (index < this.columns())) {
                var data = this.itemData(item);
                return data ? data[this._instance.options.columnData[index].props] : null;
            }
            return null;
        }
    };

    // extend the base aciTree class and add the columns stuff
    aciPluginClass.plugins.aciTree = aciPluginClass.plugins.aciTree.extend(aciTree_column, 'aciTreeColumn');

    // add extra default options
    aciPluginClass.defaults('aciTree', options);

    // for internal access
    var domApi = aciPluginClass.plugins.aciTree_dom;

})(jQuery, this);

/*
 * aciTree jQuery Plugin v4.5.0-rc.7
 * http://acoderinsights.ro
 *
 * Copyright (c) 2014 Dragos Ursu
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Require jQuery Library >= v1.9.0 http://jquery.com
 * + aciPlugin >= v1.5.1 https://github.com/dragosu/jquery-aciPlugin
 */

/*
 * This extension adds inplace edit support to aciTree,
 * should be used with the selectable extension.
 */

(function($, window, undefined) {

    // extra default options

    var options = {
        editable: false,                // if TRUE then each item will be inplace editable
        editDelay: 250                  // how many [ms] to wait (with mouse down) before starting the edit (on mouse release)
    };

    // aciTree editable extension
    // add inplace item editing by pressing F2 key or mouse click (to enter edit mode)
    // press enter/escape to save/cancel the text edit

    var aciTree_editable = {
        __extend: function() {
            // add extra data
            $.extend(this._private, {
                editTimestamp: null
            });
            // call the parent
            this._super();
        },
        // init editable
        _editableInit: function() {
            this._instance.jQuery.bind('acitree' + this._private.nameSpace, function(event, api, item, eventName, options) {
                switch (eventName) {
                    case 'blurred':
                        // support `selectable` extension
                        var item = api.edited();
                        if (item.length) {
                            // cancel edit/save the changes
                            api.endEdit();
                        }
                        break;
                    case 'deselected':
                        // support `selectable` extension
                        if (api.isEdited(item)) {
                            // cancel edit/save the changes
                            api.endEdit();
                        }
                        break;
                }
            }).bind('click' + this._private.nameSpace, this.proxy(function() {
                // click on the tree
                var item = this.edited();
                if (item.length) {
                    // cancel edit/save the changes
                    this.endEdit();
                }
            })).bind('keydown' + this._private.nameSpace, this.proxy(function(e) {
                switch (e.which) {
                    case 113: // F2
                        // support `selectable` extension
                        if (this.extSelectable && this.extSelectable()) {
                            var item = this.focused();
                            if (item.length && !this.isEdited(item) && this.isEnabled(item)) {
                                // enable edit on F2 key
                                this.edit(item);
                                // prevent default F2 key function
                                e.preventDefault();
                            }
                        }
                        break;
                }
            })).on('mousedown' + this._private.nameSpace, '.aciTreeItem', this.proxy(function(e) {
                if ($(e.target).is('.aciTreeItem,.aciTreeText')) {
                    this._private.editTimestamp = $.now();
                }
            })).on('mouseup' + this._private.nameSpace, '.aciTreeItem', this.proxy(function(e) {
                if ($(e.target).is('.aciTreeItem,.aciTreeText')) {
                    var passed = $.now() - this._private.editTimestamp;
                    // start edit only after N [ms] but before N * 4 [ms] have passed
                    if ((passed > this._instance.options.editDelay) && (passed < this._instance.options.editDelay * 4)) {
                        var item = this.itemFrom(e.target);
                        if ((!this.extSelectable || !this.extSelectable() || (this.isFocused(item) && (this.selected().length == 1))) && this.isEnabled(item)) {
                            // edit on mouseup
                            this.edit(item);
                        }
                    }
                }
            })).on('keydown' + this._private.nameSpace, 'input[type=text]', this.proxy(function(e) {
                // key handling
                switch (e.which) {
                    case 13: // enter
                        this.itemFrom(e.target).focus();
                        this.endEdit();
                        e.stopPropagation();
                        break;
                    case 27: // escape
                        this.itemFrom(e.target).focus();
                        this.endEdit({
                            save: false
                        });
                        e.stopPropagation();
                        // prevent default action on ESC
                        e.preventDefault();
                        break;
                    case 38: // up
                    case 40: // down
                    case 37: // left
                    case 39: // right
                    case 33: // pgup
                    case 34: // pgdown
                    case 36: // home
                    case 35: // end
                    case 32: // space
                    case 107: // numpad [+]
                    case 109: // numpad [-]
                    case 106: // numpad [*]
                        e.stopPropagation();
                        break;
                }
            })).on('blur' + this._private.nameSpace, 'input[type=text]', this.proxy(function() {
                if (!this.extSelectable || !this.extSelectable()) {
                    // cancel edit/save the changes
                    this.endEdit();
                }
            })).on('click' + this._private.nameSpace + ' dblclick' + this._private.nameSpace, 'input[type=text]', function(e) {
                e.stopPropagation();
            });
        },
        // override `_initHook`
        _initHook: function() {
            if (this.extEditable()) {
                this._editableInit();
            }
            // call the parent
            this._super();
        },
        // low level DOM functions
        _editableDOM: {
            // add edit field
            add: function(item) {
                var line = item.addClass('aciTreeEdited').children('.aciTreeLine');
                line.find('.aciTreeText').html('<input id="aciTree-editable-tree-item" type="text" value="" style="-webkit-user-select:text;-moz-user-select:text;-ms-user-select:text;-o-user-select:text;user-select:text" />');
                line.find('label').attr('for', 'aciTree-editable-tree-item');
                this._editableDOM.get(item).val(this.getLabel(item));
            },
            // remove edit field
            remove: function(item, label) {
                var line = item.removeClass('aciTreeEdited').children('.aciTreeLine');
                line.find('.aciTreeText').html(this.getLabel(item));
                line.find('label').removeAttr('for');
            },
            // return edit field
            get: function(item) {
                return item ? item.children('.aciTreeLine').find('input[type=text]') : $([]);
            }
        },
        // get edited item
        edited: function() {
            return this._instance.jQuery.find('.aciTreeEdited');
        },
        // test if item is edited
        isEdited: function(item) {
            return item && domApi.hasClass(item[0], 'aciTreeEdited');
        },
        // set focus to the input
        _focusEdit: function(item) {
            var field = this._editableDOM.get(item).focus().trigger('click')[0];
            if (field) {
                if (typeof field.selectionStart == 'number') {
                    field.selectionStart = field.selectionEnd = field.value.length;
                } else if (field.createTextRange !== undefined) {
                    var range = field.createTextRange();
                    range.collapse(false);
                    range.select();
                }
            }
        },
        // override `setLabel`
        setLabel: function(item, options) {
            if (!this.extEditable() || !this.isEdited(item)) {
                // call the parent
                this._super(item, options);
            }
        },
        // edit item inplace
        edit: function(item, options) {
            options = this._options(options, 'edit', 'editfail', 'wasedit', item);
            if (this.extEditable() && this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeedit', options)) {
                    this._fail(item, options);
                    return;
                }
                var edited = this.edited();
                if (edited.length) {
                    if (edited[0] == item[0]) {
                        this._notify(item, options);
                        return;
                    } else {
                        this._editableDOM.remove.call(this, edited);
                        this._trigger(edited, 'endedit', options);
                    }
                }
                this._editableDOM.add.call(this, item);
                this._focusEdit(item);
                this._success(item, options);
            } else {
                this._fail(item, options);
            }
        },
        // end edit
        // `options.save` when set to FALSE will not save the changes
        endEdit: function(options) {
            var item = this.edited();
            options = this._options(options, 'edited', 'endeditfail', 'endedit', item);
            if (this.extEditable() && this.isItem(item)) {
                // a way to cancel the operation
                if (!this._trigger(item, 'beforeendedit', options)) {
                    this._fail(item, options);
                    return;
                }
                var text = this._editableDOM.get(item).val();
                this._editableDOM.remove.call(this, item);
                if ((options.save === undefined) || options.save) {
                    this.setLabel(item, {
                        label: text
                    });
                    this._success(item, options);
                } else {
                    this._notify(item, options);
                }
            } else {
                this._fail(item, options);
            }
        },
        // test if editable is enabled
        extEditable: function() {
            return this._instance.options.editable;
        },
        // override set `option`
        option: function(option, value) {
            if (this.wasInit() && !this.isLocked()) {
                if ((option == 'editable') && (value != this.extEditable())) {
                    if (value) {
                        this._editableInit();
                    } else {
                        this._editableDone();
                    }
                }
            }
            // call the parent
            this._super(option, value);
        },
        // done editable
        _editableDone: function() {
            this._instance.jQuery.unbind(this._private.nameSpace);
            this._instance.jQuery.off(this._private.nameSpace, '.aciTreeItem');
            this._instance.jQuery.off(this._private.nameSpace, 'input[type=text]');
            var edited = this.edited();
            if (edited.length) {
                this.endEdit();
            }
        },
        // override `_destroyHook`
        _destroyHook: function(unloaded) {
            if (unloaded) {
                this._editableDone();
            }
            // call the parent
            this._super(unloaded);
        }

    };

    // extend the base aciTree class and add the editable stuff
    aciPluginClass.plugins.aciTree = aciPluginClass.plugins.aciTree.extend(aciTree_editable, 'aciTreeEditable');

    // add extra default options
    aciPluginClass.defaults('aciTree', options);

    // for internal access
    var domApi = aciPluginClass.plugins.aciTree_dom;

})(jQuery, this);

/*
 * aciTree jQuery Plugin v4.5.0-rc.7
 * http://acoderinsights.ro
 *
 * Copyright (c) 2014 Dragos Ursu
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Require jQuery Library >= v1.9.0 http://jquery.com
 * + aciPlugin >= v1.5.1 https://github.com/dragosu/jquery-aciPlugin
 */

/*
 * This extension adds save/restore support for item states (open/selected) using local storage.
 * The states are saved on item select/open and restored on treeview init.
 * Require jStorage https://github.com/andris9/jStorage and the utils extension for finding items by ID.
 */

(function($, window, undefined) {

    // extra default options

    var options = {
        persist: null           // the storage key name to keep the states (should be unique/treeview)
    };

    // aciTree persist extension
    // save/restore item state in/from local storage

    var aciTree_persist = {
        __extend: function() {
            $.extend(this._private, {
                // timeouts for the save operation
                selectTimeout: null,
                focusTimeout: null,
                openTimeout: null
            });
            // call the parent
            this._super();
        },
        // init persist
        _initPersist: function() {
            this._instance.jQuery.bind('acitree' + this._private.nameSpace, function(event, api, item, eventName, options) {
                if (options.uid == 'ui.persist') {
                    // skip processing itself
                    return;
                }
                switch (eventName) {
                    case 'init':
                        api._persistRestore();
                        break;
                    case 'selected':
                    case 'deselected':
                        // support `selectable` extension
                        api._persistLater('selected');
                        break;
                    case 'focus':
                    case 'blur':
                        // support `selectable` extension
                        api._persistLater('focused');
                        break;
                    case 'opened':
                    case 'closed':
                        api._persistLater('opened');
                        break;
                }
            });
        },
        // override `_initHook`
        _initHook: function() {
            if (this.extPersist()) {
                this._initPersist();
            }
            // call the parent
            this._super();
        },
        // persist states
        _persistLater: function(type) {
            switch (type) {
                case 'selected':
                    window.clearTimeout(this._private.selectTimeout);
                    this._private.selectTimeout = window.setTimeout(this.proxy(function() {
                        this._persistSelected();
                    }), 250);
                    break;
                case 'focused':
                    window.clearTimeout(this._private.focusTimeout);
                    this._private.focusTimeout = window.setTimeout(this.proxy(function() {
                        this._persistFocused();
                    }), 250);
                    break;
                case 'opened':
                    window.clearTimeout(this._private.openTimeout);
                    this._private.openTimeout = window.setTimeout(this.proxy(function() {
                        this._persistOpened();
                    }), 250);
                    break;
            }
        },
        // restore item states
        _persistRestore: function() {
            var queue = new this._queue(this, this._instance.options.queue);
            var task = new this._task(queue, function(complete) {
                // support `selectable` extension
                if (this.extSelectable && this.extSelectable()) {
                    var selected = $.jStorage.get('aciTree_' + this._instance.options.persist + '_selected');
                    if (selected instanceof Array) {
                        // select all saved items
                        for (var i in selected) {
                            (function(path) {
                                queue.push(function(complete) {
                                    this.searchPath(null, {
                                        success: function(item) {
                                            this.select(item, {
                                                uid: 'ui.persist',
                                                success: function() {
                                                    complete();
                                                },
                                                fail: complete,
                                                focus: false
                                            });
                                        },
                                        fail: complete,
                                        path: path.split(';')
                                    });
                                });
                            })(selected[i]);
                            if (!this._instance.options.multiSelectable) {
                                break;
                            }
                        }
                    }
                    var focused = $.jStorage.get('aciTree_' + this._instance.options.persist + '_focused');
                    if (focused instanceof Array) {
                        // focus all saved items
                        for (var i in focused) {
                            (function(path) {
                                queue.push(function(complete) {
                                    this.searchPath(null, {
                                        success: function(item) {
                                            this.focus(item, {
                                                uid: 'ui.persist',
                                                success: function(item) {
                                                    this.setVisible(item, {
                                                        center: true
                                                    });
                                                    complete();
                                                },
                                                fail: complete
                                            });
                                        },
                                        fail: complete,
                                        path: path.split(';')
                                    });
                                });
                            })(focused[i]);
                        }
                    }
                }
                complete();
            });
            var opened = $.jStorage.get('aciTree_' + this._instance.options.persist + '_opened');
            if (opened instanceof Array) {
                // open all saved items
                for (var i in opened) {
                    (function(path) {
                        // add item to queue
                        task.push(function(complete) {
                            this.searchPath(null, {
                                success: function(item) {
                                    this.open(item, {
                                        uid: 'ui.persist',
                                        success: complete,
                                        fail: complete
                                    });
                                },
                                fail: complete,
                                path: path.split(';'),
                                load: true
                            });
                        });
                    })(opened[i]);
                }
            }
        },
        // persist selected items
        _persistSelected: function() {
            // support `selectable` extension
            if (this.extSelectable && this.extSelectable()) {
                var selected = [];
                this.selected().each(this.proxy(function(element) {
                    var item = $(element);
                    var path = this.pathId(item);
                    path.push(this.getId(item));
                    selected.push(path.join(';'));
                }, true));
                $.jStorage.set('aciTree_' + this._instance.options.persist + '_selected', selected);
            }
        },
        // persist focused item
        _persistFocused: function() {
            // support `selectable` extension
            if (this.extSelectable && this.extSelectable()) {
                var focused = [];
                this.focused().each(this.proxy(function(element) {
                    var item = $(element);
                    var path = this.pathId(item);
                    path.push(this.getId(item));
                    focused.push(path.join(';'));
                }, true));
                $.jStorage.set('aciTree_' + this._instance.options.persist + '_focused', focused);
            }
        },
        // persist opened items
        _persistOpened: function() {
            var opened = [];
            this.inodes(this.children(null, true), true).each(this.proxy(function(element) {
                var item = $(element);
                if (this.isOpenPath(item)) {
                    var path = this.pathId(item);
                    path.push(this.getId(item));
                    opened.push(path.join(';'));
                }
            }, true));
            $.jStorage.set('aciTree_' + this._instance.options.persist + '_opened', opened);
        },
        // test if there is any saved data
        isPersist: function() {
            if (this.extPersist()) {
                var selected = $.jStorage.get('aciTree_' + this._instance.options.persist + '_selected');
                if (selected instanceof Array) {
                    return true;
                }
                var focused = $.jStorage.get('aciTree_' + this._instance.options.persist + '_focused');
                if (focused instanceof Array) {
                    return true;
                }
                var opened = $.jStorage.get('aciTree_' + this._instance.options.persist + '_opened');
                if (opened instanceof Array) {
                    return true;
                }
            }
            return false;
        },
        // remove any saved states
        unpersist: function() {
            if (this.extPersist()) {
                $.jStorage.deleteKey('aciTree_' + this._instance.options.persist + '_selected');
                $.jStorage.deleteKey('aciTree_' + this._instance.options.persist + '_focused');
                $.jStorage.deleteKey('aciTree_' + this._instance.options.persist + '_opened');
            }
        },
        // test if persist is enabled
        extPersist: function() {
            return this._instance.options.persist;
        },
        // override set `option`
        option: function(option, value) {
            var persist = this.extPersist();
            // call the parent
            this._super(option, value);
            if (this.extPersist() != persist) {
                if (persist) {
                    this._donePersist();
                } else {
                    this._initPersist();
                }
            }
        },
        // done persist
        _donePersist: function() {
            this._instance.jQuery.unbind(this._private.nameSpace);
        },
        // override `_destroyHook`
        _destroyHook: function(unloaded) {
            if (unloaded) {
                this._donePersist();
            }
            // call the parent
            this._super(unloaded);
        }
    };

    // extend the base aciTree class and add the persist stuff
    aciPluginClass.plugins.aciTree = aciPluginClass.plugins.aciTree.extend(aciTree_persist, 'aciTreePersist');

    // add extra default options
    aciPluginClass.defaults('aciTree', options);

})(jQuery, this);

/*
 * aciTree jQuery Plugin v4.5.0-rc.7
 * http://acoderinsights.ro
 *
 * Copyright (c) 2014 Dragos Ursu
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Require jQuery Library >= v1.9.0 http://jquery.com
 * + aciPlugin >= v1.5.1 https://github.com/dragosu/jquery-aciPlugin
 */

/*
 * This extension adds hash/fragment support using aciFragment, it opens/select item(s) based on variables stored in the fragment part of the URL.
 * The states are loaded from the URL fragment and set on treeview init. Multiple item IDs separated with ";" are supported for
 * opening/selecting deep items (if loading nodes is required).
 * Require aciFragment https://github.com/dragosu/jquery-aciFragment and the utils extension for finding items by ID.
 */

(function($, window, undefined) {

    // extra default options

    var options = {
        selectHash: null,        // hash key name to select a item (item path IDs as key value, multiple item IDs separated with a ";")
        openHash: null           // hash key name to open item(s) (item path IDs as key value, multiple item IDs separated with a ";")
    };

    // aciTree hash extension
    // select/open items based on IDs stored in the fragment of the current URL

    var aciTree_hash = {
        __extend: function() {
            $.extend(this._private, {
                lastSelect: null,
                lastOpen: null,
                // store `aciFragment` api
                hashApi: null
            });
            // call the parent
            this._super();
        },
        // init hash
        _hashInit: function() {
            // init `aciFragment`
            this._instance.jQuery.aciFragment();
            this._private.hashApi = this._instance.jQuery.aciFragment('api');
            this._instance.jQuery.bind('acitree' + this._private.nameSpace, function(event, api, item, eventName, options) {
                switch (eventName) {
                    case 'init':
                        api._hashRestore();
                        break;
                }
            }).bind('acifragment' + this._private.nameSpace, this.proxy(function(event, api, anchorChanged) {
                event.stopPropagation();
                this._hashRestore();
            }));
        },
        // override `_initHook`
        _initHook: function() {
            if (this.extHast()) {
                this._hashInit();
            }
            // call the parent
            this._super();
        },
        // restore item states from hash
        _hashRestore: function() {
            var queue = this._instance.queue;
            var process = function(opened) {
                // open all hash items
                for (var i in opened) {
                    (function(id) {
                        // add item to queue
                        queue.push(function(complete) {
                            this.search(null, {
                                success: function(item) {
                                    this.open(item, {
                                        uid: 'ui.hash',
                                        success: complete,
                                        fail: complete
                                    });
                                },
                                fail: complete,
                                search: id
                            });
                        });
                    })(opened[i]);
                }
            };
            if (this._instance.options.openHash) {
                var hash = this._private.hashApi.get(this._instance.options.openHash, '');
                if (hash.length && (hash != this._private.lastOpen)) {
                    this._private.lastOpen = hash;
                    var opened = hash.split(';');
                    process(opened);
                }
            }
            // support `selectable` extension
            if (this._instance.options.selectHash && this.extSelectable && this.extSelectable()) {
                var hash = this._private.hashApi.get(this._instance.options.selectHash, '');
                if (hash.length && (hash != this._private.lastSelect)) {
                    this._private.lastSelect = hash;
                    var opened = hash.split(';');
                    var selected = opened.pop();
                    process(opened);
                    if (selected) {
                        // select item
                        queue.push(function(complete) {
                            this.search(null, {
                                success: function(item) {
                                    this.select(item, {
                                        uid: 'ui.hash',
                                        success: function(item) {
                                            this.setVisible(item, {
                                                center: true
                                            });
                                            complete();
                                        },
                                        fail: complete
                                    });
                                },
                                fail: complete,
                                search: selected
                            });
                        });
                    }
                }
            }
        },
        // test if hash is enabled
        extHast: function() {
            return this._instance.options.selectHash || this._instance.options.openHash;
        },
        // override set option
        option: function(option, value) {
            var hash = this.extHast();
            // call the parent
            this._super(option, value);
            if (this.extHast() != hash) {
                if (hash) {
                    this._hashDone();
                } else {
                    this._hashInit();
                }
            }
        },
        // done hash
        _hashDone: function() {
            this._instance.jQuery.unbind(this._private.nameSpace);
            this._private.hashApi = null;
            this._instance.jQuery.aciFragment('destroy');
        },
        // override `_destroyHook`
        _destroyHook: function(unloaded) {
            if (unloaded) {
                this._hashDone();
            }
            // call the parent
            this._super(unloaded);
        }
    };

    // extend the base aciTree class and add the hash stuff
    aciPluginClass.plugins.aciTree = aciPluginClass.plugins.aciTree.extend(aciTree_hash, 'aciTreeHash');

    // add extra default options
    aciPluginClass.defaults('aciTree', options);

})(jQuery, this);

/*
 * aciTree jQuery Plugin v4.5.0-rc.7
 * http://acoderinsights.ro
 *
 * Copyright (c) 2014 Dragos Ursu
 * Dual licensed under the MIT or GPL Version 2 licenses.
 *
 * Require jQuery Library >= v1.9.0 http://jquery.com
 * + aciPlugin >= v1.5.1 https://github.com/dragosu/jquery-aciPlugin
 */

/*
 * This extension adds the possibility to sort the tree items.
 * Require aciSortable https://github.com/dragosu/jquery-aciSortable and the utils extension for reordering items.
 */

(function($, window, undefined) {

    // extra default options

    var options = {
        sortable: false,             // if TRUE then the tree items can be sorted
        sortDelay: 750,              // how many [ms] before opening a inode on hovering when in drag
        // called by the `aciSortable` inside the `drag` callback
        sortDrag: function(item, placeholder, isValid, helper) {
            if (!isValid) {
                var move = this.getLabel(item);
                if (this._private.dragDrop && (this._private.dragDrop.length > 1)) {
                    move += ' and #' + (this._private.dragDrop.length - 1) + ' more';
                }
                helper.html(move);
            }
        },
        // called by the `aciSortable` inside the `valid` callback
        sortValid: function(item, hover, before, isContainer, placeholder, helper) {
            var move = this.getLabel(item);
            if (this._private.dragDrop.length > 1) {
                move += ' and #' + (this._private.dragDrop.length - 1) + ' more';
            }
            if (isContainer) {
                helper.html('move ' + move + ' to ' + this.getLabel(this.itemFrom(hover)));
                placeholder.removeClass('aciTreeAfter aciTreeBefore');
            } else if (before !== null) {
                if (before) {
                    helper.html('move ' + move + ' before ' + this.getLabel(hover));
                    placeholder.removeClass('aciTreeAfter').addClass('aciTreeBefore');
                } else {
                    helper.html('move ' + move + ' after ' + this.getLabel(hover));
                    placeholder.removeClass('aciTreeBefore').addClass('aciTreeAfter');
                }
            }
        }
    };

    // aciTree sortable extension

    var aciTree_sortable = {
        __extend: function() {
            // add extra data
            $.extend(this._private, {
                openTimeout: null,
                dragDrop: null // the items used in drag & drop
            });
            // call the parent
            this._super();
        },
        // init sortable
        _sortableInit: function() {
            this._instance.jQuery.aciSortable({
                container: '.aciTreeUl',
                item: '.aciTreeLi',
                child: 50,
                childHolder: '<ul class="aciTreeUl aciTreeChild"></ul>',
                childHolderSelector: '.aciTreeChild',
                placeholder: '<li class="aciTreeLi aciTreePlaceholder"><div></div></li>',
                placeholderSelector: '.aciTreePlaceholder',
                helper: '<div class="aciTreeHelper"></div>',
                helperSelector: '.aciTreeHelper',
                // just before drag start
                before: this.proxy(function(item) {
                    // init before drag
                    if (!this._initDrag(item)) {
                        return false;
                    }
                    // a way to cancel the operation
                    if (!this._trigger(item, 'beforedrag')) {
                        this._trigger(item, 'dragfail');
                        return false;
                    }
                    return true;
                }),
                // just after drag start, before dragging
                start: this.proxy(function(item, placeholder, helper) {
                    this._instance.jQuery.addClass('aciTreeDragDrop');
                    helper.stop(true).css('opacity', 1);
                }),
                // when in drag
                drag: this.proxy(function(item, placeholder, isValid, helper) {
                    if (!isValid) {
                        window.clearTimeout(this._private.openTimeout);
                    }
                    if (this._instance.options.sortDrag) {
                        this._instance.options.sortDrag.apply(this, arguments);
                    }
                }),
                // to check the drop target (when the placeholder is repositioned)
                valid: this.proxy(function(item, hover, before, isContainer, placeholder, helper) {
                    window.clearTimeout(this._private.openTimeout);
                    if (!this._checkDrop(item, hover, before, isContainer, placeholder, helper)) {
                        return false;
                    }
                    var options = this._options({
                        hover: hover,
                        before: before,
                        isContainer: isContainer,
                        placeholder: placeholder,
                        helper: helper
                    });
                    // a way to cancel the operation
                    if (!this._trigger(item, 'checkdrop', options)) {
                        return false;
                    }
                    if (this.isInode(hover) && !this.isOpen(hover)) {
                        this._private.openTimeout = window.setTimeout(this.proxy(function() {
                            this.open(hover);
                        }), this._instance.options.sortDelay);
                    }
                    if (this._instance.options.sortValid) {
                        this._instance.options.sortValid.apply(this, arguments);
                    }
                    return true;
                }),
                // when dragged as child
                create: this.proxy(function(api, item, hover) {
                    if (this.isLeaf(hover)) {
                        hover.append(api._instance.options.childHolder);
                        return true;
                    }
                    return false;
                }, true),
                // on drag end
                end: this.proxy(function(item, hover, placeholder, helper) {
                    window.clearTimeout(this._private.openTimeout);
                    var options = {
                        placeholder: placeholder,
                        helper: helper
                    };
                    options = this._options(options, 'sorted', 'dropfail', null, item);
                    if (placeholder.parent().length) {
                        var prev = this.prev(placeholder, true);
                        if (prev.length) {
                            // add after a item
                            placeholder.detach();
                            var items = $(this._private.dragDrop.get().reverse());
                            this._private.dragDrop = null;
                            items.each(this.proxy(function(element) {
                                this.moveAfter($(element), this._inner(options, {
                                    success: options.success,
                                    fail: options.fail,
                                    after: prev
                                }));
                            }, true));
                        } else {
                            var next = this.next(placeholder, true);
                            if (next.length) {
                                // add before a item
                                placeholder.detach();
                                var items = $(this._private.dragDrop.get().reverse());
                                this._private.dragDrop = null;
                                items.each(this.proxy(function(element) {
                                    this.moveBefore($(element), this._inner(options, {
                                        success: options.success,
                                        fail: options.fail,
                                        before: next
                                    }));
                                }, true));
                            } else {
                                // add as a child
                                var parent = this.parent(placeholder);
                                var container = placeholder.parent();
                                placeholder.detach();
                                container.remove();
                                if (this.isLeaf(parent)) {
                                    // we can set asChild only for leaves
                                    var items = this._private.dragDrop;
                                    this.asChild(items.eq(0), this._inner(options, {
                                        success: function() {
                                            this._success(item, options);
                                            this.open(parent);
                                            items.filter(':gt(0)').each(this.proxy(function(element) {
                                                this.moveAfter($(element), this._inner(options, {
                                                    success: options.success,
                                                    fail: options.fail,
                                                    after: this.last(parent)
                                                }));
                                            }, true));
                                        },
                                        fail: options.fail,
                                        parent: parent
                                    }));
                                } else {
                                    this._fail(item, options);
                                }
                            }
                        }
                    } else {
                        this._fail(item, options);
                    }
                    this._private.dragDrop = null;
                    if (helper.parent().length) {
                        // the helper is inserted in the DOM
                        var top = $(window).scrollTop();
                        var left = $(window).scrollLeft();
                        var rect = item[0].getBoundingClientRect();
                        // animate helper to item position
                        helper.animate({
                            top: rect.top + top,
                            left: rect.left + left,
                            opacity: 0
                        },
                        {
                            complete: function() {
                                // detach the helper when completed
                                helper.detach();
                            }
                        });
                    }
                    this._instance.jQuery.removeClass('aciTreeDragDrop');
                })
            });
        },
        // override `_initHook`
        _initHook: function() {
            if (this.extSortable()) {
                this._sortableInit();
            }
            // call the parent
            this._super();
        },
        // reduce items by removing the childrens
        _parents: function(items) {
            var len = items.length, a, b, remove = [];
            for (var i = 0; i < len - 1; i++) {
                a = items.eq(i);
                for (var j = i + 1; j < len; j++) {
                    b = items.eq(j);
                    if (this.isChildren(a, b)) {
                        remove.push(items[j]);
                    } else if (this.isChildren(b, a)) {
                        remove.push(items[i]);
                    }
                }
            }
            return items.not(remove);
        },
        // called before drag start
        _initDrag: function(item) {
            // support `selectable` extension
            if (this.extSelectable && this.extSelectable()) {
                if (!this.hasFocus()) {
                    this._instance.jQuery.focus();
                }
                if (!this.isEnabled(item)) {
                    return false;
                }
                var drag = this.selected();
                if (drag.length) {
                    if (!this.isSelected(item)) {
                        return false;
                    }
                } else {
                    drag = item;
                }
                this._private.dragDrop = this._parents(drag);
            } else {
                this._instance.jQuery.focus();
                this._private.dragDrop = item;
            }
            return true;
        },
        // check the drop target
        _checkDrop: function(item, hover, before, isContainer, placeholder, helper) {
            var items = this._private.dragDrop;
            if (!items) {
                return false;
            }
            var test = this.itemFrom(hover);
            if (items.is(test) || items.has(test[0]).length) {
                return false;
            }
            if (!isContainer) {
                test = before ? this.prev(hover) : this.next(hover);
                if (items.is(test)) {
                    return false;
                }
            }
            return true;
        },
        // test if sortable is enabled
        extSortable: function() {
            return this._instance.options.sortable;
        },
        // override set `option`
        option: function(option, value) {
            if (this.wasInit() && !this.isLocked()) {
                if ((option == 'sortable') && (value != this.extSortable())) {
                    if (value) {
                        this._sortableInit();
                    } else {
                        this._sortableDone();
                    }
                }
            }
            // call the parent
            this._super(option, value);
        },
        // done sortable
        _sortableDone: function() {
            this._instance.jQuery.unbind(this._private.nameSpace);
            this._instance.jQuery.aciSortable('destroy');
        },
        // override `_destroyHook`
        _destroyHook: function(unloaded) {
            if (unloaded) {
                this._sortableDone();
            }
            // call the parent
            this._super(unloaded);
        }
    };

    // extend the base aciTree class and add the sortable stuff
    aciPluginClass.plugins.aciTree = aciPluginClass.plugins.aciTree.extend(aciTree_sortable, 'aciTreeSortable');

    // add extra default options
    aciPluginClass.defaults('aciTree', options);

})(jQuery, this);
