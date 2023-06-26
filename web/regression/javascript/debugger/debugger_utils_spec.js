//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import {
  getProcedureId,
  getFunctionId,
} from '../../../pgadmin/tools/debugger/static/js/debugger_utils';

describe('getProcedureId', function () {
  let treeInfroProc = {
    'procedure': {
      '_id': 123,
    },
  };
  let treeInfroInvalidProcId = {
    'procedure': {
      '_id': null,
    },
  };
  let treeInfroEdbProc = {
    'edbproc': {
      '_id': 321,
    },
  };
  let fakeTreeInfro;

  describe('Should return proper object id', function () {
    it('returns valid procedure id', function () {
      expect(getProcedureId(treeInfroProc)).toEqual(123);
    });

    it('returns valid edbproc id', function () {
      expect(getProcedureId(treeInfroEdbProc)).toEqual(321);
    });

    it('returns undefined for fake tree info', function () {
      expect(getProcedureId(fakeTreeInfro)).toEqual(undefined);
    });

    it('returns undefined for invalid procedure id', function () {
      expect(getProcedureId(treeInfroInvalidProcId)).toEqual(undefined);
    });
  });
});

describe('getFunctionId', function () {
  let treeInfroFunc = {
    'function': {
      '_id': 123,
    },
  };
  let treeInfroInvalidFuncId = {
    'function': {
      '_id': null,
    },
  };

  let fakeTreeInfro;

  describe('Should return proper object id', function () {
    it('returns valid function id', function () {
      expect(getFunctionId(treeInfroFunc)).toEqual(123);
    });

    it('returns undefined for fake tree info', function () {
      expect(getFunctionId(fakeTreeInfro)).toEqual(undefined);
    });

    it('returns undefined for invalid function id', function () {
      expect(getFunctionId(treeInfroInvalidFuncId)).toEqual(undefined);
    });
  });
});
