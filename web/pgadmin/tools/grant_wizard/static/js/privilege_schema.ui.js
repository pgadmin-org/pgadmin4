import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { registerSchema } from 'sources/SchemaView/SchemaState';

class PrivilegeSchema extends BaseUISchema {
  constructor(getPrivilegeRoleSchema, fieldOptions = {}, initValues={}) {
    super({
      oid: null,
      privilege: [],
      ...initValues
    });

    this.privilegeRoleSchema = getPrivilegeRoleSchema([]);
    this.fieldOptions = {
      ...fieldOptions,
    };
  }

  get idAttribute() {
    return 'oid';
  }

  get baseFields() {
    return [
      {
        id: 'privilege', label: gettext('Privileges'), type: 'collection',
        schema: this.privilegeRoleSchema,
        uniqueCol: ['grantee'],
        editable: false, mode: ['create'],
        canAdd: true, canDelete: true,
      }
    ];
  }

}
export default registerSchema(PrivilegeSchema);

