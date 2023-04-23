/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import _ from 'lodash';
import CheckConstraintSchema from '../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/constraints/check_constraint/static/js/check_constraint.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

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
  let mount;
  let schemaObj = new CheckConstraintSchema();
  let getInitData = ()=>Promise.resolve({});

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', ()=>{
    mount(getCreateView(schemaObj));
  });

  it('edit', ()=>{
    mount(getEditView(schemaObj, getInitData));
  });

  it('properties', ()=>{
    mount(getPropertiesView(schemaObj, getInitData));
  });

  it('create collection', ()=>{
    let schemaCollObj = new SchemaInColl();
    let ctrl = mount(getCreateView(schemaCollObj));
    /* Make sure you hit every corner */
    ctrl.find('DataGridView').at(0).find('PgIconButton[data-test="add-row"]').find('button').simulate('click');
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

