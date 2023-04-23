/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import gettext from 'sources/gettext';

export default class AggregateSchema extends BaseUISchema {
  constructor(fieldOptions = {},initValues={}) {
    super({
      name: undefined,
      oid: undefined,
      owner: undefined,
      description: undefined,
      schema: null,
      input_types: undefined,
      state_type: undefined,
      state_func: undefined,
      state_data_size: 0,
      final_type: undefined,
      final_func: undefined,
      final_func_modify: undefined,
      final_extra_param: undefined,
      initial_val: undefined,
      moving_state_type: undefined,
      moving_state_func: undefined,
      moving_state_data_size: 0,
      moving_final_type: undefined,
      moving_final_func: undefined,
      moving_final_func_modify: undefined,
      moving_final_extra_param: undefined,
      moving_initial_val: undefined,
      moving_inverse_func: undefined,
      combine_func: undefined,
      serialization_func: undefined,
      deserialization_func: undefined,
      sort_oper: undefined,
      ...initValues
    });
    this.fieldOptions = fieldOptions;
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    return [
      {
        id: 'name', label: gettext('Name'),
        type: 'text', readonly: true,
      },
      {
        id: 'oid', label: gettext('OID'),
        type: 'text', mode: ['properties'],
      },
      {
        id: 'owner', label: gettext('Owner'),
        type: 'text', readonly: true,
      },
      {
        id: 'schema', label: gettext('Schema'),
        mode: ['create', 'edit'],
        type: 'text', readonly: true,
      },
      {
        id: 'is_sys_obj', label: gettext('System aggregate?'),
        cell: 'boolean', type: 'switch', mode: ['properties'],
      },
      {
        id: 'description', label: gettext('Comment'),
        type: 'multiline', mode: ['properties', 'create', 'edit'],
        readonly: true,
      },
      {
        id: 'input_types', label: gettext('Input types'),
        group: gettext('Options'),
        type: 'text', readonly: true,
      },
      {
        id: 'state_type', label: gettext('State type'),
        group: gettext('Options'),
        type: 'text', readonly: true,
      },
      {
        id: 'state_func', label: gettext('State function'),
        group: gettext('Options'),
        type: 'text', readonly: true,
      },
      {
        id: 'state_data_size', label: gettext('State data size'),
        group: gettext('Options'),
        type: 'text', readonly: true,
      },
      {
        id: 'final_type', label: gettext('Final type'),
        group: gettext('Options'),
        type: 'text', readonly: true,
      },
      {
        id: 'final_func', label: gettext('Final function'),
        group: gettext('Options'),
        type: 'text', readonly: true,
      },
      {
        id: 'final_func_modify', label: gettext('Final function modify'),
        group: gettext('Options'), min_version: 110000,
        type: 'text', readonly: true,
      },
      {
        id: 'final_extra_param', label: gettext('Pass extra arguments to final function'),
        group: gettext('Options'), type: 'switch', readonly: true,
      },
      {
        id: 'initial_val', label: gettext('Initial condition'),
        group: gettext('Options'),
        type: 'text', readonly: true,
      },
      {
        id: 'moving_state_type', label: gettext('State type'),
        group: gettext('Moving Options'),
        type: 'text', readonly: true,
      },
      {
        id: 'moving_state_func', label: gettext('State function'),
        group: gettext('Moving Options'),
        type: 'text', readonly: true,
      },
      {
        id: 'moving_state_data_size', label: gettext('State data size'),
        group: gettext('Moving Options'),
        type: 'text', readonly: true,
      },
      {
        id: 'moving_final_func', label: gettext('Final function'),
        group: gettext('Moving Options'),
        type: 'text', readonly: true,
      },
      {
        id: 'moving_final_func_modify', label: gettext('Final function modify'),
        group: gettext('Moving Options'), min_version: 110000,
        type: 'text', readonly: true,
      },
      {
        id: 'moving_final_extra_param', label: gettext('Pass extra arguments to final function'),
        group: gettext('Moving Options'), type: 'switch', readonly: true,
      },
      {
        id: 'moving_inverse_func', label: gettext('Inverse function'),
        group: gettext('Moving Options'),
        type: 'text', readonly: true,
      },
      {
        id: 'moving_initial_val', label: gettext('Initial condition'),
        group: gettext('Moving Options'),
        type: 'text', readonly: true,
      },
      {
        id: 'sort_oper', label: gettext('Sort operator'),
        group: gettext('Advanced'),
        type: 'text', readonly: true,
      },
      {
        id: 'combine_func', label: gettext('Combine function'),
        group: gettext('Advanced'),
        type: 'text', readonly: true,
      },
      {
        id: 'serialization_func', label: gettext('Serialization function'),
        group: gettext('Advanced'),
        type: 'text', readonly: true,
      },
      {
        id: 'deserialization_func', label: gettext('Deserialization function'),
        group: gettext('Advanced'),
        type: 'text', readonly: true,
      },
    ];
  }
}
