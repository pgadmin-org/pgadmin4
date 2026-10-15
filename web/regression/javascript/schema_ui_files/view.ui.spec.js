/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import ViewSchema, { normaliseViewDefinition } from '../../../pgadmin/browser/server_groups/servers/databases/schemas/views/static/js/view.ui';
import {genericBeforeEach, getCreateView, getEditView, getPropertiesView} from '../genericFunctions';
import { initializeSchemaWithData } from './utils';

class MockSchema extends BaseUISchema {
  get baseFields() {
    return [];
  }
}

describe('ViewSchema', ()=>{

  let schemaObj; 
  let getInitData = ()=>Promise.resolve({});

  beforeEach(()=>{
    schemaObj = new ViewSchema(
      ()=>new MockSchema(),
      {server: {server_type: 'pg'}},
      {
        role: ()=>[],
        schema: ()=>[],
      },
      {
        owner: 'postgres',
        schema: 'public'
      }
    );
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

  it('validate', ()=>{
    let state = {};
    let setError = jest.fn();
    initializeSchemaWithData(schemaObj, {});

    state.definition = null;
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('definition', 'Please enter view code.');

    state.definition = 'SELECT 1;';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('definition', null);

    state.definition = 'SELECT 1';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('definition', null);

    state.service = 'Test';
    state.definition = 'SELECT 1';
    schemaObj.validate(state, setError);
    expect(setError).toHaveBeenCalledWith('definition', null);

  });

  describe('column change warning', ()=>{
    // As returned by pg_get_viewdef()
    let origDef = ` SELECT id,
    "Name",
    concat(a, ' x ', b) AS ab,
    (d)::text AS ds
   FROM t1 t
  WHERE (id > 1);`;

    let validateWith = (definition)=>{
      initializeSchemaWithData(schemaObj, {oid: 1, definition: origDef});
      schemaObj.validate({definition: definition}, jest.fn());
      return schemaObj.warningText;
    };

    it('does not warn when the definition has only been reformatted', ()=>{
      // As produced by the SQL formatter with upper case keywords,
      // functions and data types
      expect(validateWith(`SELECT
	id,
	"Name",
	CONCAT(a, ' x ', b) AS ab,
	(d)::TEXT AS ds
FROM
	t1 t
WHERE
	(id > 1);`)).toBeNull();

      // Lower case keywords
      expect(validateWith(`select id, "Name", concat(a, ' x ', b) as ab,
  (d)::text as ds from t1 t where (id > 1);`)).toBeNull();
    });

    it('warns when the columns change', ()=>{
      expect(validateWith(`SELECT id, "Name", concat(a, ' x ', b) AS ab
FROM t1 t WHERE (id > 1);`)).not.toBeNull();
    });

    it('warns when the case of a quoted identifier changes', ()=>{
      expect(validateWith(`SELECT id, "NAME", concat(a, ' x ', b) AS ab,
  (d)::text AS ds FROM t1 t WHERE (id > 1);`)).not.toBeNull();
    });

    it('preserves quoted identifiers and literals when normalising', ()=>{
      expect(normaliseViewDefinition(
        'SELECT "MixedCase", \'It\'\'s A Value\' AS X FROM T'
      )).toBe('select"MixedCase",\'It\'\'sAValue\'asxfromt');
      expect(normaliseViewDefinition(undefined)).toBe('');
    });
  });
});
