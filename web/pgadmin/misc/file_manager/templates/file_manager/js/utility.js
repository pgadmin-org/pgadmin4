/**
 * Filemanager JS core
 *
 * filemanager.js
 *
 *  @license  MIT License
 *  @author Jason Huck - Core Five Labs
 *  @author Simon Georget <simon (at) linea21 (dot) com>
 *  @copyright  Authors
 */

(function($) {
"use strict";

// use alertify and underscore js
var alertify = require("alertify"),
    _ = require("underscore");

/*---------------------------------------------------------
  Define functions used for various operations
---------------------------------------------------------*/

// return file extension
var getFileExtension = function(name) {
  var found = name.lastIndexOf('.') + 1;
  return (found > 0 ? name.substr(found) : "");
};

// returns filename without extension
var getFileName = function(name) {
  var fm_filename = name;
  if (fm_filename.length > 15 ) {
    fm_filename = name.substr(0, 10) +'...';
  }
  return fm_filename;
};

/* Common function to load:
 * en.js language file
 * file_manager_config.js config file
 * return transaction id
 */
var loadData = function(url) {
  return $.ajax({
    async: false,
    url: url,
    dataType: 'jsonp',
    contentType: "application/json; charset=utf-8"
  });
};

// Set enable/disable state of list and grid view
var setViewButtonsFor = function(viewMode) {
  if (viewMode == 'grid') {
      $('.grid').addClass('ON');
      $('.list').removeClass('ON');
  } else {
      $('.list').addClass('ON');
      $('.grid').removeClass('ON');
  }
};

/*
 * preg_replace
 */
var preg_replace = function(array_pattern, array_pattern_replace, str)  {
  var i = 0, reg_exp, val_to_replace,
      new_str = String(str);

  while (i < array_pattern.length) {
    reg_exp= RegExp(array_pattern[i], "g");
    val_to_replace = array_pattern_replace[i];

    new_str = new_str.replace (reg_exp, val_to_replace);
    i += 1;
  }

  return new_str;
};

/*
 * cleanString (), on the same model as server side (connector)
 * cleanString
 */
var cleanString = function(str) {
  var cleaned = "";
  var p_search = new Array(
    "Š", "š", "Đ", "đ", "Ž", "ž", "Č", "č", "Ć", "ć", "À",
    "Á", "Â", "Ã", "Ä", "Å", "Æ", "Ç", "È", "É", "Ê", "Ë", "Ì", "Í", "Î", "Ï",
    "Ñ", "Ò", "Ó", "Ô", "Õ", "Ö", "Ő", "Ø", "Ù", "Ú", "Û", "Ü", "Ý", "Þ", "ß",
    "à", "á", "â", "ã", "ä", "å", "æ", "ç", "è", "é", "ê", "ë", "ì",  "í",
    "î", "ï", "ð", "ñ", "ò", "ó", "ô", "õ", "ö", "ő", "ø", "ù", "ú", "û", "ü",
    "ý", "ý", "þ", "ÿ", "Ŕ", "ŕ", " ", "'", "/"
  );
  var p_replace = new Array(
    "S", "s", "Dj", "dj", "Z", "z", "C", "c", "C", "c", "A",
    "A", "A", "A", "A", "A", "A", "C", "E", "E", "E", "E", "I", "I", "I", "I",
    "N", "O", "O", "O", "O", "O", "O", "O", "U", "U", "U", "U", "Y", "B", "Ss",
    "a", "a", "a", "a", "a", "a", "a", "c", "e", "e", "e", "e", "i", "i",
    "i", "i", "o", "n", "o", "o", "o", "o", "o", "o", "o", "u", "u", "u", "u",
    "y", "y", "b", "y", "R", "r", "_", "_", ""
  );

  cleaned = preg_replace(p_search, p_replace, str);
  cleaned = cleaned.replace(/[^_a-zA-Z0-9]/g, "");
  cleaned = cleaned.replace(/[_]+/g, "_");

  return cleaned;
};

/*
 * nameFormat (), separate filename from extension before calling cleanString()
 * nameFormat
 */
var nameFormat = function(input) {
  var filename = '';
  if (input.lastIndexOf('.') != -1) {
    filename  = cleanString(input.substr(0, input.lastIndexOf('.')));
    filename += '.' + input.split('.').pop();
  } else {
    filename = cleanString(input);
  }
  return filename;
};

//Converts bytes to kb, mb, or gb as needed for display.
var formatBytes = function(bytes) {
  var n = parseFloat(bytes),
      d = parseFloat(1024),
      c = 0,
      u = [lg.bytes,lg.kb,lg.mb,lg.gb];

  while(true) {
    if (n < d) {
      return (Math.round(n * 100) / 100) + u[c];
    }
    n /= d;
    c += 1;
  }
};

// Freeze toolbar buttons and display errors
var handleError = function(errMsg) {
  $('.storage_dialog .newfile').attr("disabled", "disabled");
  $('.storage_dialog .upload').attr("disabled", "disabled");
  $('.storage_dialog .create').attr("disabled", "disabled");
};

/*
 * Test if Data structure has the 'cap' capability
 * 'cap' is one of 'select', 'rename', 'delete', 'download'
 */
var has_capability = function(data, cap) {
  if (typeof(data.Capabilities) == "undefined") {
    return true;
  } else {
    return ($.inArray(cap, data.Capabilities) > -1);
  }
};

// return filename extension
var getExtension = function(filename) {
  if (filename.split('.').length == 1) {
    return "";
  }
  return filename.split('.').pop();
};

// return filename without extension
var getFilename = function(filename) {
  if (filename.lastIndexOf('.') != -1) {
    return filename.substring(0, filename.lastIndexOf('.'));
  } else {
    return filename;
  }
};

// helpful in show/hide toolbar button for Windows
var hideButtons = function() {
    return (
      config.options.platform_type == 'win32' &&
      $('.currentpath').val() === ''
    );
};

/*
 * Sets the folder status, upload, and new folder functions
 * to the path specified. Called on initial page load and
 * whenever a new directory is selected.
 */
var setUploader = function(path) {
  $('.storage_dialog #uploader').find('a').remove();
  $('.storage_dialog #uploader').find('b').remove();

  path = decodeURI(path);

  var display_string = path,
      file_path = '';

  // split path
  var split_path = display_string.split('/');
  split_path = split_path.filter(function(e) {return e;});

  // set empty path if it is windows
  if (config.options.platform_type === "win32" && config.options.show_volumes) {
      file_path = "";
  } else if (split_path.length === 0) {
    file_path = '/';
  } else {
    file_path = '/';
  }

  Object.keys(split_path).forEach(function (i) {
    file_path += split_path[i] + '/';
  });
  $('.storage_dialog #uploader h1').html(file_path);

  $('.currentpath').val(path);
  if ($('.storage_dialog #uploader h1 span').length === 0) {
    $('<span>'+lg.current_folder+'</span>').appendTo($('.storage_dialog #uploader h1'));
  }

  $('.storage_dialog #uploader h1').attr('title', display_string);
  $('.storage_dialog #uploader h1').attr('data-path', display_string);

  // create new folder
  $('.create').unbind().click(function() {
    var foldername =  lg.new_folder;
    var $file_element,
        $file_element_list,
        folder_div;


    $('.file_manager button.create').attr('disabled', 'disabled');
    if ($('.fileinfo').data('view') == 'grid') {

      // template for creating new folder
      folder_div =
        "<li class='cap_download cap_delete cap_select_file cap_select_folder cap_rename cap_create cap_upload'>" +
        "<div class='clip'><span data-alt='' class='fa fa-folder-open fm_folder'></span></div>" +
        "<p><input type='text' class='fm_file_rename'><span title=''>New_Folder</span></p>" +
        "<span class='meta size'></span><span class='meta created'></span><span class='meta modified'></span></li>";

      path = $('.currentpath').val();
      $file_element =  $(folder_div);
      $('.fileinfo #contents.grid').append($file_element);
      $file_element.find('p span').toggle();
      $file_element.find('p input').toggle().val(lg.new_folder).select();

      // rename folder/file on pressing enter key
      $('.file_manager').bind().on('keyup', function(e) {
        if (e.keyCode == 13) {
          e.stopPropagation();
          $file_element.find('p input').trigger('blur');
        }
      });

      // rename folder/file on blur
      $file_element.find('p input').on('blur', function(e) {
        $('.file_manager button.create').removeAttr('disabled');
        var text_value = $file_element.find('p input').val();

        path = $('.currentpath').val();

        $file_element.find('p input').toggle();
        $file_element.find('p span').toggle().html(text_value);
        if (text_value === undefined) {
          text_value = lg.new_folder;
        }
        getFolderName(text_value);
        getFolderInfo(path);
      });

    } else if ($('.fileinfo').data('view') == 'list') {
      // template to create new folder in table view
      folder_div = $(
        "<tr class='cap_download cap_delete cap_select_file cap_select_folder cap_rename cap_create cap_upload'>" +
        "<td title='' class='fa fa-folder-open tbl_folder'>" +
        "<p><input type='text' class='fm_file_rename'><span>" +
        lg.new_folder + "</span></p>" +
        "</td><td><abbr title=''></abbr></td>" +
        "<td></td>" +
        "</tr>"
      );

      $file_element_list =  $(folder_div);
      $('.fileinfo #contents.list').prepend($file_element_list);
      $file_element_list.find('p span').toggle();
      $file_element_list.find('p input').toggle().val(lg.new_folder).select();

      // rename folder/file on pressing enter key
      $('.file_manager').bind().on('keyup', function(e) {
        if (e.keyCode == 13) {
          e.stopPropagation();
          $file_element_list.find('p input').trigger('blur');
        }
      });

      // rename folder/file on blur
      $file_element_list.find('p input').on('blur', function(e) {
        $('.file_manager button.create').removeAttr('disabled');
        var text_value = $file_element_list.find('p input').val();
        path = $('.currentpath').val();
        $file_element_list.find('p input').toggle();
        $file_element_list.find('p span').toggle().html(text_value);
        if (text_value === undefined) {
          text_value = lg.new_folder;
        }
        getFolderName(text_value);
        getFolderInfo(path);
      });
    }

    // create a new folder
    var getFolderName = function(value) {
      var fname = value;

      if (fname != '') {
        foldername = cleanString(fname);
        var d = new Date(); // to prevent IE cache issues
        $.getJSON(fileConnector + '?mode=addfolder&path=' + $('.currentpath').val() + '&name=' + foldername, function(resp) {
          var result = resp.data.result;
          if (result.Code === 0) {
            alertify.success(lg.successful_added_folder);
            getFolderInfo(result.Parent);
          } else {
            alertify.error(result.Error);
          }
        });
      } else {
        alertify.error(lg.no_foldername);
      }
    };

  });
};

/*
 * Binds specific actions to the toolbar based on capability.
 * and show/hide buttons
 */
var bindToolbar = function(data) {

  // hide/show rename, upload and create button
  if(_.has(data, 'Capabilities')) {
    _.each(data.Capabilities, function(cap) {
      var target_btn = 'button.' + cap,
          $target_el = $('.file_manager').find(target_btn);
      if (!has_capability(data, cap) || hideButtons()) {
        $target_el.hide();
      } else {
        $target_el.show();
      }
    });
  }

  if (!has_capability(data, 'delete') || hideButtons()) {
    $('.file_manager').find('button.delete').hide();
  } else {
    $('.file_manager').find('button.delete').click(function() {
      // hide dimmer
      $('.fileinfo .delete_item, .fm_dimmer').show();
    });

    // take action based on pressed button yes or no
    $('.fileinfo .delete_item button.btn_yes').unbind().on('click', function() {
      var path;
      if ($('.fileinfo').data('view') == 'grid') {
        path = $('.fileinfo').find('#contents li.selected .clip span').attr('data-alt');
        if (path.lastIndexOf('/') == path.length - 1) {
          data.Path = path;
          deleteItem(data);
        } else {
          deleteItem(data);
        }
      } else {
        path = $('.fileinfo').find('table#contents tbody tr.selected td:first-child').attr('title');
        if (path.lastIndexOf('/') == path.length - 1) {
          data.Path = path;
          deleteItem(data);
        } else {
          deleteItem(data);
        }
      }
      // hide dimmer
      $('.fileinfo .fm_dimmer').hide();
    });

  }

  // Download file on download button click
  if (!has_capability(data, 'download') || hideButtons()) {
    $('.file_manager').find('button.download').hide();
  } else {
    $('.file_manager').find('button.download').unbind().click(function() {
      var path;
      if ($('.fileinfo').data('view') == 'grid') {
        path = $('.fileinfo li.selected').find('.clip span').attr('data-alt');
        window.open(fileConnector + '?mode=download&path=' + encodeURIComponent(path), '_blank');
      } else {
        path = $('.fileinfo').find('table#contents tbody tr.selected td:first-child').attr('title');
        window.open(fileConnector + '?mode=download&path=' + encodeURIComponent(path), '_blank');
      }
    });
  }
};

// enable/disable button when files/folder are loaded
var enable_disable_btn = function() {
  if ($('.fileinfo').data('view') == 'grid') {
    var $grid_file = $('.file_manager').find('#contents li.selected');
    $grid_file.removeClass('selected');
    $('.file_manager').find('button.delete').prop('disabled', true);
    $('.file_manager').find('button.download').prop('disabled', true);
    $('.file_manager').find('button.rename').prop('disabled', true);
    if ($grid_file.length > 0) {
      $('.create_input input[type="text"]').val('');
      $('.file_manager_ok').addClass('disabled');
    }
  } else {
    var $list_file = $('.fileinfo').find('table#contents tbody tr.selected');
    $list_file.removeClass('selected');
    $('.file_manager').find('button.delete').prop('disabled', true);
    $('.file_manager').find('button.download').prop('disabled', true);
    $('.file_manager').find('button.rename').prop('disabled', true);
    if ($list_file.length > 0) {
      $('.create_input input[type="text"]').val('');
      $('.file_manager_ok').addClass('disabled');
    }
  }

  $('.delete_item').hide();
  // clear address bar
  $('.file_manager #uploader h1').show();
  $('.file_manager #uploader .show_selected_file').remove();
};

/*
 * Rename the current item and returns the new name.
 * by double clicking or by clicking the "Rename" button in
 * table(list) views.
 */
var renameItem = function(data) {
  var orig_name = getFilename(data.Filename),
      finalName = '';

  var getNewName = function(rname) {
    if (rname !== '') {
      var givenName = nameFormat(rname),
          suffix = getExtension(data.Filename);
      if (suffix.length > 0) {
        givenName = givenName + '.' + suffix;
      }

      var oldPath = data.Path,
          post_data = {
            "mode": "rename",
            "old": data.Path,
            "new": givenName
          };

      $.ajax({
        type: 'POST',
        data: JSON.stringify(post_data),
        url: fileConnector,
        dataType: 'json',
        contentType: "application/json; charset=utf-8",
        async: false,
        success: function(resp) {
          var result = resp.data.result;
          if (result.Code === 0) {
            var newPath = result['New Path'],
                newName = result['New Name'],
                title = $("#preview h1").attr("title");

            if (typeof title !="undefined" && title == oldPath) {
              $('#preview h1').text(newName);
            }

            if ($('.fileinfo').data('view') == 'grid') {
              $('.fileinfo span[data-alt="' + oldPath + '"]').parent().next('p span').text(newName);
              $('.fileinfo span[data-alt="' + oldPath + '"]').attr('data-alt', newPath);
            } else {
              $('.fileinfo td[title="' + oldPath + '"]').text(newName);
              $('.fileinfo td[title="' + oldPath + '"]').attr('title', newPath);
            }
            $("#preview h1").html(newName);

            // actualized data for binding
            data.Path=newPath;
            data.Filename=newName;

            // UnBind toolbar functions.
            $('.fileinfo').find('button.rename, button.delete, button.download').unbind();

            alertify.success(lg.successful_rename);
          } else {
              alertify.error(result.Error);
          }

          finalName = result['New Name'];
        }
      });
    }
  };

  getNewName(data.NewFilename);
  return finalName;
};

/*
 * delete the folder or files by clicking the "Delete" button
 * in table(list) view
 */
var deleteItem = function(data) {
  var isDeleted = false,
      msg = lg.confirmation_delete;

  var doDelete = function(data) {
    var parent = data.Path.split('/').reverse().slice(1).reverse().join('/') + '/';
    var post_data = {
          "mode": "delete",
          "path": data.Path
        };

    $.ajax({
      type: 'POST',
      data: JSON.stringify(post_data),
      url: fileConnector,
      dataType: 'json',
      contentType: "application/json; charset=utf-8",
      async: false,
      success: function(resp) {
        var result = resp.data.result;
        if (result.Code === 0) {
          isDeleted = true;
          if (isDeleted) {
            alertify.success(lg.successful_delete);
            var rootpath = result.Path.substring(0, result.Path.length-1); // removing the last slash
                rootpath = rootpath.substr(0, rootpath.lastIndexOf('/') + 1);
            getFolderInfo(rootpath);
          }
        } else {
          isDeleted = false;
          alertify.error(result.Error);
        }
      }
    });
    return isDeleted;
  };

  doDelete(data);
  return isDeleted;
};

/*---------------------------------------------------------
  Functions to Retrieve File and Folder Details
---------------------------------------------------------*/

/* Decides whether to retrieve file or folder info based on
 * the path provided.
 */
var getDetailView = function(path) {
  if (path.lastIndexOf('/') == path.length - 1) {
    var allowed_types = config.options.allowed_file_types;
    var set_type = allowed_types[0];
    if (allowed_types[0] == "*") {
      set_type = allowed_types[1];
    }
    getFolderInfo(path, set_type);
  }
};

/*
 * Retrieves information about the specified file as a JSON
 * object and uses that data to populate a template for
 * list views. Binds the toolbar for that file/folder to
 * enable specific actions. Called whenever an item is
 * clicked in list views.
 */
var getFileInfo = function(file) {
  // Update location for status, upload, & new folder functions.
  var currentpath = file.substr(0, file.lastIndexOf('/') + 1);
  setUploader(currentpath);

  // Retrieve the data & populate the template.
  var d = new Date(); // to prevent IE cache issues
  var post_data = {
        'path': file,
        'mode': 'getinfo'
      };

  $.ajax({
    type: 'POST',
    data: JSON.stringify(post_data),
    url: fileConnector,
    dataType: 'json',
    contentType: "application/json; charset=utf-8",
    async: false,
    success: function(resp) {
      var data = resp.data.result;

      if (data.Code === 0) {
        var properties = '';
        if (
          data.Properties.Size || parseInt(data.Properties.Size)==0
        ) {
          properties += '<dt>' + lg.size + '</dt><dd>' + formatBytes(
            data.Properties.Size
          ) + '</dd>';
        }
        data.Capabilities = capabilities;
        bindToolbar(data);
      } else {
        alertify.error(data.Error);
      }
    }
  });
};

/*
 * Retrieves data for all items within the given folder and
 * creates a list view.
 */
var getFolderInfo = function(path, file_type) {
  if (!file_type) {
    file_type = '';
  }
  // Update location for status, upload, & new folder functions.
  setUploader(path);

  // set default selected file type
  if (file_type === '') {
    file_type = $('.change_file_types select').val();
  }

  // navigate to directory or path when clicked on breadcrumbs
  $('.file_manager a.breadcrumbs').unbind().on('click', function() {
    var curr_path = $(this).attr('data-path'),
        current_dir = $(this).html(),
        move_to = curr_path.substring(
          0, curr_path.lastIndexOf(current_dir)
        ) + current_dir;

    getFolderInfo(move_to);
    enab_dis_level_up();
  });

   // hide select file if we are listing drives in windows.
   if (hideButtons()) {
     $(".allowed_file_types .change_file_types").hide();
   } else {
     $(".allowed_file_types .change_file_types").show();
   }

  // Display an activity indicator.
  $('.fileinfo').find('span.activity').html(
    "<img src='{{ url_for('browser.static', filename='css/aciTree/image/load-root.gif') }}'>"
  );

  var post_data = {
    'path': path,
    'mode': 'getfolder',
    'file_type': file_type || "*"
  };

  $.ajax({
    type: 'POST',
    data: JSON.stringify(post_data),
    url: fileConnector,
    dataType: 'json',
    contentType: "application/json; charset=utf-8",
    async: false,
    success: function(resp) {
      var result = '',
          data = resp.data.result;

      // hide activity indicator
      $('.fileinfo').find('span.activity').hide();
      if (data.Code === 0) {
        alertify.error(data.err_msg);
        return;
      }

      // generate HTML for files/folder and render into container
      if (!_.isEmpty(data)) {
        if ($('.fileinfo').data('view') == 'grid') {
          result += '<ul id="contents" class="grid">';
          Object.keys(data).sort(function keyOrder(x, y) {
              return pgAdmin.natural_sort(x.toLowerCase(), y.toLowerCase());
            }).forEach(function (key) {
            var props = (data[key]).Properties,
                cap_classes = "";

            Object.keys(capabilities).forEach(function (cap) {
              if (has_capability(data[key], capabilities[cap])) {
                cap_classes += "cap_" + capabilities[cap];
              }
            });

            (data[key]).Capabilities = capabilities;
            bindToolbar(data[key]);

            var class_type;
            if ((data[key]).file_type == 'dir') {
              class_type = 'fa fa-folder-open fm_folder';
            } else if ((data[key]).file_type == 'drive') {
              class_type = 'fa fa-hdd-o fm_drive';
            } else {
              class_type = 'fa fa-file-text fm_file';
            }

            var fm_filename = (data[key]).Filename;
            if (fm_filename.length > 15 ) {
              fm_filename = (data[key]).Filename.substr(0, 10) +'...';
            }

            var file_name_original = encodeURI((data[key]).Filename);
            var file_path_orig = encodeURI((data[key]).Path);

            result += '<li class="' + cap_classes +
              '"><div class="clip"><span data-alt="' +
                file_path_orig + '" class="' + class_type + '"></span>';
            if ((data[key]).Protected == 1) {
              result += '<span class="fa fa-lock fm_lock_icon" data-protected="protected"></span>';
            }

            result += '</div>';
            if (!has_capability(data[key], 'rename')) {
              result += '<span>' + fm_filename + '</span>';
            } else {
              result +=
                '<p><input type="text" class="fm_file_rename" />' +
                '<span class="less_text" title="' + file_name_original+'">' + fm_filename +
                '</span></p>';
            }
            if (props.Width && props.Width != '') {
               result += '<span class="meta dimensions">' +
                 props.Width + 'x' + props.Height + '</span>';
            }
            if (props.Size && props.Size != '') {
              result += '<span class="meta size">' +
                props.Size + '</span>';
            }
            if (props['Date Created'] && props['Date Created'] != '') {
              result += '<span class="meta created">' +
                props['Date Created'] + '</span>';
            }
            if (props['Date Modified'] && props['Date Modified'] != '') {
              result += '<span class="meta modified">' +
                props['Date Modified'] + '</span>';
            }
            result += '</li>';
          });

          result += '</ul>';
        } else {
          result += '<table id="contents" class="list">';
          result += '<thead><tr><th class="headerSortDown">';
          result += '<span>' + lg.name +'</span></th>';
          result += '<th><span>' + lg.size + '</span></th><th>';
          result += '<span>' + lg.modified + '</span></th></tr></thead>';
          result += '<tbody>';

          Object.keys(data).sort(function keyOrder(x, y) {
              return pgAdmin.natural_sort(x.toLowerCase(), y.toLowerCase());
            }).forEach(function (key) {
            var path = encodeURI((data[key]).Path),
                props = (data[key]).Properties,
                cap_classes = "", cap, class_type;

            for (cap in capabilities) {
              if (has_capability(data[key], capabilities[cap])) {
                cap_classes += " cap_" + capabilities[cap];
              }
            }

            (data[key]).Capabilities = capabilities;
            bindToolbar(data[key]);

            if ((data[key]).file_type == 'dir') {
              class_type = 'fa fa-folder-open tbl_folder';
            }
            else if ((data[key]).file_type == 'drive') {
              class_type = 'fa fa-hdd-o tbl_drive';
            } else {
              class_type = 'fa fa-file-text tbl_file';
            }

            var file_name_original = encodeURI((data[key]).Filename);
            result += '<tr class="' + cap_classes + '">';

            var fm_filename = (data[key]).Filename;
            if (fm_filename.length > 48) {
              fm_filename = (data[key]).Filename.substr(0, 48) +'...';
            }

            result += '<td title="' + path + '" class="'+class_type+'">';
            if ((data[key]).Protected == 1) {
              result +=
                '<i class="fa fa-lock tbl_lock_icon" data-protected="protected"></i>';
            }
            if (!has_capability(data[key], 'rename')) {
              result += '<span title="' + (data[key]).Filename + '">' +
                fm_filename + '</span></td>';
            } else {
              result += '<p><input type="text" class="fm_file_rename"/><span class="less_text" title="' +
                file_name_original + '">' + fm_filename + '</span></p></td>';
            }
            if (props.Size && props.Size != '') {
              result += '<td><abbr title="' + props.Size + '">' +
                props.Size + '</abbr></td>';
            } else {
              result += '<td></td>';
            }

            if (props['Date Modified'] && props['Date Modified'] != '') {
              result += '<td>' + props['Date Modified'] + '</td>';
            } else {
              result += '<td></td>';
            }

            result += '</tr>';
          });

          result += '</tbody>';
          result += '</table>';
        }
      } else {
        if ($('.fileinfo').data('view') == 'grid') {
          result += '<ul id="contents" class="grid"></ul>';
        } else {
          result += '<table id="contents" class="list">';
          result += '<thead><tr><th class="headerSortDown"><span>' +
            lg.name + '</span></th><th><span>' + lg.size +
              '</span></th><th><span>' + lg.modified +
              '</span></th></tr></thead>';
          result += '<tbody>';
        }
        result += '<h1 class="no_folder_found">' +
          lg.could_not_retrieve_folder + '</h1>';

        var cap_no_folders = ['upload', 'create'];

        data.Capabilities = cap_no_folders;
        bindToolbar(data);
      }

      // Add the new markup to the DOM.
      $('.fileinfo .file_listing').html(result);

      // rename file/folder
      $('.file_manager button.rename').unbind().on('click',function(e) {
        if ($('.fileinfo').data('view') == 'grid') {
          e.stopPropagation();
          var $this = $('.file_manager').find('#contents li.selected p'),
              orig_value = decodeURI($this.find('span').attr('title')),
              newvalue = orig_value.substring(0, orig_value.indexOf('.'));

          if (newvalue === '') {
            newvalue = decodeURI(orig_value);
          }

          $this.find('input').toggle().val(newvalue).focus();
          $this.find('span').toggle();

          // Rename folder/file on pressing enter key
          $('.file_manager').unbind().on('keyup', function(e) {
            if (e.keyCode == 13) {
              e.stopPropagation();
              $('.fileinfo #contents li.selected p').find(
                'input'
              ).trigger('blur');
            }
          });
        } else if ($('.fileinfo').data('view') == 'list') {
          e.stopPropagation();
          var $this = $('.fileinfo').find(
                'table#contents tbody tr.selected td:first-child p'
              ),
              orig_value = decodeURI($this.find('span').html()),
              newvalue = orig_value.substring(0, orig_value.lastIndexOf('.'));

          if (orig_value.lastIndexOf('/') == orig_value.length - 1 || newvalue === '') {
            newvalue = decodeURI(orig_value);
          }

          $this.find('input').toggle().val(newvalue).focus();
          $this.find('span').toggle();

          // Rename folder/file on pressing enter key
          $('.file_manager').unbind().on('keyup', function(e) {
            if (e.keyCode == 13) {
              e.stopPropagation();
              $('.fileinfo table#contents tr.selected td p').find(
                'input'
              ).trigger('blur');
            }
          });
        }
      });

      // Rename UI handling
      $('.fileinfo #contents li p').on('blur dblclick','input', function(e) {
        e.stopPropagation();

        var old_name = decodeURI($(this).siblings('span').attr('title')),
            newvalue = old_name.substring(0, old_name.indexOf('.')),
            last = getFileExtension(old_name);

        if (old_name.indexOf('.') == 0) {
          last = '';
        }

        if (newvalue == '') {
          newvalue = decodeURI(old_name);
        }

        if (e.type=="keydown") {
          if (e.which==13) {
            var full_name = decodeURI($(this).val()) + (
              last !== '' ? '.' + last: ''
            );

            $(this).toggle();
            $(this).siblings('span').toggle().html(full_name);

            var new_name = decodeURI($(this).val()),
                path = decodeURI($(this).parent().parent().find(
                  'span'
                ).attr('data-alt')),
                data = {
                  'Filename': old_name,
                  'Path': path,
                  'NewFilename': new_name
                };

            if (newvalue !== new_name) {
              renameItem(data);
              var parent = $('.currentpath').val();
              getFolderInfo(parent);
            }
            e.stopPropagation();
          }

          if (
            e.which==38 || e.which==40 || e.which==37 ||
            e.which==39 || e.keyCode == 32
          ) {
              e.stopPropagation();
          }
        } else if (e.type=="focusout") {
          if ($(this).css('display')=="inline-block") {
            var full_name = decodeURI(
                  $(this).val()
                ) + (last !== ''? '.' + last: '');

            $(this).toggle();
            $(this).siblings('span').toggle().html(full_name);

            var new_name = decodeURI($(this).val()),
                path = decodeURI($(this).parent().parent().find(
                  'span'
                ).attr('data-alt')),
                data = {
                  'Filename': old_name,
                  'Path': path,
                  'NewFilename': new_name
                };

            if (newvalue !== new_name) {
              renameItem(data);
              getFolderInfo($('.currentpath').val());
            }
          }
        } else {
          e.stopPropagation();
        }
      });

      $('.fileinfo table#contents tr td p').on(
        'blur dblclick', 'input', function(e) {
        var old_name = decodeURI($(this).siblings('span').attr('title')),
            newvalue = old_name.substring(0, old_name.indexOf('.')),
            last = getFileExtension(old_name);

        if (old_name.indexOf('.') == 0) {
          last = '';
        }

        if (newvalue == '') {
          newvalue = old_name;
        }

        if (e.type=="focusout") {
          if ($(this).css('display')=="inline-block") {
            var full_name = decodeURI($(this).val()) + (
              last !== ''? '.' + last: ''
            );
            $(this).toggle();
            $(this).siblings('span').toggle().html(full_name);

            var new_name = decodeURI($(this).val()),
                path = decodeURI($(this).parent().parent().attr('title')),
                data = {
                  'Filename': old_name,
                  'Path': path,
                  'NewFilename': new_name
                };

            if (newvalue !== new_name) {
              renameItem(data);
              var parent = path.split('/').reverse().slice(2).reverse().join('/') + '/';
              getFolderInfo(parent);
            }
          }
        } else {
          e.stopPropagation();
        }
      });

      var data_cap = {};
      data_cap.Capabilities = capabilities;
      /*
       * Bind click events
       * Select items - afolder dblclick
       */
      if ($('.fileinfo').data('view') == 'grid') {
        // Get into folder on dblclick
        $('.fileinfo').find('#contents li').dblclick(function(e) {
          e.stopPropagation();

          // Enable/Disable level up button
          enab_dis_level_up();

          var path = decodeURI($(this).find('span').attr('data-alt'));

          if (path.lastIndexOf("/") == path.length - 1) {
            $('.file_manager_ok').addClass('disabled');

            var $create_input = $('.create_input input[type="text"]');

            $('.file_manager button.delete, .file_manager button.rename').attr('disabled', 'disabled');
            $('.file_manager button.download').attr('disabled', 'disabled');

            getFolderInfo(path);
            if ($create_input.length != 0 && $create_input.val() != '') {
              $('.file_manager_ok').removeClass('disabled');
            }
          } else {
            getFileInfo(path);
          }
        });

        $('.fileinfo').find('#contents li').click(function(e) {
          e.stopPropagation();
          var path = decodeURI($(this).find('.clip span').attr('data-alt')),
              file_name = $(this).find('p span').attr('title'),
              is_protected = $(this).find(
                '.clip span.fm_lock_icon'
              ).attr('data-protected');

          if (path.lastIndexOf('/') == path.length - 1) {
            if (
              has_capability(data_cap, 'select_folder') &&
              is_protected == undefined
            ) {
              $(this).parent().find('li.selected').removeClass('selected');
              $(this).addClass('selected');

              $('.file_manager_ok').removeClass('disabled');
              $('.file_manager button.delete, .file_manager button.rename').removeAttr(
                'disabled', 'disabled'
              );
              $('.file_manager button.download').attr(
                'disabled', 'disabled'
              );
              // set selected folder name in breadcrums
              $('.file_manager #uploader h1').hide();
              $('.file_manager #uploader .show_selected_file').remove();
              $('<span class="show_selected_file">'+path+'</span>').appendTo(
                '.file_manager #uploader .filemanager-path-group'
              );
            }
          } else {
            if (
              has_capability(data_cap, 'select_file') &&
              is_protected == undefined
            ) {
              $(this).parent().find('li.selected').removeClass('selected');
              $(this).addClass('selected');
              $('.file_manager_ok').removeClass('disabled');
              $('.file_manager button.delete, .file_manager button.download, .file_manager button.rename').removeAttr(
                'disabled'
              );
              // set selected folder name in breadcrums
              $('.file_manager #uploader .show_selected_file').remove();
            }

            if (
              config.options.dialog_type == 'create_file' &&
              is_protected == undefined
            ) {
              $('.create_input input[type="text"]').val(file_name);
              $('.file_manager_ok, .file_manager_create').removeClass('disabled');
            }
            getFileInfo(path);
          }
        });
      } else {
        $('.fileinfo table#contents tbody tr').on('click', function(e) {
          e.stopPropagation();
          var path = decodeURI($('td:first-child', this).attr('title')),
              file_name = decodeURI($('td:first-child p span', this).attr(
                'title'
              )),
              is_protected = $('td:first-child', this).find(
                'i.tbl_lock_icon'
              ).attr('data-protected');

          if (path.lastIndexOf('/') == path.length - 1) {
            if (has_capability(data_cap, 'select_folder') && is_protected == undefined) {
              $(this).parent().find('tr.selected').removeClass('selected');
              $('td:first-child', this).parent().addClass('selected');
              $('.file_manager_ok').removeClass('disabled');
              $('.file_manager button.download').attr('disabled', 'disabled');
              $('.file_manager button.delete, .file_manager button.rename').removeAttr('disabled');

              // set selected folder name in breadcrums
              $('.file_manager #uploader h1').hide();
              $('.file_manager #uploader .show_selected_file').remove();
              $('<span class="show_selected_file">'+path+'</span>').appendTo(
                '.file_manager #uploader .filemanager-path-group'
              );
            }
          } else {
            if (has_capability(data_cap, 'select_file') && is_protected == undefined) {
              $(this).parent().find('tr.selected').removeClass('selected');
              $('td:first-child', this).parent().addClass('selected');
              $('.file_manager_ok').removeClass('disabled');
              $('.file_manager button.delete, .file_manager button.download, .file_manager button.rename').removeAttr(
                'disabled'
              );
              // set selected folder name in breadcrums
              $('.file_manager #uploader .show_selected_file').remove();
            }
            if (
              config.options.dialog_type == 'create_file' &&
              is_protected == undefined
            ) {
              $('.create_input input[type="text"]').val(file_name);
              $('.file_manager_ok, .file_manager_create').removeClass('disabled');
            }
            getFileInfo(path);
          }
        });

        $('.fileinfo table#contents tbody tr').on('dblclick', function(e) {
          e.stopPropagation();

          // Enable/Disable level up button
          enab_dis_level_up();

          var path = $('td:first-child', this).attr('title');

          if (path.lastIndexOf('/') == path.length - 1) {
            $('.file_manager_ok').removeClass('disabled');
            $('.file_manager button.download').attr('disabled', 'disabled');
            $('.file_manager button.delete, .file_manager button.rename').attr('disabled', 'disabled');
            getFolderInfo(path);
          } else {
            getFileInfo(path);
          }
        });

      }
    }
  });
};

// Enable/Disable level up button
var enab_dis_level_up = function() {
  $('.file_manager #uploader h1').show();
  $('.show_selected_file').remove();

  setTimeout(function() {
    var b = $('.currentpath').val(),
        $level_up = $('.file_manager').find('button.level-up'),
        $home_btn = $('.file_manager').find('button.home');

    if (b === fileRoot) {
      $level_up.attr('disabled', 'disabled');
      $home_btn.attr('disabled', 'disabled');
    } else {
      $home_btn.removeAttr('disabled');
      $level_up.removeAttr('disabled');
    }
  }, 100);
};

/*---------------------------------------------------------
  Initialization - Entry point
---------------------------------------------------------*/
/*
 * get transaction id to generate request url and
 * to generate config files on runtime
 */
var fm_url = "{{ url_for('file_manager.index') }}get_trans_id",
    transId = loadData(fm_url),
    t_res,
    t_id;

if (transId.readyState == 4) {
  t_res = JSON.parse(transId.responseText);
}
t_id = t_res.data.fileTransId;

var root_url = '{{ url_for("file_manager.index") }}',
    file_manager_config_json = root_url+t_id+'/file_manager_config.json',
    file_manager_config_js = root_url+'file_manager_config.js',
    fileConnector = root_url+'filemanager/'+t_id+'/',
    cfg = loadData(file_manager_config_json),
    config;

// load user configuration file
if (cfg.readyState == 4) {
  config = JSON.parse(cfg.responseText);
}

// set main url to filemanager and its capabilites
var fileRoot = config.options.fileRoot,
    capabilities = config.options.capabilities;

/*
 * Get localized messages from file
 * through culture var or from URL
 */
var lg = [],
    enjs = '{{ url_for("file_manager.index") }}' + "en.js",
    lgf = loadData(enjs);

if (lgf.readyState == 4) {
  lg = JSON.parse(lgf.responseText);
}

// create and enable user to create new file
if (
  config.options.dialog_type == 'select_file' ||
  config.options.dialog_type == 'create_file' ||
  config.options.dialog_type == 'storage_dialog'
) {
  // Create file selection dropdown
  var allowed_types = config.options.allowed_file_types,
      types_len = allowed_types.length,
      select_box = '',
      file_type = '';

  if (types_len > 0) {
    var i = 0, j = 0, t,
        selected = false,
        have_all_types = false;

    select_box = "<div class='change_file_types'>" +
      "<select name='type'>";

    while(i < types_len) {
      t = allowed_types[i];
      if (!selected && (types_len == 1 || t != '*')) {
        select_box += "<option value=" + t + " selected>" + t + "</option>";
        selected = true;
        have_all_types = (have_all_types || (t == '*'));
      } else {
        select_box += '<option value="' + t +'">' +
          (t == '*' ? '{{ _("All Files") }}' : t) + "</option>";
        have_all_types = (have_all_types || (t == '*'));
      }
      i++;
    }

    if (!have_all_types) {
      select_box += '<option value="*">{{ _("All Files") }}</option>';
    }
    select_box += "</select><label>{{ _('Format') }}: </label></div>";
  }

  $(".allowed_file_types").html(select_box);

  $(".allowed_file_types select").on('change', function() {
    var selected_val = $(this).val(),
        curr_path = $('.currentpath').val();
    getFolderInfo(curr_path, selected_val);
  });
}

if (config.options.dialog_type == 'create_file') {
  var create_file_html = '<div class="create_input">'+
      '<span>Filename:</span>'+
      '<input type="text" name="new_filename" class="fm_create_input form-control" />'+
    '</div>';

  $('.create_mode_dlg').find('.allowed_file_types').prepend(create_file_html);
  $('.create_input input[type="text"]').on('keypress, keydown', function() {
    var input_text_len = $(this).val().length;
    if (input_text_len > 0 ) {
      $('.file_manager_ok').removeClass('disabled');
    } else {
      $('.file_manager_ok').addClass('disabled');
    }
  });
}

/*---------------------------------------------------------
  Item Actions - Object events
---------------------------------------------------------*/

// switch to folder view
$('.file_manager .fileinfo').on('click', function(e) {
  enable_disable_btn();
});

// refresh current directory
$('.file_manager .refresh').on('click', function(e) {
  enable_disable_btn();
  var curr_path = $('.currentpath').val(),
      path = curr_path.substring(
        0, curr_path.lastIndexOf("/")
      ) + "/";
  getFolderInfo(path);
});

// hide message prompt and dimmer if clicked no
$('.delete_item button.btn_no').on('click', function() {
  $('.delete_item, .fileinfo .fm_dimmer').hide();
});

// Disable home button on load
$('.file_manager').find('button.home').attr('disabled', 'disabled');
$('.file_manager').find('button.rename').attr('disabled', 'disabled');

// stop click event on dimmer click
$('.fileinfo .fm_dimmer').on('click', function(e) {
  e.stopPropagation();
});

$('.fileinfo .replace_file').not(
  $(this).find('span.pull-right')
).on(
'click', function(e) {
  $('#uploader .filemanager-btn-group').unbind().on(
    'click', function() {
      $('.fileinfo .delete_item, .fileinfo .replace_file, .fileinfo .fm_dimmer').hide();
    });
  e.stopPropagation();
});

// Set initial view state.
$('.fileinfo').data('view', config.options.defaultViewMode);
setViewButtonsFor(config.options.defaultViewMode);

// Upload click event
$('.file_manager .uploader').on('click', 'a', function(e) {
  e.preventDefault();
  var b = $('.currentpath').val();
  var node_val = $(this).next().text();
  parent = b.substring(0, b.slice(0, -1).lastIndexOf(node_val));
  getFolderInfo(parent);
});

// re-render the home view
$('.file_manager .home').click(function() {
  var currentViewMode = $('.fileinfo').data('view');
  $('.fileinfo').data('view', currentViewMode);
  getFolderInfo(fileRoot);
  enab_dis_level_up();
});

// Go one directory back
$(".file_manager .level-up").click(function() {
  var b = $('.currentpath').val();

  // Enable/Disable level up button
  enab_dis_level_up();

  if (b != fileRoot) {
      parent = b.substring(0, b.slice(0, -1).lastIndexOf("/")) + "/";
      var d = $(".fileinfo").data("view");
      $(".fileinfo").data("view", d);
      getFolderInfo(parent);
  }
});

// set buttons to switch between grid and list views.
$('.file_manager .grid').click(function() {
  setViewButtonsFor('grid');
  $('.fileinfo').data('view', 'grid');
  enable_disable_btn();
  getFolderInfo($('.currentpath').val());
});

// Show list mode
$('.file_manager .list').click(function() {
  setViewButtonsFor('list');
  $('.fileinfo').data('view', 'list');
  enable_disable_btn();
  getFolderInfo($('.currentpath').val());
});

// Provide initial values for upload form, status, etc.
setUploader(fileRoot);

$('#uploader').attr('action', fileConnector);

var data = {
  'Capabilities': capabilities
};

// Upload file
if (has_capability(data, 'upload')) {
  Dropzone.autoDiscover = false;
  // we remove simple file upload element
  $('.file-input-container').remove();
  $('.upload').remove();
  $( ".create" ).before( '<button value="Upload" type="button" title="Upload File" name="upload" id="upload" class="btn fa fa-upload upload"><span></span></button> ' );

  $('#uploader .upload').unbind().click(function() {
    // we create prompt
    var msg  = '<div id="dropzone-container">' +
          '<button class="fa fa-times dz_cross_btn"></button>' +
          '<div id="multiple-uploads" class="dropzone"></div>' +
          '<div class="prompt-info">' + lg.file_size_limit +
          config.upload.fileSizeLimit + ' ' + lg.mb + '.</div>',
          error_flag = false,
          path = $('.currentpath').val(),
          filesizelimit = config.upload.fileSizeLimit,
          // default dropzone value
          fileSize = (filesizelimit != 'auto') ? filesizelimit : 256,
          acceptFiles;

    if (config.security.uploadPolicy == 'DISALLOW_ALL') {
      acceptFiles = '.' + config.security.uploadRestrictions.join(',.');
    } else {
      // We allow any extension since we have no easy way to handle the the
      // built-in `acceptedFiles` params would be handled later by the
      // connector.
      acceptFiles = null;
    }

    $('.file_manager .upload_file').toggle();
    $('.file_manager .upload_file').html(msg);

    //var previewTemplate = '<div id="dropzone-container">';
    var previewTemplate = '<div class="file_upload_main dz-preview dz-file-preview">'+
          '<div class="show_error">' +
          '<p class="size dz-size" data-dz-size></p>' +
          '<p class="name dz-filename" data-dz-name></p>' +
          '</div>' +
          '<div class="dz-progress"><span class="dz-upload" data-dz-uploadprogress></span></div>' +
          '<div class="dz-success-mark"><span></span></div>' +
          '<div class="dz-error-mark"><span></span></div>' +
          '<div class="dz-error-message"><span data-dz-errormessage></span></div>' +
          '<a href="javascript:void(0);" class="fa fa-trash dz_file_remove" data-dz-remove></a>' +
          '</div>';

    $("div#multiple-uploads").dropzone({
      paramName: "newfile",
      url: fileConnector,
      maxFilesize: fileSize,
      maxFiles: config.upload.number,
      addRemoveLinks: true,
      previewTemplate: previewTemplate,
      parallelUploads: config.upload.number,
      dictMaxFilesExceeded: lg.dz_dictMaxFilesExceeded.replace(
        "%s", config.upload.number
      ),
      dictDefaultMessage: lg.dz_dictDefaultMessage,
      dictInvalidFileType: lg.dz_dictInvalidFileType,
      dictFileTooBig: lg.file_too_big + ' ' + lg.file_size_limit +
        config.upload.fileSizeLimit + ' ' + lg.mb,
      acceptedFiles: acceptFiles,
      autoProcessQueue: true,
      init: function() {
        var dropzone = this;

        $('.dz_cross_btn').unbind().on('click', function() {
          $('.file_manager .upload_file').toggle();
        });
      },
      sending: function(file, xhr, formData) {
        formData.append("mode", "add");
        formData.append("currentpath", path);
        $('.upload_file .dz_cross_btn').attr('disabled', 'disabled');
        setTimeout(function() {}, 10000);
      },
      success: function(file, response) {
        var data = response.data.result,
            $this = $(file.previewTemplate);

        if (data.Code == 0) {
          setTimeout(function() {
            $this.find(".dz-upload").addClass("success");
          }, 1000);
          $this.find(".dz-upload").css('width', "100%").html("100%");
          alertify.success(lg.upload_success);
        } else {
          $this.find(".dz-upload").addClass("error");
          $this.find(".dz-upload").css('width', "0%").html("0%");
          alertify.error(data.Error);
        }
        getFolderInfo(path);
      },
      totaluploadprogress: function(progress) {},
      complete: function(file) {
        if (file.status == "error") {
          alertify.error(lg.ERROR_UPLOADING_FILE);
        }
        $('.upload_file .dz_cross_btn').removeAttr('disabled');
        getFolderInfo(path);
      }
    });
  });
}
getDetailView(fileRoot);
})(jQuery);
//@ sourceURL=utility.js
