/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import MaintenanceSchema, {getVacuumSchema} from '../../../pgadmin/tools/maintenance/static/js/maintenance.ui';
import {getCreateView} from '../genericFunctions';

describe('MaintenanceSchema', ()=>{




  let backupSchemaObj = new MaintenanceSchema(
    ()=> getVacuumSchema(),
    {
      nodeInfo: {schema: {label: 'public'}, server: {version: 90400}}
    }
  );

  it('start maintenance', async ()=>{
    await getCreateView(backupSchemaObj);
  });

  describe('ONLY option', ()=>{
    const getOnlyField = (nodeInfo)=>{
      let vacuumSchemaObj = getVacuumSchema();
      vacuumSchemaObj.top = new MaintenanceSchema(
        ()=> vacuumSchemaObj, {nodeInfo: nodeInfo}
      );
      return vacuumSchemaObj.fields.find((f)=>f.id == 'only');
    };
    const tableNode = {
      schema: {label: 'public'}, table: {label: 'tbl'},
      server: {version: 180000},
    };

    it('is gated on PostgreSQL 18', ()=>{
      expect(getOnlyField(tableNode).min_version).toBe(180000);
    });

    it.each(['VACUUM', 'ANALYZE'])('is enabled for %s on a table', (op)=>{
      let field = getOnlyField(tableNode);
      let state = {op: op, only: true};
      expect(field.visible(state)).toBe(true);
      expect(field.disabled(state)).toBe(false);
      expect(state.only).toBe(true);
    });

    it.each(['REINDEX', 'CLUSTER'])('is cleared for %s', (op)=>{
      let field = getOnlyField(tableNode);
      let state = {op: op, only: true};
      expect(field.visible(state)).toBe(false);
      expect(field.disabled(state)).toBe(true);
      expect(state.only).toBe(false);
    });

    it.each([
      ['a database', {server: {version: 180000}}],
      ['a materialized view', {
        schema: {label: 'public'}, mview: {label: 'mv'},
        server: {version: 180000},
      }],
    ])('is cleared for %s', (_desc, nodeInfo)=>{
      let field = getOnlyField(nodeInfo);
      let state = {op: 'VACUUM', only: true};
      expect(field.visible(state)).toBe(false);
      expect(field.disabled(state)).toBe(true);
      expect(state.only).toBe(false);
    });
  });

});

