//////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { SCHEMA_STATE_ACTIONS } from 'sources/SchemaView';
import { getNodeListByName } from '../../../../../../static/js/node_ajax';
import { isEmptyString } from 'sources/validators';

export function getNodePgtChainTaskSchema(treeNodeInfo, itemNodeData) {
  const paramSchema = new (class extends BaseUISchema {
    constructor() {
      super({ order_id: null, value: '' });
    }
    get idAttribute() { return 'order_id'; }
    get baseFields() {
      return [
        { id: 'order_id', label: gettext('Order'), type: 'int', noEmpty: true, cell: 'int', width: 20 },
        { id: 'value', label: gettext('Value'), type: 'multiline', cell: 'text' },
      ];
    }
    validate(state, setError) {
      if (!state.order_id || state.order_id < 1) {
        setError('order_id', gettext('Order must be a positive integer.'));
        return true;
      }
      setError('order_id', null);
      if (isEmptyString(state.value)) {
        setError('value', gettext('Please enter a parameter value.'));
        return true;
      }
      setError('value', null);
    }
  })();

  return new PgtChainTaskSchema(
    {
      databases: () =>
        getNodeListByName('database', treeNodeInfo, itemNodeData, {
          cacheLevel: 'database',
          cacheNode: 'database',
        }),
      paramSchema,
    },
    {
      jstdbname: treeNodeInfo['server']['db'],
    }
  );
}

export default class PgtChainTaskSchema extends BaseUISchema {
  constructor(fieldOptions = {}, initValues = {}) {
    super({
      task_id: null,
      chain_id: null,
      task_name: '',
      task_order: 10,
      kind: 'SQL',
      command: '',
      database_connection: null,
      ignore_error: false,
      parameters: [],
      ...initValues,
    });

    this.fieldOptions = {
      databases: [],
      paramSchema: new (class extends BaseUISchema {
        constructor() {
          super({ order_id: null, value: '' });
        }
        get idAttribute() { return 'order_id'; }
        get baseFields() {
          return [
            { id: 'order_id', label: gettext('Order'), type: 'int', noEmpty: true, cell: 'int', width: 20 },
            { id: 'value', label: gettext('Value'), type: 'multiline', cell: 'text' },
          ];
        }
      })(),
      ...fieldOptions,
    };
  }

  get idAttribute() {
    return 'task_id';
  }

  get baseFields() {
    return [
      {
        id: 'task_id',
        label: gettext('ID'),
        type: 'int',
        mode: ['properties'],
      },
      {
        id: 'task_name',
        label: gettext('Name'),
        type: 'text',
        noEmpty: true,
        cell: 'text',
      },
      {
        id: 'task_order',
        label: gettext('Order'),
        type: 'int',
        cell: 'int',
      },
      {
        id: 'kind',
        label: gettext('Kind'),
        type: 'select',
        controlProps: { allowClear: false },
        cell: 'select',
        options: [
          { label: gettext('SQL'), value: 'SQL' },
          { label: gettext('PROGRAM'), value: 'PROGRAM' },
          { label: gettext('BUILTIN'), value: 'BUILTIN' },
        ],
      },
      {
        id: 'database_connection',
        label: gettext('Connection string'),
        type: 'text',
        deps: ['kind'],
        disabled: (state) => state.kind !== 'SQL',
        helpMessage: `Optional connection string for the database server. Leave blank to use the pgTimetable database. Each parameter setting is in the form keyword = value. Spaces around the equal sign are optional. To write an empty value, or a value containing spaces, surround it with single quotes, e.g., keyword = 'a value'. Single quotes and backslashes within the value must be escaped with a backslash, i.e., ' and \\.
For more information, please see the documentation on <a href="https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING" target="_blank">libpq connection strings</a>.`,
        helpMessageMode: ['edit', 'create'],
      },
      {
        id: 'ignore_error',
        label: gettext('Ignore error'),
        type: 'switch',
        cell: 'switch',
      },
      {
        id: 'command',
        label: gettext('Command'),
        type: (state) => {
          if (state?.kind === 'SQL') return { type: 'multiline', label: gettext('SQL') };
          if (state?.kind === 'BUILTIN') return { type: 'select', label: gettext('Internal Command'), options: [
            { label: 'NoOp', value: 'NoOp' },
            { label: 'Sleep', value: 'Sleep' },
            { label: 'Log', value: 'Log' },
            { label: 'SendMail', value: 'SendMail' },
            { label: 'Download', value: 'Download' },
            { label: 'CopyFromFile', value: 'CopyFromFile' },
            { label: 'CopyToFile', value: 'CopyToFile' },
            { label: 'Shutdown', value: 'Shutdown' },
          ] };
          return { type: 'text', label: gettext('Program') };
        },
        group: gettext('Code'),
        deps: ['kind'],
      },
      {
        id: 'parameters', label: '', group: gettext('Code'),
        type: 'collection', mode: ['edit', 'create'],
        deps: ['kind'],
        schema: this.fieldOptions.paramSchema,
        canEdit: true, canAdd: true, canDelete: true,
        columns: ['order_id', 'value'],
        depChange: (state, source, topState, actionObj) => {
          if (actionObj.type === SCHEMA_STATE_ACTIONS.ADD_ROW && state?.parameters) {
            const params = state.parameters;
            const lastOrder = params.reduce((max, p) => Math.max(max, p.order_id || 0), 0);
            params[params.length - 1].order_id = lastOrder + 1;
          }
          return state;
        },
      },
    ];
  }

  validate(state, setError) {
    let errMsg = null;

    if (state.kind  === 'SQL') {
      const r = /\s*\b(\w+)\s*=\s*('([^'\\]*(?:\\.[^'\\]*)*)'|[\w|\.]*)/g;
      if (!isEmptyString(state.database_connection)) {
        if (String(state.database_connection).replace(r, '') !== '') {
          setError('database_connection', gettext('Please enter a valid connection string.'));
          return true;
        } else {
          const params = {
            host: true,
            hostaddr: true,
            port: true,
            dbname: true,
            user: true,
            password: true,
            connect_timeout: true,
            client_encoding: true,
            application_name: true,
            options: true,
            fallback_application_name: true,
            sslmode: true,
            sslcert: true,
            sslkey: true,
            sslrootcert: true,
            sslcrl: true,
            keepalives: true,
            service: true,
            keepalives_idle: true,
            keepalives_interval: true,
            keepalives_count: true,
            sslcompression: true,
            requirepeer: true,
            krbsrvname: true,
            gsslib: true,
          };
          let m;
          while ((m = r.exec(state.database_connection))) {
            if (params[m[1]]) {
              if (m[2]) continue;
              errMsg = gettext('Please enter a valid connection string.');
              break;
            }
            errMsg = gettext('Invalid parameter in the connection string - %s.', m[1]);
            break;
          }
        }

        if (errMsg) {
          setError('database_connection', errMsg);
          return true;
        } else {
          setError('database_connection', null);
        }
      } else {
        setError('database_connection', null);
      }

      if (isEmptyString(state.command)) {
        setError('command', state.kind  === 'SQL' ? gettext('Please specify the SQL to execute.') : gettext('Please specify the program to execute.'));
        return true;
      } else {
        setError('command', null);
      }
    }
  }
}
