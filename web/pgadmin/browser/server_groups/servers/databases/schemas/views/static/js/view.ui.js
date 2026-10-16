/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import SecLabelSchema from '../../../../../static/js/sec_label.ui';
import { isEmptyString } from 'sources/validators';
import { getPrivilegesForTableAndLikeObjects } from '../../../tables/static/js/table.ui';

// A character that may appear in an unquoted identifier, and so cannot
// immediately precede the start of a dollar-quoted string or an E'' string's
// prefix.
const IDENT_CHAR = /[A-Za-z0-9_$\u0080-\uffff]/;
const DOLLAR_TAG = /\$(?:[A-Za-z_\u0080-\uffff][A-Za-z0-9_\u0080-\uffff]*)?\$/y;

/*
 * Split a view definition into plain SQL and quoted parts, in the same shape
 * as String.split() with one capturing group: even indexes hold plain SQL and
 * odd indexes hold a quoted identifier, string literal or dollar-quoted string
 * exactly as written. This follows PostgreSQL's lexer: '' and "" are escaped
 * quotes, E'' strings also take backslash escapes, block comments nest, and a
 * $ that continues an identifier does not start a dollar-quoted string.
 * Comments are replaced with a space in the plain SQL. A construct left
 * unterminated runs to the end of the definition. This must stay in step with
 * ViewNode._tokenise_definition() on the server.
 */
function tokeniseViewDefinition(definition) {
  const followsIdent = (pos) => pos > 0 && IDENT_CHAR.test(definition[pos - 1]);
  const n = definition.length;
  let parts = [''];
  let i = 0;
  while (i < n) {
    const ch = definition[i];
    let pair = definition.slice(i, i + 2);
    if (pair == '--') {
      const end = definition.indexOf('\n', i);
      i = end < 0 ? n : end;
      parts[parts.length - 1] += ' ';
    } else if (pair == '/*') {
      let depth = 1;
      i += 2;
      while (i < n && depth) {
        pair = definition.slice(i, i + 2);
        if (pair == '/*') {
          depth += 1;
          i += 2;
        } else if (pair == '*/') {
          depth -= 1;
          i += 2;
        } else {
          i += 1;
        }
      }
      parts[parts.length - 1] += ' ';
    } else if (ch == '"' || ch == '\'') {
      const escapes = ch == '\'' && i > 0 && 'eE'.includes(definition[i - 1]) &&
        !followsIdent(i - 1);
      let j = i + 1;
      while (j < n) {
        if (escapes && definition[j] == '\\') {
          j += 2;
        } else if (definition[j] != ch) {
          j += 1;
        } else if (definition[j + 1] == ch) {
          j += 2;
        } else {
          break;
        }
      }
      j = Math.min(j + 1, n);
      parts.push(definition.slice(i, j), '');
      i = j;
    } else {
      let tag = null;
      if (ch == '$' && !followsIdent(i)) {
        DOLLAR_TAG.lastIndex = i;
        tag = DOLLAR_TAG.exec(definition);
      }
      if (tag === null) {
        parts[parts.length - 1] += ch;
        i += 1;
        continue;
      }
      const end = definition.indexOf(tag[0], i + tag[0].length);
      const j = end < 0 ? n : end + tag[0].length;
      parts.push(definition.slice(i, j), '');
      i = j;
    }
  }
  return parts;
}

/*
 * Split a view definition at each FROM keyword and normalise the parts so
 * that only changes that can affect the view's columns are noticed. The
 * contents of quoted identifiers and string literals are kept exactly as
 * written, although the double quotes around an identifier are dropped so
 * that "name" still matches name. Everything else is lower-cased (SQL
 * keywords, function names, type names and unquoted identifiers are
 * case-insensitive) and has its whitespace removed, so a pure reformat (for
 * example with the SQL formatter, which can change keyword, function and data
 * type case) does not look like a change to the column list. FROM is only
 * matched as a whole word outside quotes and comments, so identifiers such as
 * valid_from, and comments such as /* from *\/, do not end the select list
 * early.
 */
export function splitViewDefinition(definition) {
  let segments = [''];
  tokeniseViewDefinition(definition ?? '').forEach((part, i) => {
    if (i % 2 == 1) {
      segments[segments.length - 1] += part.startsWith('"') ?
        part.slice(1, -1) : part;
      return;
    }
    let pieces = part.toLowerCase().split(/\bfrom\b/).map(
      (piece) => piece.replace(/\s/g, '')
    );
    segments[segments.length - 1] += pieces[0];
    segments.push(...pieces.slice(1));
  });
  return segments;
}

export default class ViewSchema extends BaseUISchema {
  constructor(getPrivilegeRoleSchema, nodeInfo, fieldOptions={}, initValues={}) {
    super({
      owner: undefined,
      schema: undefined,
      ...initValues
    });
    this.getPrivilegeRoleSchema = getPrivilegeRoleSchema;
    this.nodeInfo = nodeInfo;
    this.warningText = null;
    this.fieldOptions = {
      role: [],
      schema: [],
      ...fieldOptions,
    };

  }

