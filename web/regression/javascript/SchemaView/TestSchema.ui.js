/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import BaseUISchema from 'sources/SchemaView/base_schema.ui';

class TestSubSchema extends BaseUISchema {
  constructor() {
    super({
      field3: null,
      field4: null,
    });

    this.keys = ['field3', 'field4', 'field5'];
  }

  get baseFields() {
    return [
      {
        id: 'field3', label: 'Field3', type: 'int', group: null,
        mode: ['properties'], visible: true, cell: 'int'
      },
      {
        id: 'field4', label: 'Field4', type: 'select', group: null,
        cell: ()=>({cell: 'select', options: []}),
        mode: ['properties', 'edit', 'create'],
        disabled: (state)=>this.isNew(state), deps: ['field5'],
        depChange: ()=>{/*This is intentional (SonarQube)*/}, optionsLoaded: ()=>{/*This is intentional (SonarQube)*/},
      },
      {
        id: 'field5', label: 'Field5', type: 'multiline', group: null,
        cell: 'text', mode: ['properties', 'edit', 'create'], disabled: false,
        noEmpty: true, minWidth: '50%',
      },
      {
        id: 'fieldskip', label: 'FieldSkip', type: 'text', group: null,
        cell: 'text', mode: ['properties', 'edit', 'create'], disabled: false,
        noEmpty: true,
      }
    ];
  }
}

export class TestSchema extends BaseUISchema {
  constructor() {
    super({
      id: undefined,
      field1: null,
      field2: null,
      fieldcoll: null,
    });

    this.informText = 'some inform text';
  }

  get baseFields() {
    return [
      {
        id: 'id', label: 'ID', type: 'int', group: null,
        mode: ['properties'],
      },{
        id: 'field1', label: 'Field1', type: 'text', group: null,
        mode: ['properties', 'edit', 'create'], disabled: false,
        noEmpty: true, visible: true,
      },{
        id: 'field2', label: 'Field2', type: ()=>({
          type: 'int', min: 0, max: 255,
        }), group: null, mode: ['properties', 'create'],
        disabled: ()=>false, visible: ()=>true, deps: ['field1'],
        depChange: ()=>({})
      },{
        id: 'fieldcoll', label: 'FieldColl', type: 'collection', group: null,
        mode: ['edit', 'create'], schema: new TestSubSchema(),
        canAdd: true, canEdit: true, canDelete: true, uniqueCol: ['field5'],
        customDeleteTitle: 'Custom delete title',
        customDeleteMsg: 'Custom delete message',
      },{
        type: 'nested-tab', group: null,
        mode: ['edit', 'create'], schema: new TestSubSchema(),
      },{
        id: 'field6', label: 'Field6', type: 'numeric', group: null,
        mode: ['properties', 'create'],
        disabled: false,
      },{
        id: 'field7', label: 'Field7', type: 'text', group: 'Advanced',
        mode: ['properties'],
      },{
        id: 'fieldinvis', label: 'fieldinvis', type: 'text', group: 'Advanced',
        mode: ['properties', 'edit', 'create'], visible: false,
      },
    ];
  }

  validate() {
    return false;
  }
}


class TestSubSchemaAllTypes extends BaseUISchema {
  constructor() {
    super();
  }

  get baseFields() {
    return [
      {
        id: 'int', label: 'int', type: 'int', group: null,
        mode: ['create'], cell: 'int'
      },{
        id: 'text', label: 'text', type: 'text', group: null,
        mode: ['create'], cell: 'text'
      },{
        id: 'password', label: 'password', type: 'password', group: null,
        mode: ['create'], cell: 'password',
      },{
        id: 'select', label: 'select', type: 'select', group: null,
        mode: ['create'], options: [], cell: 'select'
      },{
        id: 'switch', label: 'switch', type: 'switch', group: null,
        mode: ['create'], options: [], cell: 'switch'
      },{
        id: 'privilege', label: 'privilege', type: 'privilege', group: null,
        mode: ['create'], options: [], cell: 'privilege',
      }
    ];
  }
}


export class TestSchemaAllTypes extends BaseUISchema {
  constructor() {
    super();
  }

  get baseFields() {
    return [
      {
        id: 'int', label: 'int', type: 'int', group: null,
        mode: ['create'],
      },{
        id: 'text', label: 'text', type: 'text', group: null,
        mode: ['create'],
      },{
        id: 'multiline', label: 'multiline', type: 'multiline', group: null,
        mode: ['create'],
      },{
        id: 'password', label: 'password', type: 'password', group: null,
        mode: ['create'],
      },{
        id: 'select', label: 'select', type: 'select', group: null,
        mode: ['create'], options: [],
      },{
        id: 'switch', label: 'switch', type: 'switch', group: null,
        mode: ['create'], options: [],
      },{
        id: 'checkbox', label: 'checkbox', type: 'checkbox', group: null,
        mode: ['create'],
      },{
        id: 'toggle', label: 'toggle', type: 'toggle', group: null,
        mode: ['create'],
      },{
        id: 'color', label: 'color', type: 'color', group: null,
        mode: ['create'],
      },{
        id: 'file', label: 'file', type: 'file', group: null,
        mode: ['create'],
      },{
        id: 'sql', label: 'sql', type: 'sql', group: null,
        mode: ['create'],
      },{
        id: 'function', label: 'function', type: ()=>'text',
        group: null,mode: ['create'],
      },{
        id: 'collection', label: 'collection', type: 'collection', group: null,
        mode: ['edit', 'create'], schema: new TestSubSchemaAllTypes(),
        canAdd: true, canEdit: true, canDelete: true,
      }
    ];
  }

  validate() {
    return false;
  }
}
