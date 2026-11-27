/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {isValidStarfleetName, parseAllowlist, signInNote,
  StarfleetInstanceSchema, StarfleetCredSchema} from '../../../../pgadmin/misc/cloud/static/js/starfleet_schema.ui';
import {validateStarfleetStep1, validateStarfleetStep2,
  validateStarfleetStep3, StarfleetInstanceDetails, getStarfleetSummary,
  StarfleetCredentials, signInToStarfleet, starfleetSecret,
  verifyStarfleetCredentials} from '../../../../pgadmin/misc/cloud/static/js/starfleet';
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

  it('validates steps', ()=>{
    expect(validateStarfleetStep1({client_id: 'a', client_secret: 'b'})).toBe(false);
    expect(validateStarfleetStep1({client_id: 'a'})).toBe(true);
    expect(validateStarfleetStep1({auth_method: 'api_client',
      client_id: 'a', client_secret: 'b'})).toBe(false);
    const user = {auth_method: 'user', is_signed_in: true, tenant_id: 't-1'};
    expect(validateStarfleetStep1(user)).toBe(false);
    expect(validateStarfleetStep1({...user, is_signed_in: false})).toBe(true);
    expect(validateStarfleetStep1({...user, tenant_id: ''})).toBe(true);
    const managed = {name: 'mydb', region: 'us-east-2',
      size: 'small', pg_version: '18', ip_allowlist: '198.51.100.7', role: 'admin'};
    expect(validateStarfleetStep2(managed)).toBe(false);
    expect(validateStarfleetStep2({...managed, ip_allowlist: ''})).toBe(true);
    expect(validateStarfleetStep2({...managed, display_name: 'x'.repeat(26)})).toBe(true);
    expect(validateStarfleetStep2({...managed, size: ''})).toBe(true);
    expect(validateStarfleetStep2({...managed, pg_version: ''})).toBe(true);
    const nodeInfo = {server_group: {_id: 3}};
    const dbDetails = {};
    expect(validateStarfleetStep3(dbDetails, nodeInfo)).toBe(false);
    expect(dbDetails.gid).toBe(3);
  });

  it('shows the size label in the summary, falling back to its id', ()=>{
    const inst = {name: 'mydb', pg_version: '18',
      region: 'us-east-2', size: 'small', ip_allowlist: '198.51.100.7',
      role: 'admin'};
    const sizeRow = (i)=>getStarfleetSummary('starfleet', i)[0]
      .find((r)=>r.name == 'Size');
    expect(sizeRow(inst).value).toBe('small');
    expect(sizeRow({...inst, size_label: 'Small (1 vCPU)'}).value).toBe('Small (1 vCPU)');
  });

  describe('instance schema', ()=>{
    beforeEach(()=>{ genericBeforeEach(); });
    it('renders in create mode', async ()=>{
      const schema = new StarfleetInstanceSchema({
        regions: ()=>Promise.resolve([]), sizes: ()=>Promise.resolve([]),
        pgVersions: ()=>Promise.resolve([]),
      }, {ip_allowlist: '198.51.100.7'});
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

    it('renders once the client IP has loaded', async ()=>{
      const Details = withBrowser(StarfleetInstanceDetails);
      const setData = jest.fn();
      await act(async ()=>{
        render(<Details cloudProvider='starfleet' nodeInfo={{}} nodeData={{}}
          starfleetInstanceData={{}} setStarfleetInstanceData={setData}/>);
      });
      expect(await screen.findByText('Region')).toBeInTheDocument();
      expect(screen.getByText('Size')).toBeInTheDocument();
    });
  });

  it('sends only the API client credentials in the deployment request', ()=>{
    expect(starfleetSecret({auth_method: 'user', client_id: 'a',
      client_secret: 'b', tenant_id: 't-1'})).toEqual({auth_method: 'user'});
    expect(starfleetSecret({auth_method: 'api_client', client_id: 'a',
      client_secret: 'b', is_signed_in: false})).toEqual(
      {auth_method: 'api_client', client_id: 'a', client_secret: 'b'});
  });

  it('escapes what Auth0 sends in the sign-in note', ()=>{
    const note = signInNote({user_code: '<b>X</b>',
      verification_uri: 'https://auth.example.com/activate?a=1&b="2"'});
    expect(note).not.toContain('<b>X');
    expect(note).toContain('&lt;b&gt;X&lt;/b&gt;');
    expect(note).toContain('href="https://auth.example.com/activate?a=1&amp;b=&quot;2&quot;"');
    expect(signInNote({user_code: 'X', verification_uri: 'https://a.example/',
      verification_uri_complete: 'https://a.example/?c=X'}))
      .toContain('href="https://a.example/?c=X"');
    expect(signInNote({})).toBe('');
    expect(signInNote({is_signed_in: true})).toContain('Signed in');
  });

  describe('sign-in', ()=>{
    let networkMock;
    beforeEach(()=>{
      jest.useFakeTimers();
      networkMock = new MockAdapter(axios);
      networkMock.onPost(url_for('starfleet.signin_start')).reply(200, {data: {
        user_code: 'ABCD-EFGH', interval: 5,
        verification_uri: 'https://auth.example.com/activate'}});
    });
    afterEach(()=>{
      networkMock.restore();
      jest.useRealTimers();
    });

    // Let the pending requests and promise callbacks run.
    const flush = async ()=>{
      for (let i = 0; i < 10; i++) await Promise.resolve();
      await new Promise(jest.requireActual('timers').setImmediate);
    };

    it('polls at the interval pgAdmin gives until the sign-in completes', async ()=>{
      const replies = [{status: 'pending', interval: 10},
        {status: 'complete', tenant_id: 't-1', tenants: [{value: 't-1', label: 't-1'}]}];
      const polls = [];
      networkMock.onPost(url_for('starfleet.signin_poll')).reply(()=>{
        polls.push(Date.now());
        return [200, {data: replies.shift()}];
      });
      const onCode = jest.fn();
      let result;
      signInToStarfleet(onCode).then((r)=>{ result = r; });
      await flush();
      expect(onCode).toHaveBeenCalledWith(expect.objectContaining({user_code: 'ABCD-EFGH'}));
      jest.advanceTimersByTime(4999);
      await flush();
      expect(polls.length).toBe(0);
      jest.advanceTimersByTime(1);
      await flush();
      expect(polls.length).toBe(1);
      // The next poll waits for the longer interval it was given.
      jest.advanceTimersByTime(9999);
      await flush();
      expect(polls.length).toBe(1);
      jest.advanceTimersByTime(1);
      await flush();
      expect(polls.length).toBe(2);
      expect(result).toEqual(expect.objectContaining({tenant_id: 't-1'}));
    });

    it('rejects with the message when the sign-in ends without tokens', async ()=>{
      networkMock.onPost(url_for('starfleet.signin_poll')).reply(200,
        {data: {status: 'denied', message: 'The sign-in was refused'}});
      let error;
      signInToStarfleet(()=>{/* not needed */}).catch((e)=>{ error = e; });
      await flush();
      jest.advanceTimersByTime(5000);
      await flush();
      expect(error.message).toBe('The sign-in was refused');
    });

    it('stops polling once cancelled', async ()=>{
      const poll = jest.fn(()=>[200, {data: {status: 'pending', interval: 5}}]);
      networkMock.onPost(url_for('starfleet.signin_poll')).reply(poll);
      let cancelled = false;
      let result;
      signInToStarfleet(()=>{/* not needed */}, ()=>cancelled)
        .then((r)=>{ result = r; });
      await flush();
      cancelled = true;
      jest.advanceTimersByTime(5000);
      await flush();
      expect(poll).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  it('verifies the credentials the user chose', async ()=>{
    const networkMock = new MockAdapter(axios);
    networkMock.onPost(url_for('starfleet.select_tenant')).reply(200, {data: {}});
    networkMock.onPost(url_for('starfleet.verify_credentials')).reply(200, {data: {}});
    await verifyStarfleetCredentials({auth_method: 'user', tenant_id: 't-1',
      client_secret: 'stale'});
    await verifyStarfleetCredentials({auth_method: 'api_client',
      client_id: 'a', client_secret: 'b', tenant_id: 't-1'});
    expect(JSON.parse(networkMock.history.post[0].data)).toEqual({tenant_id: 't-1'});
    expect(JSON.parse(networkMock.history.post[1].data)).toEqual(
      {cloud: 'starfleet', secret: {client_id: 'a', client_secret: 'b'}});
    networkMock.restore();
  });

  describe('credentials step', ()=>{
    let networkMock;
    beforeEach(()=>{
      genericBeforeEach();
      networkMock = new MockAdapter(axios);
    });
    afterEach(()=>{ networkMock.restore(); });

    const renderCredentials = async (userSignin)=>{
      networkMock.onGet(url_for('starfleet.signin_options')).reply(200,
        {data: {user_signin: userSignin}});
      const Credentials = withBrowser(StarfleetCredentials);
      const setData = jest.fn();
      await act(async ()=>{
        render(<Credentials cloudProvider='starfleet' setStarfleetCredData={setData}/>);
      });
      return setData;
    };

    it('offers the choice and defaults to signing in when available', async ()=>{
      await renderCredentials(true);
      expect(await screen.findByText('API client credentials')).toBeInTheDocument();
      expect(screen.getByText('Sign in with pgEdge')).toBeInTheDocument();
      expect(screen.getByRole('button', {name: 'Sign in'})).toBeInTheDocument();
      expect(screen.queryByText('Auth secret')).not.toBeInTheDocument();
    });

    it('asks only for the API client credentials without user sign-in', async ()=>{
      await renderCredentials(false);
      expect((await screen.findAllByText('Auth secret')).length).toBeGreaterThan(0);
      expect(screen.queryByText('Sign in with pgEdge')).not.toBeInTheDocument();
    });
  });

  describe('credentials schema', ()=>{
    beforeEach(()=>{ genericBeforeEach(); });

    it('shows the code, then the tenants once signed in', async ()=>{
      let finish;
      const signIn = jest.fn((onCode)=>{
        onCode({user_code: 'ABCD-EFGH',
          verification_uri: 'https://auth.example.com/activate'});
        return new Promise((resolve)=>{ finish = resolve; });
      });
      const schema = new StarfleetCredSchema({userSignin: true, signIn});
      const {user} = await getCreateView(schema);
      await user.click(screen.getByRole('button', {name: 'Sign in'}));
      expect(await screen.findByText('ABCD-EFGH')).toBeInTheDocument();
      expect(screen.getByRole('link', {name: 'https://auth.example.com/activate'}))
        .toHaveAttribute('target', '_blank');
      expect(signIn).toHaveBeenCalledTimes(1);
      await act(async ()=>{
        finish({tenant_id: 't-1', tenants: [
          {value: 't-1', label: 'Acme (t-1)'}, {value: 't-2', label: 't-2'}]});
      });
      expect(await screen.findByText('Signed in to pgEdge Starfleet.')).toBeInTheDocument();
      expect(screen.getByText('Tenant')).toBeInTheDocument();
      expect(screen.queryByText('ABCD-EFGH')).not.toBeInTheDocument();
    });
  });
});
