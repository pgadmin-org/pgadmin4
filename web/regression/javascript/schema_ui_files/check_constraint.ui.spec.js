/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import _ from 'lodash';
import CheckConstraintSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/constraints/check_constraint/static/js/check_constraint.ui';
import {addNewDatagridRow, genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

class SchemaInColl extends BaseUISchema {
  constructor() {
    super();
  }

  get baseFields() {
    return [{
      id: 'collection', label: '', type: 'collection',
      schema: new CheckConstraintSchema(),
      editable: false,
      canAdd: true, canEdit: false, canDelete: true, hasRole: true,
      columns : ['name', 'consrc'],
    }];
  }
}

function getFieldDepChange(schema, id) {
  return _.find(schema.fields, (f)=>f.id==id)?.depChange;
}

describe('CheckConstraintSchema', ()=>{

  let schemaObj = new CheckConstraintSchema();
  let getInitData = ()=>Promise.resolve({});





  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(schemaObj);
  });

  it('edit', async ()=>{
    await getEditView(schemaObj, getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(schemaObj, getInitData);
  });

  it('create collection', async ()=>{
    let schemaCollObj = new SchemaInColl();
    const {ctrl, user} = await getCreateView(schemaCollObj);
    /* Make sure you hit every corner */

    await addNewDatagridRow(user, ctrl);
  });

  it('depChange', ()=>{
    let state = {name: ''};

    expect(getFieldDepChange(schemaObj, 'comment')(state)).toEqual({
      comment: '',
    });

    /* If partitioned table */
    schemaObj.top = {
      sessData: {
        is_partitioned: true,
      }
    };
    expect(getFieldDepChange(schemaObj, 'connoinherit')(state)).toEqual({
      connoinherit: false,
    });
    schemaObj.top = null;
  });

  it('validate', ()=>{
    expect(schemaObj.validate()).toBe(false);
  });
});

