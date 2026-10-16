/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import VariableSchema, {getNodeVariableSchema} from '../../../pgadmin/browser/server_groups/servers/static/js/variable.ui';
import * as nodeAjax from '../../../pgadmin/browser/static/js/node_ajax';
import { MappedCellControl } from '../../../pgadmin/static/js/SchemaView/MappedControl';
import {addNewDatagridRow, genericBeforeEach, getCreateView, getEditView, getPropertiesView, withBrowser} from '../genericFunctions';

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
    /* The grid keeps the value cell's select mounted when the name changes,
    so render the value cell on its own and re-render it with the props the
    grid builds for each name. Driving the select menus through the full
    grid was flaky: the grid focuses a new row from a timer and re-renders
    on validation, and a focus change between opening a menu and clicking
    an option closes the menu, so the click is lost. */
    const schemaObj = new VariableSchema([{
      value: 'sslmode', label: 'sslmode', vartype: 'enum',
      enumvals: ['prefer', 'require'],
    }, {
      value: 'sslnegotiation', label: 'sslnegotiation', vartype: 'enum',
      enumvals: ['postgres', 'direct'],
    }], null, null, ['name', 'value']);
    /* The variable types are loaded asynchronously by the constructor. */
    await waitFor(()=>expect(Object.keys(schemaObj.varTypes)).toHaveLength(2));

    const valueField = schemaObj.fields.find((f)=>f.id == 'value');
    const cellProps = (name, value)=>({
      ...valueField, ...valueField.cell({name}),
      visible: true, value: value, onCellChange: ()=>{/* Not needed */},
    });
    const ValueCell = withBrowser(MappedCellControl);
    const hiddenVal = ()=>ctrl.container.querySelector(
      'input[type="hidden"][name="value"]'
    )?.value;

    const ctrl = render(<ValueCell {...cellProps('sslmode', 'require')}/>);
    await waitFor(()=>expect(hiddenVal()).toBe('require'));

    /* A value is only shown if it is one of the loaded options, so this
    fails if the options are not reloaded for the new name. */
    ctrl.rerender(<ValueCell {...cellProps('sslnegotiation', 'direct')}/>);
    await waitFor(()=>expect(hiddenVal()).toBe('direct'));

    await userEvent.setup().click(ctrl.container.querySelector('input[role="combobox"]'));
    expect(await screen.findByRole('option', {name: 'postgres'})).toBeInTheDocument();
    expect(screen.queryByRole('option', {name: 'require'})).not.toBeInTheDocument();
  });

  it('variable collection', async ()=>{
    jest.spyOn(nodeAjax, 'getNodeAjaxOptions').mockReturnValue([]);
    jest.spyOn(nodeAjax, 'getNodeListByName').mockReturnValue([]);
    let varCollObj = new MockSchema(()=>getNodeVariableSchema({}, {server: {user: {name: 'postgres'}}}, {}, true, true));
    const {ctrl, user} = await getCreateView(varCollObj);
    /* Make sure you hit every corner */

    await addNewDatagridRow(user, ctrl);
  });
});
