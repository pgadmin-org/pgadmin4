/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import ImportExportSchema, {getFileInfoSchema, getMiscellaneousSchema} from '../../../pgadmin/tools/import_export/static/js/import_export.ui';
import {getCreateView} from '../genericFunctions';

describe('ImportExportSchema', ()=>{





  let importExportSchemaObj = new ImportExportSchema(
    ()=>getFileInfoSchema(),
    ()=>getMiscellaneousSchema(),
    {columns: ()=>[]}
  );

  it('start import export', async ()=>{
    await getCreateView(importExportSchemaObj);
  });

  describe('reject_limit', ()=>{
    const field = ()=>importExportSchemaObj.fields.find((f)=>f.id == 'reject_limit');
    const importIgnore = {is_import: true, format: 'csv', on_error: 'ignore'};

    it('requires PostgreSQL 18', ()=>{
      expect(field().min_version).toBe(180000);
    });

    it.each([
      ['csv import with on_error ignore', importIgnore, false],
      ['text import with on_error ignore', {...importIgnore, format: 'text'}, false],
      ['on_error stop', {...importIgnore, on_error: 'stop'}, true],
      ['binary format', {...importIgnore, format: 'binary'}, true],
      ['export', {...importIgnore, is_import: false}, true],
    ])('disabled for %s', (_desc, state, disabled)=>{
      expect(field().disabled(state)).toBe(disabled);
      expect(field().depChange({...state, reject_limit: '5'})).toEqual(
        disabled ? {reject_limit: null} : undefined
      );
    });
  });

});
