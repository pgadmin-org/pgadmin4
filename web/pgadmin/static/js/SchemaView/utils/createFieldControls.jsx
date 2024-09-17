/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';

import gettext from 'sources/gettext';

import { SCHEMA_STATE_ACTIONS } from '../SchemaState';
import { isModeSupportedByField } from '../common';
import { View, hasView } from '../registry';
import { StaticMappedFormControl, MappedFormControl } from '../MappedControl';


const DEFAULT_TAB = gettext('General');

export const createFieldControls = ({
  schema, schemaState, accessPath, viewHelperProps, dataDispatch
}) => {

  const { mode } = (viewHelperProps || {});
  const isPropertyMode = mode === 'properties';
  const groups = [];
  const groupsById = {};
  let currentGroup = null;

  const createGroup = (id, label, visible, field, isFullTab) => {
    const group = {
      id: id,
      label: label,
      visible: visible,
      field: field,
      className: isFullTab ? (
        isPropertyMode ? 'Properties-noPadding' : 'FormView-fullSpace'
      ) : '',
      controls: [],
      inlineGroups: {},
      isFullTab: isFullTab
    };

    groups.push(group);
    groupsById[id] = group;

    return group;
  };

  // Create default group - 'General'.
  createGroup(DEFAULT_TAB, DEFAULT_TAB, true);

  schema?.fields?.forEach((field) => {
    if (!isModeSupportedByField(field, viewHelperProps)) return;

    let inlineGroup = null;
    const inlineGroupId = field['inlineGroup'];

    if(field.type === 'group') {

      if (!field.id || (field.id in groups)) {
        throw new Error('Group-id must be unique within a schema.');
      }

      const { visible } = schemaState.options(accessPath.concat(field.id));
      createGroup(field.id, field.label, visible, field);

      return;
    }

    if (field.isFullTab) {
      if (field.type === inlineGroup)
        throw new Error('Inline group can not be full tab control');

      const { visible } = schemaState.options(accessPath.concat(field.id));
      currentGroup = createGroup(
        field.id, field.group || field.label, visible, field, true
      );
    } else {
      const { group } = field;

      currentGroup = groupsById[group || DEFAULT_TAB];

      if (!currentGroup) {
        const newGroup = createGroup(group, group, true);
        currentGroup = newGroup; 
      }

      // Generate inline-view if necessary, or use existing one.
      if (inlineGroupId) {
        inlineGroup = currentGroup.inlineGroups[inlineGroupId];
        if (!inlineGroup) {
          inlineGroup = currentGroup.inlineGroups[inlineGroupId] = {
            control: View('InlineView'),
            controlProps: {
              viewHelperProps: viewHelperProps,
              field: null,
            },
            controls: [],
          };
          currentGroup.controls.push(inlineGroup);
        }
      }
    }

    if (field.type === inlineGroup) {
      if (inlineGroupId) {
        throw new Error('inline-group can not be created within inline-group');
      }
      inlineGroup = currentGroup.inlineGroups[inlineGroupId];
      if (inlineGroup) {
        throw new Error('inline-group must be unique-id within a tab group');
      }
      inlineGroup = currentGroup.inlineGroups[inlineGroupId] = {
        control: View('InlineView'),
        controlProps: {
          accessPath: schemaState.accessPath(accessPath, field.id),
          viewHelperProps: viewHelperProps,
          field: field,
        },
        controls: [],
      };
      currentGroup.controls.push(inlineGroup);
      return;
    }

    let control = null;
    const controlProps = {
      key: field.id,
      accessPath: schemaState.accessPath(accessPath, field.id),
      viewHelperProps: viewHelperProps,
      dataDispatch: dataDispatch,
      field: field,
    };

    switch (field.type) {
    case 'nested-tab':
      // We don't support nested-tab in 'properties' mode.
      if (isPropertyMode) return;

      control = View('FormView');
      controlProps['isNested'] = true;
      break;
    case 'nested-fieldset':
      control = View('FieldSetView');
      controlProps['controlClassName'] =
          isPropertyMode ? 'Properties-controlRow' : 'FormView-controlRow';
      break;
    case 'collection':
      control = View('DataGridView');
      controlProps['containerClassName'] =
          isPropertyMode ? 'Properties-controlRow' : 'FormView-controlRow';
      break;
    default:
      {
        control = (
          hasView(field.type) ? View(field.type) : (
            field.id ? MappedFormControl : StaticMappedFormControl
          )
        );

        if (inlineGroup) {
          controlProps['withContainer'] = false;
          controlProps['controlGridBasis'] = 3;
        }

        controlProps['className'] = field.isFullTab ? '' : (
          isPropertyMode ? 'Properties-controlRow' : 'FormView-controlRow'
        );

        if (field.id) {
          controlProps['id'] = field.id;
          controlProps['onChange'] = (changeValue) => {
            // Get the changes on dependent fields as well.
            dataDispatch?.({
              type: SCHEMA_STATE_ACTIONS.SET_VALUE,
              path: controlProps.accessPath,
              value: changeValue,
            });
          };
        }
      }
      break;
    }

    // Use custom control over the standard one.
    if (field.CustomControl) {
      control = field.CustomControl;
    }

    if (isPropertyMode) field.helpMessage = '';

    // Its a form control.
    if (_.isEqual(accessPath.concat(field.id), schemaState.errors?.name))
      currentGroup.hasError = true;

    (inlineGroup || currentGroup).controls.push({control, controlProps});
  });

  return groups.filter(
    (group) => (group.visible && group.controls.length)
  );
};
