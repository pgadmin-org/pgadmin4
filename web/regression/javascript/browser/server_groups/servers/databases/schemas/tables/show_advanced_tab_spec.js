/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {show_advanced_tab} from '../../../../../../../../pgadmin/browser/server_groups/servers/databases/schemas/tables/static/js/show_advanced_tab';

describe('#show_advanced_tab', () => {
  let tableModel;

  describe('when node information is not available', () => {
    it('should return true', () => {
      tableModel = {};

      expect(show_advanced_tab(tableModel)).toEqual(true);
    });
  });

  describe('when node information is available', () => {
    describe('when server is not defined', () => {
      it('should return true', () => {
        tableModel = {
          node_info: {},
        };

        expect(show_advanced_tab(tableModel)).toEqual(true);
      });
    });

    describe('when server is defined', () => {
      describe('when server is green plum', () => {
        it('should return false', () => {
          tableModel = {
            node_info: {
              server: {
                server_type: 'gpdb',
              },
            },
          };

          expect(show_advanced_tab(tableModel)).toEqual(false);
        });
      });

      describe('when server is Postgres', () => {
        it('should return true', () => {
          tableModel = {
            node_info: {
              server: {
                server_type: 'postgres',
              },
            },
          };

          expect(show_advanced_tab(tableModel)).toEqual(true);
        });
      });
    });
  });
});
