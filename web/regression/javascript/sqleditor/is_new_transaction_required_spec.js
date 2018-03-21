//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

import {is_new_transaction_required} from '../../../pgadmin/static/js/sqleditor/is_new_transaction_required';

describe('#is_new_transaction_required', () => {
  describe('when status is not 404', () => {
    it('should return false', () => {
      expect(is_new_transaction_required({
        status: 300,
      })).toBe(false);
    });
  });

  describe('when status is 404', () => {
    describe('when data is not present', () => {
      it('should return false', () => {
        expect(is_new_transaction_required({
          status: 404,
        })).toBeFalsy();
      });
    });

    describe('when data is present', () => {
      describe('when info is not present inside data', () => {
        it('should return false', () => {
          expect(is_new_transaction_required({
            status: 404,
            data: {},
          })).toBeFalsy();
        });
      });

      describe('when info is present inside data', () => {
        describe('when info value is not "DATAGRID_TRANSACTION_REQUIRED"', () => {
          it('should return false', () => {
            expect(is_new_transaction_required({
              status: 404,
              data: {
                info: 'some information',
              },
            })).toBe(false);
          });
        });

        describe('when info value is "DATAGRID_TRANSACTION_REQUIRED"', () => {
          it('should return false', () => {
            expect(is_new_transaction_required({
              status: 404,
              data: {
                info: 'DATAGRID_TRANSACTION_REQUIRED',
              },
            })).toBe(true);
          });
        });
      });
    });
  });
});
