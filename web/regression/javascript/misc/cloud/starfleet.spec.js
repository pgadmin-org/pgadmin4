/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {isValidStarfleetName, parseAllowlist, isUsableCluster, clusterOptions,
  StarfleetInstanceSchema} from '../../../../pgadmin/misc/cloud/static/js/starfleet_schema.ui';
import {validateStarfleetStep1, validateStarfleetStep2,
  validateStarfleetStep3, StarfleetInstanceDetails} from '../../../../pgadmin/misc/cloud/static/js/starfleet';
import {genericBeforeEach, getCreateView, withBrowser} from '../../genericFunctions';
import {act, render, screen} from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import url_for from 'sources/url_for';

jest.mock('pgbrowser/node_ajax', ()=>({
  getNodeAjaxOptions: jest.fn(()=>Promise.resolve([])),
  getNodeListById: jest.fn(()=>[]),
}));

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

  it('lists clusters, disabling unusable ones and explaining an empty list', ()=>{
    const opts = clusterOptions([
      {label: 'c1', value: 'id1', status: 'available', node_location: 'public'},
      {label: 'c2', value: 'id2', status: 'creating', node_location: 'public'},
      {label: 'c3', value: 'id3', status: 'available', node_location: 'private'},
    ]);
    expect(opts.map((o)=>[o.label, o.isDisabled])).toEqual([
      ['c1', false], ['c2 (creating)', true], ['c3 (private nodes)', true]]);
    for (const empty of [[], null]) {
      const [only, ...rest] = clusterOptions(empty);
      expect(rest).toEqual([]);
      expect(only.label).toMatch(/No BYOC clusters found/);
      expect([only.value, only.isDisabled]).toEqual(['', true]);
    }
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
    it('clears the PostgreSQL version when the deployment type changes', ()=>{
      const schema = new StarfleetInstanceSchema({}, {byoc: true});
      const field = schema.baseFields.find((f)=>f.id == 'pg_version');
      expect(field.depChange({kind: 'byoc', pg_version: '18'}, ['kind']))
        .toEqual({pg_version: ''});
      expect(field.depChange({kind: 'byoc', pg_version: '18'}, ['cluster_id']))
        .toBeUndefined();
    });

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

  describe('instance details', ()=>{
    let networkMock;
    beforeEach(()=>{
      genericBeforeEach();
      networkMock = new MockAdapter(axios);
      networkMock.onGet(url_for('starfleet.client_ip')).reply(200, {data: '198.51.100.7'});
    });
    afterEach(()=>{ networkMock.restore(); });

    it('defaults to a managed deployment once the client IP has loaded', async ()=>{
      const Details = withBrowser(StarfleetInstanceDetails);
      const setData = jest.fn();
      await act(async ()=>{
        render(<Details cloudProvider='starfleet' nodeInfo={{}} nodeData={{}}
          byoc={false} starfleetInstanceData={{}} setStarfleetInstanceData={setData}/>);
      });
      expect(await screen.findByText('Region')).toBeInTheDocument();
      expect(screen.getByText('Size')).toBeInTheDocument();
    });
  });
});
