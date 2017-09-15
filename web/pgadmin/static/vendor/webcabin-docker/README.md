# Welcome! #

Welcome to WebCabin.org!  Your developers cabin, on the web!  

Here at Web Cabin, we sincerely believe that anyone with the proper tools can become a developer! The open source community provides us with a powerful network for sharing, inspiring, and revolutionizing the world! It is awfully daunting, viewing the long road ahead through our small cabin window, but all memorable journeys must have a beginning. Will you join us?


****
### New! ###

I've create a new theme builder panel that appears right on the [demonstration front page](http://docker.webcabin.org)! Build your own custom themes live within the page view!

****
### What is wcDocker? ###

wcDocker (Web Cabin Docker) is a responsive IDE interface designed for the developer at heart!  Compartmentalize your environment into smaller components, put each of those parts into a docker panel, and organize your environment however you like, whenever you like!

### [http://docker.webcabin.org](http://docker.webcabin.org) ###
  * Try the front page demo.

### [http://docker.api.webcabin.org](http://docker.api.webcabin.org) ###
  * View the API documentation.

### [https://github.com/WebCabin/wcDocker](https://github.com/WebCabin/wcDocker) ###
  * View the source code.


### [http://arpg.webcabin.org](http://arpg.webcabin.org) ###
  * Try out our upcoming project (currently in alpha development), a completely web based Action RPG Maker tool!  

****
### Features ###
* Extremely responsive design!
* Organization and duplication of panels at any time!
* Easily create your own themes!
* Comprehensive API Documentation!
* Easily save and restore your layout!
* Compatible with all major browsers, including IE8.
* Completely free!


