/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import MembershipSchema from '../../../pgadmin/browser/server_groups/servers/static/js/membership.ui';
import * as nodeAjax from '../../../pgadmin/browser/static/js/node_ajax';
import BaseUISchema from '../../../pgadmin/static/js/SchemaView/base_schema.ui';
import {addNewDatagridRow, genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

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
  const createSchemaObj = () => new MembershipSchema(()=>[]);
  let schemaObj = createSchemaObj();
  let getInitData = ()=>Promise.resolve({});

  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(createSchemaObj());
  });

  it('edit', async ()=>{
    await getEditView(createSchemaObj(), getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(createSchemaObj(), getInitData);
  });

  it('MembershipMemberSchema', async ()=>{
    jest.spyOn(nodeAjax, 'getNodeListByName').mockReturnValue([]);
    const {ctrl, user} = await getCreateView(new SchemaInColl(schemaObj));
    /* Make sure you hit every corner */

    await addNewDatagridRow(user, ctrl);
  });
});
