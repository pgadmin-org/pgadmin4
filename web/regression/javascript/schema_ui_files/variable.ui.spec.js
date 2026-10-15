/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import { fireEvent, screen, waitFor } from '@testing-library/react';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import VariableSchema, {getNodeVariableSchema} from '../../../pgadmin/browser/server_groups/servers/static/js/variable.ui';
import * as nodeAjax from '../../../pgadmin/browser/static/js/node_ajax';
import {addNewDatagridRow, genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';

/* Used to check collection mode */
class MockSchema extends BaseUISchema {
  constructor(getVariableSchema) {
    super();
    this.getVariableSchema = getVariableSchema;
  }

  get baseFields() {
    return [{
      id: 'variables', label: '', type: 'collection',
      schema: this.getVariableSchema(),
      editable: false,
      group: 'Parameters', mode: ['edit', 'create'],
      canAdd: true, canEdit: false, canDelete: true, hasRole: true,
      node: 'role',
    }];
  }
}

describe('VariableSchema', ()=>{

  const createSchemaObject = () => new VariableSchema(
    ()=>[],
    ()=>[],
    ()=>[],
    null
  );
  let schemaObj = createSchemaObject();
  let getInitData = ()=>Promise.resolve({});

  beforeEach(()=>{
    genericBeforeEach();
  });

  it('create', async ()=>{
    await getCreateView(createSchemaObject());
  });

  it('edit', async ()=>{
    await getEditView(createSchemaObject(), getInitData);
  });

  it('properties', async ()=>{
    await getPropertiesView(createSchemaObject(), getInitData);
  });

  it('getValueFieldProps', ()=>{
    expect(schemaObj.getValueFieldProps({vartype: 'bool'})).toBe('switch');
    expect(schemaObj.getValueFieldProps({vartype: 'enum', enumvals: []})).toEqual(expect.objectContaining({
      cell: 'select',
    }));
    expect(schemaObj.getValueFieldProps({
      value: 'sslnegotiation', vartype: 'enum', enumvals: ['postgres', 'direct'],
    })).toEqual(expect.objectContaining({
      cell: 'select',
      optionsReloadBasis: 'sslnegotiation',
      options: [
        {label: 'postgres', value: 'postgres'},
        {label: 'direct', value: 'direct'},
      ],
    }));
    expect(schemaObj.getValueFieldProps({vartype: 'integer'})).toEqual(expect.objectContaining({
      cell: 'int',
    }));
    expect(schemaObj.getValueFieldProps({vartype: 'real'})).toEqual(expect.objectContaining({
      cell: 'numeric',
    }));
    expect(schemaObj.getValueFieldProps({vartype: 'string'})).toEqual(expect.objectContaining({
      cell: 'text',
    }));
    expect(schemaObj.getValueFieldProps({vartype: 'file'})).toEqual(expect.objectContaining({
      cell: 'file',
    }));
    expect(schemaObj.getValueFieldProps({})).toBe('');
  });

  it('value options follow a change of enum variable name', async ()=>{
    const varOptions = [{
      value: 'sslmode', label: 'sslmode', vartype: 'enum',
      enumvals: ['prefer', 'require'],
    }, {
      value: 'sslnegotiation', label: 'sslnegotiation', vartype: 'enum',
      enumvals: ['postgres', 'direct'],
    }];
    let varCollObj = new MockSchema(
      ()=>new VariableSchema(varOptions, null, null, ['name', 'value'])
    );
    const {ctrl, user} = await getCreateView(varCollObj);
    await user.click(ctrl.container.querySelector('[data-test="add-row"]'));

    const rowSelects = ()=>ctrl.container.querySelectorAll(
      '[data-test="data-table-row"] input[role="combobox"]'
    );
    const hiddenVal = (name)=>ctrl.container.querySelector(
      `[data-test="data-table-row"] input[type="hidden"][name="${name}"]`
    )?.value;
    /* Allow for slow CI runners re-rendering the grid row. */
    const waitOpts = {timeout: 10000};
    /* Open the select from the keyboard and wait for an option to show. A
    freshly mounted select can drop the first open request on slow runners,
    so it is re-sent, a bounded number of times, whilst no menu is shown. */
    const findOption = async (selectIdx, label)=>{
      for(let attempt = 0; attempt < 5; attempt++) {
        if(screen.queryAllByRole('option').length == 0) {
          const input = rowSelects()[selectIdx];
          fireEvent.focus(input);
          fireEvent.keyDown(input, {key: 'ArrowDown', keyCode: 40});
        }
        try {
          return await screen.findByRole('option', {name: label}, {timeout: 2000});
        } catch {
          /* Not shown yet; retry. */
        }
      }
      throw new Error(`Option '${label}' not shown; options: ${
        screen.queryAllByRole('option').map((o)=>o.textContent).join(', ')
      }`);
    };
    const closeMenu = ()=>{
      fireEvent.keyDown(rowSelects()[1], {key: 'Escape', keyCode: 27});
    };
    const pickName = async (label)=>{
      await user.click(await findOption(0, label));
      await waitFor(()=>{
        expect(hiddenVal('name')).toBe(label);
        expect(hiddenVal('value')).toBe('');
        expect(rowSelects().length).toBe(2);
      }, waitOpts);
    };

    await waitFor(()=>expect(rowSelects().length).toBeGreaterThan(0), waitOpts);
    await pickName('sslmode');
    expect(await findOption(1, 'require')).toBeInTheDocument();
    closeMenu();
    await waitFor(()=>expect(screen.queryAllByRole('option')).toHaveLength(0), waitOpts);

    await pickName('sslnegotiation');
    expect(await findOption(1, 'direct')).toBeInTheDocument();
    expect(screen.queryByRole('option', {name: 'require'})).not.toBeInTheDocument();
  }, 30000);

  it('variable collection', async ()=>{
    jest.spyOn(nodeAjax, 'getNodeAjaxOptions').mockReturnValue([]);
    jest.spyOn(nodeAjax, 'getNodeListByName').mockReturnValue([]);
    let varCollObj = new MockSchema(()=>getNodeVariableSchema({}, {server: {user: {name: 'postgres'}}}, {}, true, true));
    const {ctrl, user} = await getCreateView(varCollObj);
    /* Make sure you hit every corner */

    await addNewDatagridRow(user, ctrl);
  });
});
