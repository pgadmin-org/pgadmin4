/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import current_user from 'pgadmin.user_management.current_user';
import pgAdmin from 'sources/pgadmin';
import { AdHocConnectionSchema } from '../../../../pgadmin/misc/workspaces/static/js/AdHocConnection';
import { AllPermissionTypes } from '../../../../pgadmin/browser/static/js/constants';

describe('AdHocConnectionSchema', () => {
  let origPermissions;

  const createSchema = (permissions) => {
    current_user.permissions = permissions;
    return new AdHocConnectionSchema(jest.fn(), pgAdmin);
  };
  const getField = (schema, id) => schema.baseFields.find((f) => f.id == id);
  const routingFields = ['server_name', 'host', 'port', 'service'];

  beforeEach(() => {
    origPermissions = current_user.permissions;
  });

  afterEach(() => {
    current_user.permissions = origPermissions;
  });

  describe('with Manage Server', () => {
    let schema;
    beforeEach(() => {
      schema = createSchema([AllPermissionTypes.OBJECT_REGISTER_SERVER]);
    });

    it('keeps the existing server optional', () => {
      expect(schema.canRegisterServer).toBe(true);
      expect(getField(schema, 'sid').label).toBe('Existing Server (Optional)');
      expect(getField(schema, 'sid').helpMessage).toBeUndefined();
    });

    it('lets the connection fields be edited until a server is selected', () => {
      routingFields.forEach((id) => {
        const field = getField(schema, id);
        expect(field.disabled({sid: null})).toBeFalsy();
        expect(field.disabled({sid: 5})).toBeTruthy();
      });
    });

    it('does not require a server', () => {
      const setError = jest.fn();
      schema.validate({host: 'example.com', port: 5432, did: 'db', user: 'u'}, setError);
      expect(setError).not.toHaveBeenCalledWith('sid', expect.anything());
    });

    it('keeps the routing connection parameters', () => {
      const params = [{name: 'hostaddr', value: '10.0.0.1'}, {name: 'sslmode', value: 'require'}];
      expect(schema.withoutRoutingParams(params)).toEqual(params);
      expect(schema.getConnectionParameterOptions().map((o) => o.value)).toContain('hostaddr');
    });
  });

  describe('without Manage Server', () => {
    let schema;
    beforeEach(() => {
      schema = createSchema([]);
    });

    it('requires an existing server and says why', () => {
      expect(schema.canRegisterServer).toBe(false);
      expect(getField(schema, 'sid').label).toBe('Existing Server');
      expect(getField(schema, 'sid').helpMessage).toMatch(/Manage Server/);
    });

    it('disables the connection fields even when no server is selected', () => {
      routingFields.forEach((id) => {
        const field = getField(schema, id);
        expect(field.disabled({sid: null})).toBeTruthy();
        expect(field.disabled({sid: 5})).toBeTruthy();
      });
    });

    it('fails validation until an existing server is selected', () => {
      const setError = jest.fn();
      expect(schema.validate({host: 'example.com', port: 5432, did: 'db', user: 'u'}, setError)).toBe(true);
      expect(setError).toHaveBeenCalledWith('sid', expect.stringMatching(/Manage Server/));

      setError.mockClear();
      expect(schema.validate({sid: 5, host: 'example.com', port: 5432, did: 'db', user: 'u'}, setError)).toBe(false);
      expect(setError).toHaveBeenCalledWith('sid', null);
    });

    it('does not offer or pre-fill the routing connection parameters', () => {
      const params = [
        {name: 'host', value: 'a'}, {name: 'hostaddr', value: '10.0.0.1'},
        {name: 'port', value: '1'}, {name: 'service', value: 's'},
        {name: 'sslmode', value: 'require'},
      ];
      expect(schema.withoutRoutingParams(params)).toEqual([{name: 'sslmode', value: 'require'}]);
      expect(schema.withoutRoutingParams(null)).toBeNull();

      const offered = schema.getConnectionParameterOptions().map((o) => o.value);
      expect(offered).not.toContain('hostaddr');
      expect(offered).toContain('sslmode');
    });
  });
});
