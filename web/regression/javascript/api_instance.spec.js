/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import MockAdapter from 'axios-mock-adapter';
import axios from 'axios';
import getApiInstance, {getInflight} from 'sources/api_instance';

describe('getInflight', ()=>{
  let networkMock;

  beforeEach(()=>{
    networkMock = new MockAdapter(axios);
    networkMock.onGet('/types/').reply(200, {data: [{label: 'text'}]});
    networkMock.onGet('/broken/').reply(500, {errormsg: 'nope'});
  });

  afterEach(()=>{
    networkMock.restore();
  });

  it('shares one request among concurrent callers', async ()=>{
    // Every getNodeAjaxOptions() call builds its own api instance, so the
    // shared request has to survive distinct-but-identically-configured ones.
    const [res1, res2] = await Promise.all([
      getInflight(getApiInstance(), '/types/', {params: {tid: 1}}),
      getInflight(getApiInstance(), '/types/', {params: {tid: 1}}),
    ]);

    expect(networkMock.history.get.length).toBe(1);
    expect(res1.data).toEqual({data: [{label: 'text'}]});
    expect(res2).toBe(res1);
  });

  it('ignores param order when matching', async ()=>{
    await Promise.all([
      getInflight(getApiInstance(), '/types/', {params: {tid: 1, scid: 2}}),
      getInflight(getApiInstance(), '/types/', {params: {scid: 2, tid: 1}}),
    ]);

    expect(networkMock.history.get.length).toBe(1);
  });

  it('does not share requests with different params', async ()=>{
    await Promise.all([
      getInflight(getApiInstance(), '/types/', {params: {tid: 1}}),
      getInflight(getApiInstance(), '/types/', {params: {tid: 2}}),
    ]);

    expect(networkMock.history.get.length).toBe(2);
  });

  it('does not share requests with different URLSearchParams', async ()=>{
    await Promise.all([
      getInflight(getApiInstance(), '/types/', {
        params: new URLSearchParams([['tid', '1']]),
      }),
      getInflight(getApiInstance(), '/types/', {
        params: new URLSearchParams([['tid', '2']]),
      }),
    ]);

    expect(networkMock.history.get.length).toBe(2);
    expect(
      networkMock.history.get.map((r)=>r.params.toString()).sort()
    ).toEqual(['tid=1', 'tid=2']);
  });

  it('does not share requests serialised differently', async ()=>{
    await Promise.all([
      getInflight(getApiInstance(), '/types/', {
        params: {tid: 1},
        paramsSerializer: {serialize: ()=>'tid=1'},
      }),
      getInflight(getApiInstance(), '/types/', {
        params: {tid: 1},
        paramsSerializer: {serialize: ()=>'tid=2'},
      }),
    ]);

    expect(networkMock.history.get.length).toBe(2);
  });

  it('does not share requests with different instance headers', async ()=>{
    await Promise.all([
      getInflight(getApiInstance(), '/types/', {params: {tid: 1}}),
      getInflight(
        getApiInstance({'Content-Encoding': 'gzip'}), '/types/',
        {params: {tid: 1}}
      ),
    ]);

    expect(networkMock.history.get.length).toBe(2);
  });

  it('does not share requests with different per-request headers', async ()=>{
    await Promise.all([
      getInflight(getApiInstance(), '/types/', {
        params: {tid: 1}, headers: {'X-Test': 'a'},
      }),
      getInflight(getApiInstance(), '/types/', {
        params: {tid: 1}, headers: {'X-Test': 'b'},
      }),
    ]);

    expect(networkMock.history.get.length).toBe(2);
  });

  it('never shares requests carrying unkeyed config', async ()=>{
    // responseType changes what the caller gets back, so these two must not
    // be handed the same response even though url and params match.
    await Promise.all([
      getInflight(getApiInstance(), '/types/', {
        params: {tid: 1}, responseType: 'text',
      }),
      getInflight(getApiInstance(), '/types/', {
        params: {tid: 1}, responseType: 'text',
      }),
    ]);

    expect(networkMock.history.get.length).toBe(2);
  });

  it('fetches again once the shared request has settled', async ()=>{
    await getInflight(getApiInstance(), '/types/', {params: {tid: 1}});
    await getInflight(getApiInstance(), '/types/', {params: {tid: 1}});

    expect(networkMock.history.get.length).toBe(2);
  });

  it('rejects every caller and retries after a failure', async ()=>{
    const attempts = [
      getInflight(getApiInstance(), '/broken/'),
      getInflight(getApiInstance(), '/broken/'),
    ];

    await expect(attempts[0]).rejects.toThrow();
    await expect(attempts[1]).rejects.toThrow();
    expect(networkMock.history.get.length).toBe(1);

    // The failed entry must not stick around and poison later callers.
    await expect(
      getInflight(getApiInstance(), '/broken/')
    ).rejects.toThrow();
    expect(networkMock.history.get.length).toBe(2);
  });
});
