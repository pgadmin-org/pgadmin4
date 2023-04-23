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
import MembershipSchema from '../../../pgadmin/browser/server_groups/servers/static/js/membership.ui';
import * as nodeAjax from '../../../pgadmin/browser/static/js/node_ajax';
import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

class SchemaInColl extends BaseUISchema {
  constructor(schemaObj) {
    super();
    this.schemaObj = schemaObj;
  }

  get baseFields() {
    return [{
      id: 'collection', label: '', type: 'collection',
      schema: this.schemaObj,
      editable: false,
      canAdd: true, canEdit: false, canDelete: true, hasRole: true,
    }];
  }
}

describe('MembershipSchema', ()=>{
  let mount;
  let schemaObj = new MembershipSchema(
    ()=>[]);
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

  it('MembershipMemberSchema', ()=>{
    spyOn(nodeAjax, 'getNodeListByName').and.returnValue([]);
    let ctrl = mount(getCreateView(new SchemaInColl(schemaObj)));
    /* Make sure you hit every corner */
    ctrl.find('DataGridView').at(0).find('PgIconButton[data-test="add-row"]').find('button').simulate('click');
  });
});