****
### Getting Started ###
See the [Getting Started](http://docker.api.webcabin.org/tutorial-1.0-getting-started.html) tutorial.


****
### Change Log ###
#### Version: (pre-release) 3.0.0 ####
- **WARNING: Before upgrading to this version from 2.2.0, You will need to make the following changes in your implementation:**
 - Themes are no longer linked directly to the page using the &lt;link&gt; tag, instead use wcDocker.theme().
 - If your themes are not found in the "Themes" folder, you will need to assign the correct path when you construct your wcDocker instance.

    ```
    new wcDocker(domNode, {themePath: 'New/theme/folder'});
    ```
 - All `wcDocker.DOCK`, `wcDocker.EVENT`, and `wcDocker.ORIENTATION` enumerations have changed slightly, instead of each being one variable, they are broken into objects.
 
    ```
    // OLD format...
    wcDocker.DOCK_LEFT;
    wcDocker.EVENT_BUTTON;
    wcDocker.ORIENTATION_HORIZONTAL;
     
    // NEW format...
    wcDocker.DOCK.LEFT;
    wcDocker.EVENT.BUTTON;
    wcDocker.ORIENTATION.HORIZONTAL;

    // Notice how each used to be one variable name...
    // Now they each are an object with the same enumeration inside them,
    // just replace the first '_' with a '.' and they should work fine again!
    ```

 - `wcLayout's` have changed in the following ways:
    - The original layout class has been renamed to [wcLayoutTable](http://docker.api.webcabin.org/wcLayoutTable.html), and another type of layout now exists as [wcLayoutSimple](http://docker.api.webcabin.org/wcLayoutSimple.html).
    - `wcLayoutTable.addItem()` and `wcLayoutTable.item()` no longer return a jQuery object. Instead, they return a [layout table item](http://docker.api.webcabin.org/module-wcLayoutTable.html#~tableItem) that can be used to make alterations to that cell.
    - To use the simple layout on your panel, include the layout option when registering your panel:
        ```
        myDocker.registerPanelType('Simple Panel', {
          // Use the simple layout for the entire panel.
          layout: wcDocker.LAYOUT.SIMPLE,
          onCreate: function(myPanel) {

            // Create a splitter widget with simple layouts.
            var splitter = new wcSplitter($someContainer, myPanel, wcDocker.ORIENTATION.HORIZONTAL);
            splitter.initLayouts(wcDocker.LAYOUT.SIMPLE, wcDocker.LAYOUT.SIMPLE);

            // Create a tab frame widget with a tab that uses a simple layout.
            var tabFrame = new wcTabFrame($someContainer, myPanel);
            tabFrame.addTab('Custom Tab 1', 0, wcDocker.LAYOUT.SIMPLE).addItem($someItem);
          }
        });
        ```
 - The following functions are now `deprecated` and will be removed in an upcoming version:
   - `wcDocker.basicMenu()`, renamed to `wcDocker.menu()`.

- **`Collapsible panels:`** Panels can now be collapsed to the side or bottom of the screen, where they become a slide-out drawer above the main layout.
- **`Panel creation elements:`** Instead of relying on the context-menu controls to add new panels, you can now add the CSS class **`"wcCreatePanel"`** to any dom element along with the data attribute **`"panel"`** and wcDocker will treat it as a panel creation control. A user will then be able to drag-drop that element into their view to create new panels of the specified type.

    ```
    {@lang xml}<span class="wcCreatePanel" data-panel="My Custom Panel Type">Create My Custom Panel Type</span>
    ```
- **`Tab orientation:`** Tab controls displayed on panels and the custom tab widget can now be oriented to the left, right, or bottom edges (browser must support css transforms).

    ```
    myDocker.addPanel('Some Panel', wcDocker.DOCK.STACKED, parentPanel, {tabOrientation: wcDocker.TAB.BOTTOM});

    var myCustomTabFrame = new wcTabFrame(domElem, myPanel);
    myCustomTabFrame.tabOrientation(wcDocker.TAB.LEFT);
    ```
- Built in loading screens for both panels (`wcPanel.startLoading()` and `wcPanel.finishLoading()`), and the entire window (`wcDocker.startLoading()` and `wcDocker.finishLoading()`), and also included a new `wcDocker.EVENT.LOADED` event that is triggered once all panels have been initialized and have finished their loading screens if they've started one.
- Great improvements to splitter bar movement, moving one splitter no longer causes others to move (unless it explicitly pushes them).
- Improvements to the wcLayout object, css changes to the table cells and rows are now persistent even if the grid size changes.
- Tab widgets now only show on panel frames that contain more than one panel.
- Panels can now be registered as `persistent`.
  - When the user closes a persistent panel, it is hidden instead of destroyed.
  - When the user adds that panel back into their view, if there are any previously hidden panels of that type, it will be shown instead of creating a new panel instance.
    ```
    myDocker.registerPanelType('persistent panel', {
      isPersistent: true,
      onCreate: function(myPanel) {
        myPanel.on(wcDocker.EVENT.PERSISTENT_CLOSED, function() {
          // The user has closed this panel, but instead of being destroyed, it is only hidden.
        });
        myPanel.on(wcDocker.EVENT.PERSISTENT_OPENED, function() {
          // The user added this panel type, but actually only re-shown this persistent version of the panel instead.
        });
      }
    });
    ```
- The collapse direction button on a panel can now be overridden if the built in calculation does not meet your needs. See [wcPanel#collapseDirection](http://docker.api.webcabin.org/wcPanel.html#collapseDirection) for more information.
    ```
    // You can override the direction with your own calculation function callback
    myPanel.collapseDirection(function(bounds) {
      return wcDocker.DOCK.LEFT;
    });

    // Or you can set it to a static direction
    myPanel.collapseDirection(wcDocker.DOCK.RIGHT);

    // Or you can restore it back to the default calculation
    myPanel.collapseDirection(false);
    ```
- Source code now supports [DCL](http://www.dcljs.org/)!
- Front page Theme Builder is now built into the libraries.
  - To include it in your project, you will need to include [spectrum](https://bgrins.github.io/spectrum/) into your project as well as register a panel to be used for the theme builder:
    ```
    myDocker.registerPanelType('Theme Builder', {
      faicon: 'map',
      onCreate: wcThemeBuilder
    });
    ```

#### Version: 2.2.0 ####
- Separated the default theme out of `wcDocker.css` (now use `wcDocker.css` with `Themes/default.css`).
- Added `wcDocker.panelTypeInfo()` and `wcPanel.info()` that will retrieve the registration data of a panel.
- Added `wcDocker.panelTypes()` to retrieve a list of all registered panel types.
- New event type `wcDocker.EVENT.INIT`.
- Panel width and height can now be retrieved.
- `wcPanel` functions `initPos`, `initSize`, `minSize`, and `maxSize` can now take a string value with a `'px'` or `'%'` suffix.
- Fixed issue with using normal CSS icons in the context menu.
- Improved auto scrolling of tab items when clicked.
- Create your own `wcTabFrame` widget within your panels.
- Create your own `wcIFrame` widget within your panels.
- Floating panels can now be modal.

#### Version: 2.1.0 ####
- `wcDocker` now has Bower support for easy package management.
- `wcSplitter` is now usable inside a panel.
- Improved performance of panel resizing.
- `wcPanel.focus()` now actually sets itself as the current active tab.
- `wcDocker.registerPanelType()` has a new option `{limit: Number}` that limits the total number of copies for this panel.
- New event type `wcDocker.EVENT.VISIBILITY_CHANGED`, triggered whenever the panel gains or loses visibility.  Use `wcPanel.isVisible()` to retrieve the current state.
- Reduced DOM changes during tab change and resize.
- New event types `wcDocker.EVENT.BEGIN_DOCK` and `wcDocker.EVENT.END_DOCK` that trigger whenever the user is dragging a panel to a new location.
- New event types `wcDocker.EVENT.GAIN_FOCUS` and `wcDocker.EVENT.LOST_FOCUS` that trigger whenever a panel is brought it and out of focus.
- Floating panels no longer change size whenever a new panel is added to it as a tab.

#### Version: 2.0.0 ####
- Layout grid can now have a spacing size.
- Layout grid can now be set to alternating row color.
- `wcLayout.item()` added to retrieve an already existing item in the layout.
- `wcDocker` can now send and receive events.
- `wcLayout` can now batch large numbers of elements added without page refreshing between each.
- `wcPanel` can now contain custom buttons that appear within the title bar.
- `wcDocker.basicMenu()` now has an option to include the default menu options along with your custom ones.
- `wcDocker.basicMenu()` can now accept a dynamic callback function that returns custom menu's at the time of the event.
- New events added for resize start, resize end, move start, and move end.
- Panels can now be set to hide their contents whenever they are resized.
- `wcDocker` constructor now takes an options object.
- `wcDocker` now has an option to disable the default context menu.
- Panel tabs are now scrollable.
- Icons are now supported using regular CSS or the Font-Awesome library [http://fortawesome.github.io/Font-Awesome/](http://fortawesome.github.io/Font-Awesome/).
- `wcDocker.registerPanelType()` can now take an options object instead of just a single callback.
- Fixed layout save/restore.
- Fixed layout clear not actually removing elements.
- Fixed compatibility with IE8.
- Fixed tabs disappearing when the panel is too small to fit them.


****
### Dependencies ###

* JQuery Library version 1.11.1 [http://jquery.com/](http://jquery.com/)
* JQuery ContextMenu Library [https://github.com/medialize/jQuery-contextMenu](https://github.com/medialize/jQuery-contextMenu)
* Font-Awesome [http://fortawesome.github.io/Font-Awesome/](http://fortawesome.github.io/Font-Awesome/)


****
### License ###

[MIT License](http://www.opensource.org/licenses/mit-license.php)

&copy; 2014-2016 Jeff Houde ([lochemage@webcabin.org](mailto:lochemage@webcabin.org))

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.


****
### Suggestions/Comments? ###
Please feel free to contact me, Jeff Houde ([lochemage@webcabin.org](mailto:lochemage@webcabin.org)), for any information or to give feedback and suggestions.  Also, if you are a web programmer, and believe you can help, please let me know!

Thank you
