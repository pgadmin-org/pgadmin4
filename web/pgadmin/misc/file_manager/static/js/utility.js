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
import loading_icon from 'acitree/image/load-root.gif';

define([
  'jquery', 'underscore', 'underscore.string', 'pgadmin.alertifyjs',
  'sources/gettext', 'sources/url_for', 'dropzone', 'sources/pgadmin',
  'tablesorter',
], function($, _, S, Alertify, gettext, url_for, Dropzone, pgAdmin) {

  /*---------------------------------------------------------
    Define functions used for various operations
  ---------------------------------------------------------*/

  // Return file extension
  var getFileExtension = function(name) {
    var found = name.lastIndexOf('.') + 1;
    return (found > 0 ? name.substr(found) : '');
  };

  /* Common function to load:
   * en.js language file
   * file_manager_config.js config file
   * return transaction id
   */
  var loadData = function(url) {
    return $.ajax({
      async: false,
      cache: false,
      url: url,
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
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

  var save_file_dialog_view = function(view, trans_id) {
    return $.ajax({
      url: url_for('file_manager.save_file_dialog_view', {
        'trans_id': trans_id,
      }),
      type: 'POST',
      async: true,
      data: JSON.stringify({
        'view': view,
      }),
      contentType: 'application/json',
    });
  };

  var save_show_hidden_file_option = function(option, trans_id) {
    return $.ajax({
      url: url_for('file_manager.save_show_hidden_file_option', {
        'trans_id': trans_id,
      }),
      type: 'PUT',
      async: true,
      data: JSON.stringify({
        'show_hidden': option,
      }),
      contentType: 'application/json',
    });
  };

  // nameFormat (), separate filename from extension
  var nameFormat = function(input) {
    var filename = '';
    if (input.lastIndexOf('.') != -1) {
      filename = input.substr(0, input.lastIndexOf('.'));
      filename += '.' + input.split('.').pop();
    } else {
      filename = input;
    }
    return filename;
  };

  /*
   * Test if Data structure has the 'cap' capability
   * 'cap' is one of 'select', 'rename', 'delete', 'download'
   */
  var has_capability = function(data, cap) {
    if (typeof(data.Capabilities) == 'undefined') {
      return true;
    } else {
      return ($.inArray(cap, data.Capabilities) > -1);
    }
  };

  // return filename extension
  var getExtension = function(filename) {
    if (filename.split('.').length == 1) {
      return '';
    }
    return filename.split('.').pop();
  };

  /*
   * Binds specific actions to the toolbar based on capability.
   * and show/hide buttons
   */
  var bindToolbar = function(data) {

    // hide/show rename, upload and create button
    if (_.has(data, 'Capabilities')) {
      _.each(data.Capabilities, function(cap) {
        var target_btn = 'button.' + cap,
          $target_el = $('.file_manager').find(target_btn);
        if (!has_capability(data, cap) || pgAdmin.FileUtils.hideButtons()) {
          $target_el.hide();
        } else {
          $target_el.show();
        }
      });
    }

    if (!has_capability(data, 'delete') || pgAdmin.FileUtils.hideButtons()) {
      $('.file_manager').find('button.delete').hide();
    } else {
      $('.file_manager').find('button.delete').on('click',() => {
        // hide dimmer
        $('.fileinfo .delete_item, .fm_dimmer').show();
      });

      // take action based on pressed button yes or no
      $('.fileinfo .delete_item button.btn_yes').off().on('click', function() {
        var path;
        if ($('.fileinfo').data('view') == 'grid') {
          path = decodeURI($('.fileinfo').find('#contents li.selected .clip span').attr('data-alt'));
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
    if (!has_capability(data, 'download') || pgAdmin.FileUtils.hideButtons()) {
      $('.file_manager').find('button.download').hide();
    } else {
      $('.file_manager').find('button.download').off().on('click', function() {
        var path;
        if ($('.fileinfo').data('view') == 'grid') {
          path = $('.fileinfo li.selected').find('.clip span').attr('data-alt');
          window.open(pgAdmin.FileUtils.fileConnector + '?_=' + Date.now() + 'mode=download&path=' + path, '_blank');
        } else {
          path = $('.fileinfo').find('table#contents tbody tr.selected td:first-child').attr('title');
          window.open(pgAdmin.FileUtils.fileConnector + '?_=' + Date.now() + 'mode=download&path=' + path, '_blank');
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
        $('.file_manager_ok').addClass('disabled');
        $('.file_manager_ok').attr('disabled', true);
      }
    } else {
      var $list_file = $('.fileinfo').find('table#contents tbody tr.selected');
      $list_file.removeClass('selected');
      $('.file_manager').find('button.delete').prop('disabled', true);
      $('.file_manager').find('button.download').prop('disabled', true);
      $('.file_manager').find('button.rename').prop('disabled', true);
      if ($list_file.length > 0) {
        $('.file_manager_ok').addClass('disabled');
        $('.file_manager_ok').attr('disabled', true);
      }
    }

    $('.delete_item').hide();
    // clear address bar
    $('.file_manager #uploader .input-path').show();
    $('.file_manager #uploader .show_selected_file').remove();
  };

  /*
   * Rename the current item and returns the new name.
   * by double clicking or by clicking the "Rename" button in
   * table(list) views.
   */
  var renameItem = function(data) {
    var finalName = '',
      lg = pgAdmin.FileUtils.lg,
      getNewName = function(rname) {
        if (rname !== '') {
          var givenName = nameFormat(rname),
            suffix = getExtension(data.Filename);
          if (suffix.length > 0) {
            givenName = givenName + '.' + suffix;
          }

          var oldPath = data.Path,
            post_data = {
              'mode': 'rename',
              'old': data.Path,
              'new': givenName,
            };

          $.ajax({
            type: 'POST',
            data: JSON.stringify(post_data),
            url: pgAdmin.FileUtils.fileConnector,
            dataType: 'json',
            contentType: 'application/json; charset=utf-8',
            async: false,
          })
          .done(function(resp) {
            var result = resp.data.result;
            if (result.Code === 1) {
              var newPath = result['New Path'],
                newName = result['New Name'],
                title = $('#preview h1').attr('title');

              if (typeof title != 'undefined' && title == oldPath) {
                $('#preview h1').text(newName);
              }

              if ($('.fileinfo').data('view') == 'grid') {
                $('.fileinfo span[data-alt="' + oldPath + '"]').parent().next('p span').text(newName);
                $('.fileinfo span[data-alt="' + oldPath + '"]').attr('data-alt', newPath);
              } else {
                $('.fileinfo td[title="' + oldPath + '"]').text(newName);
                $('.fileinfo td[title="' + oldPath + '"]').attr('title', newPath);
              }
              $('#preview h1').html(newName);

              // actualized data for binding
              data.Path = newPath;
              data.Filename = newName;

              // UnBind toolbar functions.
              $('.fileinfo').find('button.rename, button.delete, button.download').off();

              Alertify.success(lg.successful_rename);
            } else {
              Alertify.error(result.Error);
            }

            finalName = result['New Name'];
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
      lg = pgAdmin.FileUtils.lg;

    var doDelete = function(data) {
      var post_data = {
        'mode': 'delete',
        'path': data.Path,
      };

      $.ajax({
        type: 'POST',
        data: JSON.stringify(post_data),
        url: pgAdmin.FileUtils.fileConnector,
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        async: false,
      })
      .done(function(resp) {
        var result = resp.data.result;
        if (result.Code === 1) {
          isDeleted = true;
          if (isDeleted) {
            Alertify.success(lg.successful_delete);
            var rootpath = result.Path.substring(0, result.Path.length - 1); // removing the last slash
            rootpath = rootpath.substr(0, rootpath.lastIndexOf('/') + 1);
            getFolderInfo(rootpath);
          }
        } else {
          isDeleted = false;
          Alertify.error(result.Error);
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
  /*
   * Retrieves information about the specified file as a JSON
   * object and uses that data to populate a template for
   * list views. Binds the toolbar for that file/folder to
   * enable specific actions. Called whenever an item is
   * clicked in list views.
   */
  var getFileInfo = function(file) {
    // Update location for status, upload, & new folder functions.
    pgAdmin.FileUtils.setUploader(file);
    var capabilities = pgAdmin.FileUtils.data.capabilities,
      is_file_valid = false,
      post_data = {
        'path': file,
        'mode': 'getinfo',
      };

    // Retrieve the data & populate the template.
    $.ajax({
      type: 'POST',
      data: JSON.stringify(post_data),
      url: pgAdmin.FileUtils.fileConnector,
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      async: false,
    })
    .done(function(resp) {
      var data = resp.data.result;
      if (data.Code === 1) {
        $('.file_manager_ok').removeClass('disabled');
        $('.file_manager_ok').attr('disabled', false);
        data.Capabilities = capabilities;
        bindToolbar(data);
        if (data.FileType == 'Directory') {
          // Enable/Disable level up button
          enab_dis_level_up();
          $('.file_manager_ok').addClass('disabled');
          $('.file_manager_ok').attr('disabled', true);
          $('.file_manager button.delete, .file_manager button.rename').attr('disabled', 'disabled');
          $('.file_manager button.download').attr('disabled', 'disabled');

          if (file.charAt(file.length - 1) != '/' && file.charAt(file.length - 1) != '\\') {
            file += '/';
          }
          getFolderInfo(file);
        } else {
          is_file_valid = true;
        }
      } else {
        $('.file_manager_ok').addClass('disabled');
        $('.file_manager_ok').attr('disabled', true);
        Alertify.error(data.Error);
      }
    });
    return is_file_valid;
  };

  var checkPermission = function(path) {
    var permission = false,
      post_data = {
        'path': path,
        'mode': 'permission',
      };

    $.ajax({
      type: 'POST',
      data: JSON.stringify(post_data),
      url: pgAdmin.FileUtils.fileConnector,
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      async: false,
    })
    .done(function(resp) {
      var data = resp.data.result;
      if (data.Code === 1) {
        permission = true;
      } else {
        $('.file_manager_ok').addClass('disabled');
        $('.file_manager_ok').attr('disabled', true);
        Alertify.error(data.Error);
      }
    })
    .fail(function() {
      $('.file_manager_ok').addClass('disabled');
      $('.file_manager_ok').attr('disabled', true);
      Alertify.error(
        gettext('Error occurred while checking access permission.')
      );
    });
    return permission;
  };



  /*
   * Retrieves data for all items within the given folder and
   * creates a list view.
   */
  var getFolderInfo = function(path, file_type) {
    $('.storage_dialog #uploader .input-path').prop('disabled', true);
    if (!file_type) {
      file_type = '';
    }
    var capabilities = pgAdmin.FileUtils.data.Capabilities;
    // Update location for status, upload, & new folder functions.
    pgAdmin.FileUtils.setUploader(path);

    // set default selected file type
    if (file_type === '') {
      file_type = $('.change_file_types select').val();
    }

    // navigate to directory or path when clicked on breadcrumbs
    $('.file_manager a.breadcrumbs').off().on('click', function() {
      var curr_path = $(this).attr('data-path'),
        current_dir = $(this).html(),
        move_to = curr_path.substring(
          0, curr_path.lastIndexOf(current_dir)
        ) + current_dir;

      getFolderInfo(move_to);
      enab_dis_level_up();
    });

    // hide select file if we are listing drives in windows.
    if (pgAdmin.FileUtils.hideButtons()) {
      $('.allowed_file_types .change_file_types').hide();
    } else {
      $('.allowed_file_types .change_file_types').show();
    }

    var loading_icon_url = url_for(
      'static', {
        'filename': 'js/generated/' + loading_icon,
      }
    );

    // Display an activity indicator.
    $('.fileinfo').find('span.activity').html(
      '<img src="' + loading_icon_url + '" alt="' + gettext('Loading...') + '/>'
    );

    var post_data = {
      'path': path,
      'mode': 'getfolder',
      'file_type': file_type || '*',
      'show_hidden': $('#show_hidden').prop('checked'),
    };

    var lg = pgAdmin.FileUtils.lg;
    $.ajax({
      type: 'POST',
      data: JSON.stringify(post_data),
      url: pgAdmin.FileUtils.fileConnector,
      dataType: 'json',
      contentType: 'application/json; charset=utf-8',
      async: false,
    })
    .done(function(resp) {
      $('.storage_dialog #uploader .input-path').prop('disabled', false);
      var result = '',
        data = resp.data.result;

      // hide activity indicator
      $('.fileinfo').find('span.activity').hide();
      if (data.Code === 0) {
        Alertify.error(data.Error);
        return;
      }

      var $this, orig_value, newvalue;

      // generate HTML for files/folder and render into container
      if (!_.isEmpty(data)) {
        if ($('.fileinfo').data('view') == 'grid') {
          result += '<ul id="contents" class="grid">';
          Object.keys(data).sort(function keyOrder(x, y) {
            return pgAdmin.natural_sort(x.toLowerCase(), y.toLowerCase());
          }).forEach(function(key) {
            var props = (data[key]).Properties,
              cap_classes = '';

            Object.keys(capabilities).forEach(function(cap) {
              if (has_capability(data[key], capabilities[cap])) {
                cap_classes += 'cap_' + capabilities[cap];
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
            if (fm_filename.length > 15) {
              fm_filename = (data[key]).Filename.substr(0, 10) + '...';
            }
            fm_filename = _.escape(fm_filename);

            var file_path_orig = _.escape((data[key]).Path);

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
                '<span class="less_text" title="' + fm_filename + '">' + fm_filename +
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
          result += '<table id="contents" class="list tablesorter">';
          result += '<thead><tr><th>';
          result += '<span>' + lg.name + '</span></th>';
          result += '<th><span>' + lg.size + '</span></th><th>';
          result += '<span>' + lg.modified + '</span></th></tr></thead>';
          result += '<tbody>';

          Object.keys(data).sort(function keyOrder(x, y) {
            return pgAdmin.natural_sort(x.toLowerCase(), y.toLowerCase());
          }).forEach(function(key) {
            var path = _.escape((data[key]).Path),
              props = (data[key]).Properties,
              cap_classes = '',
              cap, class_type;

            for (cap in capabilities) {
              if (has_capability(data[key], capabilities[cap])) {
                cap_classes += ' cap_' + capabilities[cap];
              }
            }

            (data[key]).Capabilities = capabilities;
            bindToolbar(data[key]);

            if ((data[key]).file_type == 'dir') {
              class_type = 'fa fa-folder-open tbl_folder';
            } else if ((data[key]).file_type == 'drive') {
              class_type = 'fa fa-hdd-o tbl_drive';
            } else {
              class_type = 'fa fa-file-text tbl_file';
            }

            result += '<tr class="' + cap_classes + '">';

            var fm_filename = (data[key]).Filename;
            if (fm_filename.length > 48) {
              fm_filename = (data[key]).Filename.substr(0, 48) + '...';
            }
            fm_filename = _.escape(fm_filename);

            result += '<td title="' + path + '" class="' + class_type + '">';
            if ((data[key]).Protected == 1) {
              result +=
                '<i class="fa fa-lock tbl_lock_icon" data-protected="protected"></i>';
            }
            if (!has_capability(data[key], 'rename')) {
              result += '<span title="' + (data[key]).Filename + '">' +
                fm_filename + '</span></td>';
            } else {
              result += '<p><input type="text" class="fm_file_rename"/><span class="less_text" title="' +
                fm_filename + '">' + fm_filename + '</span></p></td>';
            }
            if (props.Size && props.Size != '') {
              result += '<td><span title="' + props.Size + '">' +
                props.Size + '</span></td>';
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
          result += '<table id="contents" class="list tablesorter">';
          result += '<thead><tr><th><span>' +
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
      $('.fileinfo .file_listing #contents').tablesorter({
        headers: {
          2: {
            sorter: 'shortDate',
          },
        },
      });

      // rename file/folder
      $('.file_manager button.rename').off().on('click', function(e) {

        if ($('.fileinfo').data('view') == 'grid') {
          e.stopPropagation();
          $this = $('.file_manager').find('#contents li.selected p');
          orig_value = decodeURI($this.find('span').attr('title'));
          newvalue = orig_value.substring(0, orig_value.indexOf('.'));

          if (newvalue === '') {
            newvalue = decodeURI(orig_value);
          }

          $this.find('input').toggle().val(newvalue).trigger('focus');
          $this.find('span').toggle();

          // Rename folder/file on pressing enter key
          $('.file_manager').off().on('keyup', function(e) {
            if (e.keyCode == 13) {
              e.stopPropagation();
              $('.fileinfo #contents li.selected p').find(
                'input'
              ).trigger('blur');
            }
          });
        } else if ($('.fileinfo').data('view') == 'list') {
          e.stopPropagation();
          $this = $('.fileinfo').find(
            'table#contents tbody tr.selected td:first-child p'
          );
          orig_value = decodeURI($this.find('span').html()),
            newvalue = orig_value.substring(0, orig_value.lastIndexOf('.'));

          if (orig_value.lastIndexOf('/') == orig_value.length - 1 || newvalue === '') {
            newvalue = decodeURI(orig_value);
          }

          $this.find('input').toggle().val(newvalue).trigger('focus');
          $this.find('span').toggle();

          // Rename folder/file on pressing enter key
          $('.file_manager').off().on('keyup', function(e) {
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
      $('.fileinfo #contents li p').on('blur dblclick', 'input', function(e) {
        e.stopPropagation();

        var old_name = decodeURI($(this).siblings('span').attr('title'));
        newvalue = old_name.substring(0, old_name.indexOf('.'));
        var last = getFileExtension(old_name),
          data, new_name, path, full_name;

        if (old_name.indexOf('.') == 0) {
          last = '';
        }

        if (newvalue == '') {
          newvalue = decodeURI(old_name);
        }

        if (e.type == 'keydown') {
          if (e.which == 13) {
            full_name = decodeURI($(this).val()) + (
              last !== '' ? '.' + last : ''
            );

            $(this).toggle();
            $(this).siblings('span').toggle().html(full_name);

            new_name = decodeURI($(this).val());
            path = decodeURI($(this).parent().parent().find(
              'span'
            ).attr('data-alt'));
            data = {
              'Filename': old_name,
              'Path': path,
              'NewFilename': new_name,
            };

            if (newvalue !== new_name) {
              renameItem(data);
              var parent = $('.currentpath').val();
              getFolderInfo(parent);
            }
            e.stopPropagation();
          }

          if (
            e.which == 38 || e.which == 40 || e.which == 37 ||
            e.which == 39 || e.keyCode == 32
          ) {
            e.stopPropagation();
          }
        } else if (e.type == 'focusout') {
          if ($(this).css('display') == 'inline-block' || $(this).css('display') == 'inline') {
            full_name = decodeURI(
              $(this).val()
            ) + (last !== '' ? '.' + last : '');

            $(this).toggle();
            $(this).siblings('span').toggle().html(full_name);

            new_name = decodeURI($(this).val());
            path = decodeURI($(this).parent().parent().find(
              'span'
            ).attr('data-alt'));
            data = {
              'Filename': old_name,
              'Path': path,
              'NewFilename': new_name,
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
        'blur dblclick', 'input',
        function(e) {
          var old_name = decodeURI($(this).siblings('span').attr('title')),
            newvalue = old_name.substring(0, old_name.indexOf('.')),
            last = getFileExtension(old_name);
          if (old_name.indexOf('.') == 0) {
            last = '';
          }

          if (newvalue == '') {
            newvalue = old_name;
          }

          if (e.type == 'focusout') {
            if ($(this).css('display') == 'inline-block' || $(this).css('display') == 'inline') {
              var full_name = decodeURI($(this).val()) + (
                last !== '' ? '.' + last : ''
              );
              $(this).toggle();
              $(this).siblings('span').toggle().html(full_name);

              var new_name = decodeURI($(this).val()),
                path = decodeURI($(this).parent().parent().attr('title')),
                data = {
                  'Filename': old_name,
                  'Path': path,
                  'NewFilename': new_name,
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

          if (path.lastIndexOf('/') == path.length - 1 || path.lastIndexOf('\\') == path.length - 1) {
            $('.file_manager_ok').addClass('disabled');
            $('.file_manager_ok').attr('disabled', true);
            $('.file_manager button.delete, .file_manager button.rename').attr('disabled', 'disabled');
            $('.file_manager button.download').attr('disabled', 'disabled');

            getFolderInfo(path);

          } else {
            var is_valid_file = getFileInfo(path);
            if (is_valid_file && check_file_capability(e, data_cap, 'grid')) {
              $('.file_manager_ok').trigger('click');
            }
          }
        });

        $('.fileinfo').find('#contents li').on('click', function(e) {
          e.stopPropagation();
          var path = decodeURI($(this).find('.clip span').attr('data-alt')),
            is_protected = $(this).find(
              '.clip span.fm_lock_icon'
            ).attr('data-protected');

          if (path.lastIndexOf('/') == path.length - 1 || path.lastIndexOf('\\') == path.length - 1) {
            if (
              has_capability(data_cap, 'select_folder') &&
              is_protected == undefined
            ) {
              $(this).parent().find('li.selected').removeClass('selected');
              $(this).addClass('selected');

              $('.file_manager_ok').removeClass('disabled');
              $('.file_manager_ok').attr('disabled', false);
              $('.file_manager button.delete, .file_manager button.rename').removeAttr(
                'disabled', 'disabled'
              );
              $('.file_manager button.download').attr(
                'disabled', 'disabled'
              );
              // set selected folder name in breadcrums
              $('.file_manager #uploader .input-path').hide();
              $('.file_manager #uploader .show_selected_file').remove();
              $('<span class="show_selected_file">' + path + '</span>').appendTo(
                '.file_manager #uploader .filemanager-path-group'
              );
            }
            pgAdmin.FileUtils.setUploader(path);
          } else {
            if (
              has_capability(data_cap, 'select_file') &&
              is_protected == undefined
            ) {
              $(this).parent().find('li.selected').removeClass('selected');
              $(this).addClass('selected');
              $('.file_manager_ok').removeClass('disabled');
              $('.file_manager_ok').attr('disabled', false);
              $('.file_manager button.delete, .file_manager button.download, .file_manager button.rename').removeAttr(
                'disabled'
              );
              // set selected folder name in breadcrums
              $('.file_manager #uploader .show_selected_file').remove();
            }

            getFileInfo(path);
          }
        });
      } else {
        $('.fileinfo table#contents tbody tr').on('click', function(e) {
          e.stopPropagation();
          var path = decodeURI($('td:first-child', this).attr('title')),
            is_protected = $('td:first-child', this).find(
              'i.tbl_lock_icon'
            ).attr('data-protected');

          if (path.lastIndexOf('/') == path.length - 1 || path.lastIndexOf('\\') == path.length - 1) {
            if (has_capability(data_cap, 'select_folder') && is_protected == undefined) {
              $(this).parent().find('tr.selected').removeClass('selected');
              $('td:first-child', this).parent().addClass('selected');
              $('.file_manager_ok').removeClass('disabled');
              $('.file_manager_ok').attr('disabled', false);
              $('.file_manager button.download').attr('disabled', 'disabled');
              $('.file_manager button.delete, .file_manager button.rename').removeAttr('disabled');

              // set selected folder name in breadcrums
              $('.file_manager #uploader .input-path').hide();
              $('.file_manager #uploader .show_selected_file').remove();
              $('<span class="show_selected_file">' + path + '</span>').appendTo(
                '.file_manager #uploader .filemanager-path-group'
              );
            }
            pgAdmin.FileUtils.setUploader(path);
          } else {
            if (has_capability(data_cap, 'select_file') && is_protected == undefined) {
              $(this).parent().find('tr.selected').removeClass('selected');
              $('td:first-child', this).parent().addClass('selected');
              $('.file_manager button.delete, .file_manager button.download, .file_manager button.rename').removeAttr(
                'disabled'
              );
              // set selected folder name in breadcrums
              $('.file_manager #uploader .show_selected_file').remove();
            }

            getFileInfo(path);
          }
        });

        $('.fileinfo table#contents tbody tr').on('dblclick', function(e) {
          e.stopPropagation();
          // Enable/Disable level up button
          enab_dis_level_up();
          var path = $('td:first-child', this).attr('title');

          if (path.lastIndexOf('/') == path.length - 1 || path.lastIndexOf('\\') == path.length - 1) {
            $('.file_manager_ok').addClass('disabled');
            $('.file_manager_ok').attr('disabled', true);
            $('.file_manager button.download').attr('disabled', 'disabled');
            $('.file_manager button.delete, .file_manager button.rename').attr('disabled', 'disabled');
            getFolderInfo(path);
          } else {
            var is_valid_file = getFileInfo(path);
            if (
              is_valid_file && check_file_capability(e, data_cap, 'table')
            ) {
              $('.file_manager_ok').trigger('click');
            }
          }
        });

      }
      //input_object.set_cap(data_cap);
    })
    .fail(function() {
      $('.storage_dialog #uploader .input-path').prop('disabled', false);
    });
  };

  // Enable/Disable level up button
  var enab_dis_level_up = function() {
    $('.file_manager #uploader .input-path').show();
    $('.show_selected_file').remove();

    setTimeout(function() {
      var b = $('.currentpath').val(),
        $level_up = $('.file_manager').find('button.level-up'),
        $home_btn = $('.file_manager').find('button.home');

      if (b === '/') {
        $level_up.attr('disabled', 'disabled');
        $home_btn.attr('disabled', 'disabled');
      } else {
        $home_btn.removeAttr('disabled');
        $level_up.removeAttr('disabled');
      }
    }, 100);
  };

  // Check if user can Select file
  var check_file_capability = function(event, data_cap, view_type) {
    var current_element = event.currentTarget,
      is_protected;

    if (view_type == 'grid') {
      is_protected = $(current_element).find(
        '.clip span.fm_lock_icon'
      ).attr('data-protected');
    } else {
      is_protected = $(current_element).find('td:first-child').find(
        'i.tbl_lock_icon'
      ).attr('data-protected');
    }

    return has_capability(data_cap, 'select_file') &&
      is_protected == undefined;
  };

  /*---------------------------------------------------------
    Initialization - Entry point
  ---------------------------------------------------------*/
  /*
   * get transaction id to generate request url and
   * to generate config files on runtime
   */
  pgAdmin.FileUtils = {
    init: function() {
      var fm_url = url_for('file_manager.get_trans_id'),
        transId = loadData(fm_url),
        t_res,
        t_id;

      if (transId.readyState == 4) {
        t_res = JSON.parse(transId.responseText);
      }
      t_id = t_res.data.fileTransId;
      var root_url = url_for('file_manager.index'),
        file_manager_config_json = root_url + t_id + '/file_manager_config.json',
        fileConnector = root_url + 'filemanager/' + t_id + '/',
        cfg = loadData(file_manager_config_json),
        config;

      this.fileConnector = fileConnector;
      this.transId = t_id;
      // load user configuration file
      if (cfg.readyState == 4) {
        this.config = config = JSON.parse(cfg.responseText);
      }

      // set main url to filemanager and its capabilites
      var fileRoot = config.options.fileRoot,
        capabilities = config.options.capabilities;

      /*
       * Get localized messages from file
       * through culture var or from URL
       */

      var lg = [],
        enjs = url_for('file_manager.index') + 'en.js',
        lgf = loadData(enjs);

      if (lgf.readyState == 4) {
        this.lg = lg = JSON.parse(lgf.responseText);
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
          select_box = '';

        if (types_len > 0) {
          var i = 0,
            t,
            selected = false,
            have_all_types = false;

          select_box = '<div class=\'change_file_types\'>' +
            gettext('Show hidden files and folders') +
            '? <input type=\'checkbox\' id=\'show_hidden\' onclick=\'pgAdmin.FileUtils.handleClick(this)\' tabindex=\'11\'>' +
            '<span></span>' +
            '<select name=\'type\' tabindex=\'12\'>';

          while (i < types_len) {
            t = allowed_types[i];
            if (!selected && (types_len == 1 || t != '*')) {
              select_box += '<option value=' + t + ' selected>' + t + '</option>';
              selected = true;
              have_all_types = (have_all_types || (t == '*'));
            } else {
              select_box += '<option value="' + t + '">' +
                (t == '*' ? gettext('All Files') : t) + '</option>';
              have_all_types = (have_all_types || (t == '*'));
            }
            i++;
          }

          if (!have_all_types) {
            select_box += '<option value="*">' + gettext('All Files') + '</option>';
          }
          select_box += '</select><label>' + gettext('Format') + ': </label></div>';
        }

        $('.allowed_file_types').html(select_box);

        $('.allowed_file_types select').on('change', function() {
          var selected_val = $(this).val(),
            curr_path = $('.currentpath').val();
          getFolderInfo(curr_path, selected_val);
        });

        // If user have preference to show hidden files
        if (config.options.show_hidden_files) {
          setTimeout(function() {
            $('#show_hidden').trigger('click');
          }, 10);
        }
        // handle show hidden files functionality
        this.handleClick = function(cb) {
          var data = {
            'is_checked': false,
          };

          if (cb.checked) {
            $('div.allowed_file_types select').val('*').trigger('change');
            data['is_checked'] = true;
          } else {
            // User wants to hide it again
            $('div.allowed_file_types select').prop('selectedIndex', 0).trigger('change');
            data['is_checked'] = false;
          }
          // Save it in preference
          save_show_hidden_file_option(data['is_checked'], pgAdmin.FileUtils.transId);
          return;
        };
      }

      /*---------------------------------------------------------
        Item Actions - Object events
      ---------------------------------------------------------*/

      // Switch to folder view
      $('.file_manager .fileinfo').on('click', function() {
        $('.file_manager #uploader .input-path').val($('.currentpath').val());
        enable_disable_btn();
      });

      // Refresh current directory
      $('.file_manager .refresh').on('click', function() {
        enable_disable_btn();

        var curr_path = $('.currentpath').val(),
          path;

        $('.file_manager #uploader .input-path').val(curr_path);
        if (curr_path.endsWith('/')) {
          path = curr_path.substring(0, curr_path.lastIndexOf('/')) + '/';
        } else {
          path = curr_path.substring(0, curr_path.lastIndexOf('\\')) + '\\';
        }
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
        'click',
        function(e) {
          $('#uploader .filemanager-btn-group').off().on(
            'click',
            function() {
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
        var b = $('.currentpath').val(),
          node_val = $(this).next().text(),
          parent = b.substring(0, b.slice(0, -1).lastIndexOf(node_val));
        getFolderInfo(parent);
      });

      // re-render the home view
      $('.file_manager .home').on('click', function() {
        var currentViewMode = $('.fileinfo').data('view');
        $('.fileinfo').data('view', currentViewMode);
        getFolderInfo('/');
        enab_dis_level_up();
      });

      // Go one directory back
      $('.file_manager .level-up').on('click', function() {
        var b = $('.currentpath').val();
        // Enable/Disable level up button
        enab_dis_level_up();

        if (b.endsWith('\\') || b.endsWith('/')) {
          b = b.substring(0, b.length - 1);
        }

        if (b != '/') {
          var parent;
          if (b.lastIndexOf('/') > b.lastIndexOf('\\')) {
            parent = b.substring(0, b.slice(0, -1).lastIndexOf('/')) + '/';
          } else {
            parent = b.substring(0, b.slice(0, -1).lastIndexOf('\\')) + '\\';
          }

          var d = $('.fileinfo').data('view');
          $('.fileinfo').data('view', d);
          getFolderInfo(parent);
        }
      });

      // set buttons to switch between grid and list views.
      $('.file_manager .grid').on('click',() => {
        setViewButtonsFor('grid');
        $('.fileinfo').data('view', 'grid');
        enable_disable_btn();
        getFolderInfo($('.currentpath').val());
        save_file_dialog_view('grid', pgAdmin.FileUtils.transId);
      });

      // Show list mode
      $('.file_manager .list').on('click',() => {
        setViewButtonsFor('list');
        $('.fileinfo').data('view', 'list');
        enable_disable_btn();
        getFolderInfo($('.currentpath').val());
        save_file_dialog_view('list', pgAdmin.FileUtils.transId);
      });

      // Provide initial values for upload form, status, etc.
      pgAdmin.FileUtils.setUploader(fileRoot);

      var data;
      this.data = data = {
        'Capabilities': capabilities,
      };

      function InputObject() {
        this.init = function(cap) {
          var self = this,
            check_obj = function(path, check) {

              path = decodeURI(path);
              if (path.lastIndexOf('/') == path.length - 1 || path.lastIndexOf('\\') == path.length - 1) {
                if (
                  has_capability(self.data_cap, 'select_folder')
                ) {
                  $('.file_manager_ok').removeClass('disabled');
                  $('.file_manager_ok').attr('disabled', false);
                  $('.file_manager button.delete, .file_manager button.rename').removeAttr(
                    'disabled', 'disabled'
                  );
                  $('.file_manager button.download').attr(
                    'disabled', 'disabled'
                  );
                  // set selected folder name in breadcrums
                  $('.file_manager #uploader .input-path').hide();
                  $('.file_manager #uploader .show_selected_file').remove();
                  $('<span class="show_selected_file">' + path + '</span>').appendTo(
                    '.file_manager #uploader .filemanager-path-group'
                  );
                } else {
                  $('.file_manager_ok').addClass('disabled');
                  $('.file_manager_ok').attr('disabled', true);
                  if (check) {
                    // Enable/Disable level up button
                    enab_dis_level_up();

                    $('.file_manager button.delete, .file_manager button.rename').attr('disabled', 'disabled');
                    $('.file_manager button.download').attr('disabled', 'disabled');
                    getFolderInfo(path);
                  }
                }
              } else {
                if (
                  has_capability(self.data_cap, 'select_file')
                ) {
                  $('.file_manager_ok').removeClass('disabled');
                  $('.file_manager_ok').attr('disabled', false);
                  $('.file_manager button.delete, .file_manager button.download, .file_manager button.rename').removeAttr(
                    'disabled'
                  );
                  // set selected folder name in breadcrums
                  $('.file_manager #uploader .show_selected_file').remove();
                }

                if (check) {
                  if (config.options.dialog_type == 'create_file') {
                    var status = checkPermission(path);
                    if (status) {
                      $('.file_manager').trigger('enter-key');
                    }
                  } else if (config.options.dialog_type == 'select_file') {
                    var file_status = getFileInfo(path);
                    if (file_status) {
                      $('.file_manager').trigger('enter-key');
                    }
                  }
                }
              }
            };

          self.data_cap = cap;

          $('.storage_dialog #uploader .input-path').on('keyup',function(e) {
            if (e.keyCode == 13) {
              e.stopPropagation();
              var path = $(this).val();
              if (path == '') {
                path = '/';
              }

              if (config.options.platform_type === 'win32') {
                path = path.replace(/\//g, '\\');
              } else {
                path = path.replace(/\\/g, '/');
                if (!S.startsWith(path, '/')) {
                  path = '/' + path;
                }
              }

              $(this).val(path);
              setTimeout(function() {
                check_obj(path, true);
              });

              return;
            }
            check_obj($(this).val(), false);
          });
        };
        this.set_cap = function(cap) {
          this.data_cap = cap;
        };
      }
      var input_object = new InputObject();
      input_object.init(data);

      // Upload file
      if (has_capability(data, 'upload')) {
        Dropzone.autoDiscover = false;
        // we remove simple file upload element
        $('.file-input-container').remove();
        $('.upload').remove();
        $('.create').before('<button value="Upload" type="button" title="Upload File" name="upload" id="upload" class="btn fa fa-upload upload" tabindex="6"><span></span></button> ');

        $('#uploader .upload').off().on('click', function() {
          // we create prompt
          var msg = '<div id="dropzone-container">' +
            '<button class="fa fa-times dz_cross_btn" tabindex="7"></button>' +
            '<div id="multiple-uploads" class="dropzone"></div>' +
            '<div class="prompt-info">' + lg.file_size_limit +
            config.upload.fileSizeLimit + ' ' + lg.mb + '.</div>',
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
          var previewTemplate = '<div class="file_upload_main dz-preview dz-file-preview">' +
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

          $('div#multiple-uploads').dropzone({
            paramName: 'newfile',
            url: pgAdmin.FileUtils.fileConnector,
            maxFilesize: fileSize,
            maxFiles: config.upload.number,
            addRemoveLinks: true,
            previewTemplate: previewTemplate,
            parallelUploads: config.upload.number,
            dictMaxFilesExceeded: lg.dz_dictMaxFilesExceeded.replace(
              '%s', config.upload.number
            ),
            dictDefaultMessage: lg.dz_dictDefaultMessage,
            dictInvalidFileType: lg.dz_dictInvalidFileType,
            dictFileTooBig: lg.file_too_big + ' ' + lg.file_size_limit +
              config.upload.fileSizeLimit + ' ' + lg.mb,
            acceptedFiles: acceptFiles,
            autoProcessQueue: true,
            init: function() {
              $('.dz_cross_btn').off().on('click', function() {
                $('.file_manager .upload_file').toggle();
              });
            },
            sending: function(file, xhr, formData) {
              formData.append('mode', 'add');
              formData.append('currentpath', path);
              $('.upload_file .dz_cross_btn').attr('disabled', 'disabled');
              setTimeout(function() {}, 10000);
            },
            success: function(file, response) {
              var data = response.data.result,
                $this = $(file.previewTemplate);

              if (data.Code == 1) {
                setTimeout(function() {
                  $this.find('.dz-upload').addClass('success');
                }, 1000);
                $this.find('.dz-upload').css('width', '100%').html('100%');
                Alertify.success(lg.upload_success);
              } else {
                $this.find('.dz-upload').addClass('error');
                $this.find('.dz-upload').css('width', '0%').html('0%');
                Alertify.error(data.Error);
              }
              getFolderInfo(path);
            },
            totaluploadprogress: function() {},
            complete: function(file) {
              if (file.status == 'error') {
                Alertify.error(lg.upload_error);
              }
              $('.upload_file .dz_cross_btn').removeAttr('disabled');
              getFolderInfo(path);
            },
          });
        });
      }

      this.getDetailView(fileRoot);
    },
    /*
     * Sets the folder status, upload, and new folder functions
     * to the path specified. Called on initial page load and
     * whenever a new directory is selected.
     */
    setUploader: function(path) {
      var config = this.config;
      var lg = this.lg;
      $('.storage_dialog #uploader').find('a').remove();
      $('.storage_dialog #uploader').find('b').remove();

      if (config.options.platform_type === 'win32') {
        path = path.replace(/\//g, '\\');
      } else {
        path = path.replace(/\\/g, '/');
      }

      path = decodeURI(path);
      if (config.options.platform_type === 'win32') {
        if (config.options.show_volumes && path == '\\') {
          $('.storage_dialog #uploader .input-path').val('');
        } else {
          $('.storage_dialog #uploader .input-path').val(path);
        }
      } else if (!config.options.platform_type === 'win32' &&
        (path == '' || !S.startsWith(path, '/'))) {
        path = '/' + path;
        $('.storage_dialog #uploader .input-path').val(path);
      } else {
        $('.storage_dialog #uploader .input-path').val(path);
      }

      if (path.lastIndexOf('\\') == -1 && path.lastIndexOf('/') == -1) {
        $('.currentpath').val(path);
      } else if (path.lastIndexOf('/') > path.lastIndexOf('\\')) {
        $('.currentpath').val(path.substr(0, path.lastIndexOf('/') + 1));
      } else {
        $('.currentpath').val(path.substr(0, path.lastIndexOf('\\') + 1));
      }

      enab_dis_level_up();
      if ($('.storage_dialog #uploader h1 span').length === 0) {
        $('<span>' + lg.current_folder + '</span>').appendTo($('.storage_dialog #uploader h1'));
      }

      $('.storage_dialog #uploader .input-path').attr('title', path);
      $('.storage_dialog #uploader .input-path').attr('data-path', path);

      // create new folder
      $('.create').off().on('click', function() {
        var foldername = lg.new_folder;
        var $file_element,
          $file_element_list,
          folder_div;


        $('.file_manager button.create').attr('disabled', 'disabled');
        if ($('.fileinfo').data('view') == 'grid') {

          // template for creating new folder
          folder_div =
            '<li class=\'cap_download cap_delete cap_select_file cap_select_folder cap_rename cap_create cap_upload\'>' +
            '<div class=\'clip\'><span data-alt=\'\' class=\'fa fa-folder-open fm_folder\'></span></div>' +
            '<p><input type=\'text\' class=\'fm_file_rename\'><span title=\'\'>New_Folder</span></p>' +
            '<span class=\'meta size\'></span><span class=\'meta created\'></span><span class=\'meta modified\'></span></li>';

          path = $('.currentpath').val();
          $file_element = $(folder_div);
          $('.fileinfo #contents.grid').append($file_element);
          $file_element.find('p span').toggle();
          $file_element.find('p input').toggle().val(lg.new_folder).select();

          // rename folder/file on pressing enter key
          $('.file_manager').on('keyup', function(e) {
            if (e.keyCode == 13) {
              e.stopPropagation();
              $file_element.find('p input').trigger('blur');
            }
          });

          // rename folder/file on blur
          $file_element.find('p input').on('blur', function() {
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
            '<tr class=\'cap_download cap_delete cap_select_file cap_select_folder cap_rename cap_create cap_upload\'>' +
            '<td title=\'\' class=\'fa fa-folder-open tbl_folder\'>' +
            '<p><input type=\'text\' class=\'fm_file_rename\'><span>' +
            lg.new_folder + '</span></p>' +
            '</td><td><span title=\'\'></span></td>' +
            '<td></td>' +
            '</tr>'
          );

          $file_element_list = $(folder_div);
          $('.fileinfo #contents.list').prepend($file_element_list);
          $file_element_list.find('p span').toggle();
          $file_element_list.find('p input').toggle().val(lg.new_folder).select();

          // rename folder/file on pressing enter key
          $('.file_manager').on('keyup', function(e) {
            if (e.keyCode == 13) {
              e.stopPropagation();
              $file_element_list.find('p input').trigger('blur');
            }
          });

          // rename folder/file on blur
          $file_element_list.find('p input').on('blur', function() {
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
            foldername = fname;
            // Add _ variable in URL for avoiding the caching
            $.getJSON(
              pgAdmin.FileUtils.fileConnector + '?_=' + Date.now() + '&mode=addfolder&path=' + $('.currentpath').val() + '&name=' + foldername,
              function(resp) {
                var result = resp.data.result;
                if (result.Code === 1) {
                  Alertify.success(lg.successful_added_folder);
                  getFolderInfo(result.Parent);
                } else {
                  Alertify.error(result.Error);
                }
              }
            );
          } else {
            Alertify.error(lg.no_foldername);
          }
        };

      });
    },
    /* Decides whether to retrieve file or folder info based on
     * the path provided.
     */
    getDetailView: function(path) {
      if (path.lastIndexOf('/') == path.length - 1 || path.lastIndexOf('\\') == path.length - 1) {
        var allowed_types = this.config.options.allowed_file_types;
        var set_type = allowed_types[0];
        if (allowed_types[0] == '*') {
          set_type = allowed_types[1];
        }
        getFolderInfo(path, set_type);
      }
    },
    // helpful in show/hide toolbar button for Windows
    hideButtons: function() {
      return (
        this.config.options.platform_type == 'win32' &&
        $('.currentpath').val() === ''
      );
    },

  };
  return pgAdmin.FileUtils;
});
//@ sourceURL=utility.js
