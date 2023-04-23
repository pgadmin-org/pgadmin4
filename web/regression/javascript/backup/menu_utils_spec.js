/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import {menuEnabledServer} from '../../../pgadmin/tools/backup/static/js/menu_utils';

const context = describe;

describe('backup.menuUtils', () => {
  describe('#menuEnabledServer', () => {
    context('provided node data is undefined', () => {
      it('returns false', () => {
        expect(menuEnabledServer(undefined)).toEqual(false);
      });
    });

    context('provided node data is null', () => {
      it('returns false', () => {
        expect(menuEnabledServer(null)).toEqual(false);
      });
    });

    context('current node type is not of the type server', () => {
      it('returns false', () => {
        expect(menuEnabledServer({_type: 'schema'})).toEqual(false);
      });
    });

    context('current node type is of the type server', () => {
      context('is connected', () => {
        it('returns true', () => {
          expect(menuEnabledServer({
            _type: 'server',
            connected: true,
          })).toEqual(true);
        });
      });
      context('is not connected', () => {
        it('returns false', () => {
          expect(menuEnabledServer({
            _type: 'server',
            connected: false,
          })).toEqual(false);
        });
      });
    });
  });
});

