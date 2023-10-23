/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import ERDModel from 'pgadmin.tools.erd/erd_tool/ERDModel';

describe('ERDModel', ()=>{
  it('getNodesDict', ()=>{
    let model = new ERDModel();

    jest.spyOn(model, 'getNodes').mockReturnValue([
      {
        name: 'test1',
        getID: function() {
          return 'id1';
        },
      },
      {
        name: 'test2',
        getID: function() {
          return 'id2';
        },
      },
    ]);
    expect(JSON.stringify(model.getNodesDict())).toBe(JSON.stringify({
      'id1': {name: 'test1'},
      'id2': {name: 'test2'},
    }));
  });
});
