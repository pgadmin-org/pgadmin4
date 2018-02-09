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
    describe('when responseJSON is not present', () => {
      it('should return false', () => {
        expect(is_new_transaction_required({
          status: 404,
        })).toBeFalsy();
      });
    });

    describe('when responseJSON is present', () => {
      describe('when info is not present inside responseJSON', () => {
        it('should return false', () => {
          expect(is_new_transaction_required({
            status: 404,
            responseJSON: {},
          })).toBeFalsy();
        });
      });

      describe('when info is present inside responseJSON', () => {
        describe('when info value is not "DATAGRID_TRANSACTION_REQUIRED"', () => {
          it('should return false', () => {
            expect(is_new_transaction_required({
              status: 404,
              responseJSON: {
                info: 'some information',
              },
            })).toBe(false);
          });
        });

        describe('when info value is "DATAGRID_TRANSACTION_REQUIRED"', () => {
          it('should return false', () => {
            expect(is_new_transaction_required({
              status: 404,
              responseJSON: {
                info: 'DATAGRID_TRANSACTION_REQUIRED',
              },
            })).toBe(true);
          });
        });
      });
    });
  });
});
