/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Only the schema that ChangePasswordContent builds is under test here, so
// SchemaView is replaced with a stub that records the props it receives.
const mockSchemaViewProps = [];
jest.mock('../../../pgadmin/static/js/SchemaView', () => ({
  __esModule: true,
  default: (props) => {
    mockSchemaViewProps.push(props);
    return null;
  },
}));

import { render } from '@testing-library/react';
import ChangePasswordContent, { ChangePasswordSchema } from '../../../pgadmin/static/js/Dialogs/ChangePasswordContent';

function currentPasswordField(schema) {
  return schema.baseFields.find((f) => f.id === 'password');
}

function renderedSchema(props) {
  mockSchemaViewProps.length = 0;
  render(<ChangePasswordContent onSave={jest.fn()} onClose={jest.fn()} {...props} />);
  return mockSchemaViewProps[mockSchemaViewProps.length - 1].schema;
}

describe('ChangePasswordContent', () => {
  it('requires the current password when no pgpass file is used', () => {
    const schema = renderedSchema({userName: 'postgres'});
    const field = currentPasswordField(schema);

    expect(schema.isPgpassFileUsed).toBe(false);
    expect(field.disabled).toBe(false);
    expect(field.noEmpty).toBe(true);
  });

  it('disables and does not require the current password when a pgpass file is used', () => {
    const schema = renderedSchema({userName: 'postgres', isPgpassFileUsed: true});
    const field = currentPasswordField(schema);

    expect(schema.isPgpassFileUsed).toBe(true);
    expect(field.disabled).toBe(true);
    expect(field.noEmpty).toBe(false);
  });
});

describe('ChangePasswordSchema', () => {
  it('flags mismatched new passwords', () => {
    const schema = new ChangePasswordSchema('postgres', false);
    const setError = jest.fn();

    expect(schema.validate({newPassword: 'a', confirmPassword: 'b'}, setError)).toBe(true);
    expect(setError).toHaveBeenCalledWith('confirmPassword', 'Passwords do not match.');
  });
});
