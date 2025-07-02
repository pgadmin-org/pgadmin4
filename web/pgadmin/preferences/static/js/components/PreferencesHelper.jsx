/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import { styled } from '@mui/material/styles';
import _ from 'lodash';
import url_for from 'sources/url_for';
import React from 'react';
import { Box } from '@mui/material';
import { DefaultButton, PrimaryButton } from '../../../../static/js/components/Buttons';
import { getBinaryPathSchema } from './binary_path.ui';
import { getBrowser } from '../../../../static/js/utils';
import SaveSharpIcon from '@mui/icons-material/SaveSharp';
import CloseIcon from '@mui/icons-material/CloseRounded';
import HTMLReactParser from 'html-react-parser/lib/index';


export async function reloadPgAdmin() {
  const { name: browser } = getBrowser();
  if (browser === 'Electron') {
    await window.electronUI.reloadApp();
  } else {
    location.reload();
  }
}

export function getNoteField(node, subNode, nodeData, note = '') {
  // Check and add the note for the element.
  if (subNode.label === gettext('Nodes') && node.label === gettext('Browser')) {
    note = gettext('This settings is to Show/Hide nodes in the object explorer.');
  }

  if (note.length > 0) {
    return [{
      id: _.uniqueId('note_') + subNode.id, // Better unique ID prefix
      type: 'note',
      text: note,
      parentId: nodeData.id,
      visible: false,
    }];
  }
  return [];
}

export function prepareSubnodeData(node, subNode, nodeData, preferencesStore) {
  let addBinaryPathNote = false;
  let fieldItems = [];
  let fieldValues = {};
  const typeMap = {
    text: 'text',
    input: 'text',
    boolean: 'switch',
    node: 'switch',
    integer: 'numeric',
    numeric: 'numeric',
    date: 'datetimepicker',
    datetime: 'datetimepicker',
    options: 'select',
    select: 'select',
    multiline: 'multiline',
    switch: 'switch',
    keyboardshortcut: 'keyboardShortcut',
    radioModern: 'toggle',
    threshold: 'threshold',
  };

  subNode.preferences.forEach((element) => {
    let type = typeMap[element.type] || element.type;
    let note = ''; // Initialize note for each element

    // Ensure type is set after specific handling
    element.type = type;
    if (type === 'selectFile') {
      // Binary Path specific handling
      note = gettext('Enter the directory in which the psql, pg_dump, pg_dumpall, and pg_restore utilities can be found for the corresponding database server version. The default path will be used for server versions that do not have a path specified.');
      element.type = 'collection';
      element.schema = getBinaryPathSchema();
      element.canAdd = false;
      element.canDelete = false;
      element.canEdit = false;
      element.editable = false;
      element.disabled = true; // Binary paths are managed in a collection, not directly editable here
      fieldValues[element.id] = JSON.parse(element.value);
      if (!addBinaryPathNote) { // Add note only once for binary path section
        fieldItems.push(...getNoteField(node, subNode, nodeData, note));
        addBinaryPathNote = true;
      }
    } else if (type === 'select') {
      element.controlProps = element.control_props ?? {};
      fieldValues[element.id] = element.value;

      if (element.name === 'theme') {
        element.type = 'theme';
        element.options.forEach((opt) => {
          opt.selected = opt.value === element.value;
          opt.preview_src = opt.preview_src && url_for('static', { filename: opt.preview_src });
        });
      }
    } else if (type === 'keyboardShortcut') {
      element.type = 'keyboardShortcut';
      element.canAdd = false;
      element.canDelete = false;
      element.canEdit = false;
      element.editable = false;

      const storedValue = preferencesStore.getPreferences(node.label.toLowerCase(), element.name)?.value;
      fieldValues[element.id] = storedValue || element.value;
    } else if (type === 'threshold') {
      element.type = 'threshold';
      const _val = element.value.split('|');
      fieldValues[element.id] = { warning: _val[0], alert: _val[1] };
    } else if (subNode.label === gettext('Results grid') && node.label === gettext('Query Tool')) {
      if (element.name === 'column_data_max_width') {
        const sizeControl = subNode.preferences.find((_el) => _el.name === 'column_data_auto_resize');
        if (sizeControl) {
          element.disabled = (state) => state[sizeControl.id] !== 'by_data';
        }
      }
      element.type = type;
      fieldValues[element.id] = element.value;
    } else if (subNode.label === gettext('User Interface') && node.label === gettext('Miscellaneous')) {
      if (element.name === 'open_in_res_workspace') {
        const layoutControl = subNode.preferences.find((_el) => _el.name === 'layout');
        if (layoutControl) {
          element.disabled = (state) => state[layoutControl.id] !== 'workspace';
        }
      }
      element.type = type;
      fieldValues[element.id] = element.value;
    } else {
      fieldValues[element.id] = element.value;
    }

    delete element.value; // Original value is moved to fieldValues
    element.visible = false;
    element.labelTooltip = `${node.name}:${subNode.name}:${element.name}`;
    element.helpMessage = element?.help_str || null;
    element.parentId = nodeData.id;
    fieldItems.push(element);
  });
  return { fieldItems, fieldValues };
}

