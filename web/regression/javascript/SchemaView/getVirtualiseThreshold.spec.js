/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { getVirtualiseThreshold }
  from 'sources/SchemaView/DataGridView/grid';

describe('getVirtualiseThreshold', ()=>{
  it('scales inversely with the visible column count', ()=>{
    expect(getVirtualiseThreshold(4)).toBe(175);
    expect(getVirtualiseThreshold(7)).toBe(100);
    expect(getVirtualiseThreshold(14)).toBe(50);
  });

  it('never goes above 400, however few the columns', ()=>{
    expect(getVirtualiseThreshold(1)).toBe(400);
    expect(getVirtualiseThreshold(2)).toBe(350);
  });

  it('never goes below 25, however many the columns', ()=>{
    expect(getVirtualiseThreshold(28)).toBe(25);
    expect(getVirtualiseThreshold(200)).toBe(25);
  });

  it('uses a middling default when no columns are reported yet', ()=>{
    expect(getVirtualiseThreshold(0)).toBe(100);
    expect(getVirtualiseThreshold(undefined)).toBe(100);
  });
});
