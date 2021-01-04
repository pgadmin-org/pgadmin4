/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define(['sources/gettext', 'alertify'], function (gettext, alertify) {
  var clipboard = {
    copyTextToClipboard: function (text) {
      var textArea = document.createElement('textarea');

      //
      // *** This styling is an extra step which is likely not required. ***
      //
      // Why is it here? To ensure:
      // 1. the element is able to have focus and selection.
      // 2. if element was to flash render it has minimal visual impact.
      // 3. less flakyness with selection and copying which **might** occur if
      //    the textarea element is not visible.
      //
      // The likelihood is the element won't even render, not even a flash,
      // so some of these are just precautions. However in IE the element
      // is visible whilst the popup box asking the user for permission for
      // the web page to copy to the clipboard.
      //

      // Place in top-left corner of screen regardless of scroll position.
      textArea.style.position = 'fixed';
      textArea.style.top = 0;
      textArea.style.left = 0;

      // Ensure it has a small width and height. Setting to 1px / 1em
      // doesn't work as this gives a negative w/h on some browsers.
      textArea.style.width = '2em';
      textArea.style.height = '2em';

      // We don't need padding, reducing the size if it does flash render.
      textArea.style.padding = 0;

      // Clean up any borders.
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';

      // Avoid flash of white box if rendered for any reason.
      textArea.style.background = 'transparent';

      document.body.appendChild(textArea);

      textArea.select();

      var copyTextToClipboardHandler = function(e) {
        /* Remove oncopy event listener from document as we add listener for
         * oncopy event on each copy operation.
         * Also we don't want this listener to be persistent; Otherwise it'll get
         * called for each copy operation performed on any input/textarea from
         * this document.
         */
        document.removeEventListener('copy', copyTextToClipboardHandler);
        var clipboardData = e.clipboardData || window.clipboardData;

        if (clipboardData) {
          clipboardData.setData('text', text);
          // As there no uniform way to read data from clipboard
          // storing copied data into main window object, so it is accessible from anywhere in the application
          window.parent.window.clipboardData = text;
          // We want our data, not data from any selection, to be written to the clipboard
          e.preventDefault();
        }
      };

      document.addEventListener('copy', copyTextToClipboardHandler);

      try {
        // just perform copy on empty textarea so that copy event will be
        // triggered on document and then we can set clipboardData.
        document.execCommand('copy');
      } catch (err) {
        alertify.alert(
          gettext('Error'),
          gettext('Oops, unable to copy to clipboard'));
      }

      document.body.removeChild(textArea);
    },
    getTextFromClipboard: function() {
      return window.parent.window.clipboardData || '';
    },
  };
  return clipboard;
});