export function getCollectionValue(_metadata, value, initVals) {
  let val = value;
  if (typeof value === 'object' && value !== null) { // Ensure value is an object and not null
    const meta = _metadata[0]; // Assuming _metadata will always have at least one element relevant to the current field

    if (meta.type === 'collection' && meta.schema) {
      if (value.changed?.[0] && 'binaryPath' in value.changed[0]) {
        const pathData = [];
        const pathVersions = value.changed.map(chValue => chValue.version);

        initVals[meta.id].forEach((initVal) => {
          const changedIndex = pathVersions.indexOf(initVal.version);
          if (changedIndex !== -1) {
            pathData.push(value.changed[changedIndex]);
          } else {
            pathData.push(initVal);
          }
        });
        val = JSON.stringify(pathData);
      } else if (value.changed?.[0]) { // Generic collection, likely keyboard shortcut
        const changedEntry = value.changed[0];
        if ('key' in changedEntry && 'code' in changedEntry) {
          changedEntry.key = {
            'char': changedEntry.key, // Original `key` is now `char`
            'key_code': changedEntry.code, // Original `code` is now `key_code`
          };
          delete changedEntry.code; // Remove old code
        }
        val = changedEntry; // Changed to object
      }
    } else if ('warning' in value && 'alert' in value) { // Threshold type
      val = `${value.warning}|${value.alert}`;
    } else if (value.changed && value.changed.length > 0) { // Catch-all for other collections/arrays
      val = JSON.stringify(value.changed);
    }
  }
  return val;
}

const StyledBox = styled(Box)(({ theme }) => ({
  '& .Alert-footer': {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '0.5rem',
    ...theme.mixins.panelBorder.top,
  },
  '& .Alert-margin': {
    marginLeft: '0.25rem',
  },
}));


export function showResetPrefModal(api, pgAdmin, preferencesStore, onReset) {
  pgAdmin.Browser.notifier.showModal(
    gettext('Reset all preferences'),
    (modalClose) => {
      const handleResetClick = async (reloadNow) => {
        try {
          await api({
            url: url_for('preferences.index'),
            method: 'DELETE',
          });
          preferencesStore.cache(); // Refresh preferences cache
          onReset();
          if (reloadNow) {
            reloadPgAdmin();
          } else {
            pgAdmin.Browser.tree.destroy().then(() => {
              pgAdmin.Browser.Events.trigger('pgadmin-browser:tree:destroyed', undefined, undefined);
              modalClose(); // Close modal after tree destruction if no full reload
            });
          }
        } catch (err) {
          pgAdmin.Browser.notifier.alert(err.response?.data || err.message || gettext('Failed to reset preferences.'));
          modalClose();
        }
      };

      const text = `${gettext('All preferences will be reset to their default values.')}<br><br>${gettext('Do you want to proceed?')}<br><br>
          ${gettext('Note:')}<br> <ul style="padding-left:20px"><li style="list-style-type:disc">${gettext('The object explorer tree will be refreshed automatically to reflect the changes.')}</li>
          <li style="list-style-type:disc">${gettext('If the application language changes, a reload of the application will be required. You can choose to reload later at your convenience.')}</li></ul>`;

      return (
        <StyledBox display="flex" flexDirection="column" height="100%">
          <Box flexGrow="1" p={2}>
            {HTMLReactParser(text)}
          </Box>
          <Box className='Alert-footer'>
            <DefaultButton className='Alert-margin' startIcon={<CloseIcon />} onClick={modalClose}>
              {gettext('Cancel')}
            </DefaultButton>
            <DefaultButton className='Alert-margin' startIcon={<SaveSharpIcon />} onClick={() => handleResetClick(true)}>
              {gettext('Save & Reload')}
            </DefaultButton>
            <PrimaryButton className='Alert-margin' startIcon={<SaveSharpIcon />} onClick={() => handleResetClick(false)}>
              {gettext('Save & Reload Later')}
            </PrimaryButton>
          </Box>
        </StyledBox>
      );
    },
    { isFullScreen: false, isResizeable: false, showFullScreen: false, isFullWidth: false, showTitle: true, id: 'id-reset-preferences' }
  );
}