  get idAttribute() {
    return 'oid';
  }

  notInSchema() {
    return this.nodeInfo && 'catalog' in this.nodeInfo;
  }


  get baseFields() {
    let obj = this;
    return [{
      id: 'name', label: gettext('Name'), cell: 'text',
      type: 'text', disabled: obj.notInSchema, noEmpty: true,
    },{
      id: 'oid', label: gettext('OID'), cell: 'text',
      type: 'text', mode: ['properties'],
    },{
      id: 'owner', label: gettext('Owner'), cell: 'text',
      node: 'role', disabled: obj.notInSchema,
      type: 'select', controlProps: { allowClear: false },
      options: obj.fieldOptions.role
    },{
      id: 'schema', label: gettext('Schema'), cell: 'text',
      type: 'select', disabled: obj.notInSchema, mode: ['create', 'edit'],
      controlProps: {
        allowClear: false,
        first_empty: false,
      },
      options: obj.fieldOptions.schema
    },{
      id: 'system_view', label: gettext('System view?'), cell: 'text',
      type: 'switch', mode: ['properties'],
    },{
      id: 'acl', label: gettext('Privileges'),
      mode: ['properties'], type: 'text', group: gettext('Security'),
    },{
      id: 'comment', label: gettext('Comment'), cell: 'text',
      type: 'multiline', disabled: obj.notInSchema,
    },{
      id: 'security_barrier', label: gettext('Security barrier?'),
      type: 'switch', min_version: '90200', group: gettext('Definition'),
      disabled: obj.notInSchema,
    },{
      id: 'security_invoker', label: gettext('Security invoker?'),
      type: 'switch', min_version: '150000', group: gettext('Definition'),
      disabled: obj.notInSchema,
    },{
      id: 'check_option', label: gettext('Check options'),
      type: 'select', group: gettext('Definition'),
      min_version: '90400', mode:['properties', 'create', 'edit'],
      controlProps: {
        allowClear: false,
      }, disabled: obj.notInSchema,
      options:[{
        label: gettext('No'), value: 'no',
      },{
        label: gettext('Local'), value: 'local',
      },{
        label: gettext('Cascaded'), value: 'cascaded',
      }],
    },{
      id: 'definition', label: gettext('Code'), cell: 'text',
      type: 'sql', mode: ['create', 'edit'], group: gettext('Code'),
      isFullTab: true,
      controlProps: { readOnly: obj.nodeInfo && 'catalog' in obj.nodeInfo },
    },

    {
      id: 'datacl', label: gettext('Privileges'), type: 'collection',
      schema: this.getPrivilegeRoleSchema(getPrivilegesForTableAndLikeObjects(this.getServerVersion())),
      uniqueCol : ['grantee'],
      editable: false,
      group: gettext('Security'), mode: ['edit', 'create'],
      canAdd: true, canDelete: true,
    },
    {
    // Add Security Labels Control
      id: 'seclabels', label: gettext('Security labels'),
      schema: new SecLabelSchema(),
      editable: false, type: 'collection',
      canEdit: false, group: gettext('Security'), canDelete: true,
      mode: ['edit', 'create'], canAdd: true,
      uniqueCol : ['provider'],
    }
    ];
  }

  validate(state, setError) {
    let errmsg = null;
    let obj = this;
    if (isEmptyString(state.service)) {

      /* view definition validation*/
      if (isEmptyString(state.definition)) {
        errmsg = gettext('Please enter view code.');
        setError('definition', errmsg);
        return true;
      } else {
        setError('definition', null);
      }

      if (state.definition) {
        if (!(
          obj.nodeInfo.server.server_type == 'pg' &&
          // No need to check this when creating a view
          !_.isUndefined(obj.sessData.oid)
        ) || (
          state.definition === obj.origData.definition
        )) {
          obj.warningText = null;
          return false;
        }

        let old_def = splitViewDefinition(obj.origData.definition),
          new_def = [];

        if (!_.isUndefined(state.definition)) {
          new_def = splitViewDefinition(state.definition);
        }

        if ((old_def.length != new_def.length) || (
          old_def.length > 1 && (
            old_def[0] != new_def[0]
          )
        )) {
          obj.warningText = gettext(
            'Changing the columns in a view requires dropping and re-creating the view. This may fail if other objects are dependent upon this view, or may cause procedural functions to fail if they are not modified to take account of the changes.'
          ) + '<br><br><b>' + gettext('Do you wish to continue?') +
          '</b>';
        } else {
          obj.warningText = null;
        }
        return false;
      }

    } else {
      _.each(['definition'], (item) => {
        setError(item, null);
      });
    }
  }
}
