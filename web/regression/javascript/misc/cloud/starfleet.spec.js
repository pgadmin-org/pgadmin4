/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {isValidStarfleetName, parseAllowlist, isUsableCluster,
  StarfleetInstanceSchema} from '../../../../pgadmin/misc/cloud/static/js/starfleet_schema.ui';
import {validateStarfleetStep1, validateStarfleetStep2,
  validateStarfleetStep3} from '../../../../pgadmin/misc/cloud/static/js/starfleet';
import {genericBeforeEach, getCreateView} from '../../genericFunctions';

describe('Starfleet cloud provider', ()=>{
  it('validates database names', ()=>{
    expect(isValidStarfleetName('mydb1')).toBe(true);
    expect(isValidStarfleetName('a'.repeat(50))).toBe(true);
    expect(isValidStarfleetName('a'.repeat(51))).toBe(false);
    expect(isValidStarfleetName('1db')).toBe(false);
    expect(isValidStarfleetName('my_db')).toBe(false);
    expect(isValidStarfleetName('MyDb')).toBe(false);
    expect(isValidStarfleetName('')).toBe(false);
  });

  it('parses allowlists', ()=>{
    expect(parseAllowlist('198.51.100.7, 203.0.113.0/24,')).toEqual(
      {cidrs: ['198.51.100.7', '203.0.113.0/24'], error: null});
    expect(parseAllowlist('').error).not.toBeNull();
    expect(parseAllowlist('10.0.0.0/33').error).not.toBeNull();
    expect(parseAllowlist('2001:db8::1').error).not.toBeNull();
    expect(parseAllowlist('256.1.1.1').error).not.toBeNull();
    expect(parseAllowlist('0.0.0.0/0').error).toBeNull();
    const many = Array.from({length: 51}, (_, i)=>`10.0.0.${i}`).join(',');
    expect(parseAllowlist(many).error).not.toBeNull();
  });

  it('accepts only available public clusters', ()=>{
    expect(isUsableCluster({status: 'available', node_location: 'public'})).toBe(true);
    expect(isUsableCluster({status: 'creating', node_location: 'public'})).toBe(false);
    expect(isUsableCluster({status: 'available', node_location: 'private'})).toBe(false);
  });

  it('validates steps', ()=>{
    expect(validateStarfleetStep1({client_id: 'a', client_secret: 'b'})).toBe(false);
    expect(validateStarfleetStep1({client_id: 'a'})).toBe(true);
    const managed = {kind: 'managed', name: 'mydb', region: 'us-east-2',
      size: 'small', pg_version: '18', ip_allowlist: '198.51.100.7', role: 'admin'};
    expect(validateStarfleetStep2(managed)).toBe(false);
    expect(validateStarfleetStep2({...managed, ip_allowlist: ''})).toBe(true);
    expect(validateStarfleetStep2({...managed, display_name: 'x'.repeat(26)})).toBe(true);
    expect(validateStarfleetStep2({...managed, size: ''})).toBe(true);
    const byoc = {kind: 'byoc', name: 'mydb', cluster_id: 'c1', pg_version: '17'};
    expect(validateStarfleetStep2(byoc)).toBe(false);
    expect(validateStarfleetStep2({...byoc, cluster_id: ''})).toBe(true);
    const nodeInfo = {server_group: {_id: 3}};
    const dbDetails = {};
    expect(validateStarfleetStep3(dbDetails, nodeInfo)).toBe(false);
    expect(dbDetails.gid).toBe(3);
  });

  describe('instance schema', ()=>{
    beforeEach(()=>{ genericBeforeEach(); });
    it('renders in create mode', async ()=>{
      const schema = new StarfleetInstanceSchema({
        regions: ()=>Promise.resolve([]), sizes: ()=>Promise.resolve([]),
        pgVersions: ()=>Promise.resolve([]), clusters: ()=>Promise.resolve([]),
        byocPgVersions: ()=>Promise.resolve([]),
      }, {byoc: true, ip_allowlist: '198.51.100.7'});
      await getCreateView(schema);
    });
  });
});
