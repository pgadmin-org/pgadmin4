/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { getNodeListByName } from '../../../../../../static/js/node_ajax';
import { isEmptyString } from 'sources/validators';

export function getNodePgaJobStepSchema(treeNodeInfo, itemNodeData) {
  return new PgaJobStepSchema(
    {
      databases: ()=>getNodeListByName('database', treeNodeInfo, itemNodeData, {
        cacheLevel: 'database',
        cacheNode: 'database'
      })
    },
    {
      jstdbname: treeNodeInfo['server']['db'],
    }
  );
}
export default class PgaJobStepSchema extends BaseUISchema {
  constructor(fieldOptions={}, initValues={}) {
    super({
      jstid: null,
      jstjobid: null,
      jstname: '',
      jstdesc: '',
      jstenabled: true,
      jstkind: true,
      jstconntype: true,
      jstcode: '',
      jstconnstr: null,
      jstdbname: null,
      jstonerror: 'f',
      jstnextrun: '',
      ...initValues,
    });

    this.fieldOptions = {
      databases: [],
      ...fieldOptions,
    };
  }

  get idAttribute() {
    return 'jstid';
  }

  get baseFields() {
    return [
      {
        id: 'jstid', label: gettext('ID'), type: 'int',
        mode: ['properties'],
      }, {
        id: 'jstname', label: gettext('Name'), type: 'text', noEmpty: true,
        cell: 'text',
      }, {
        id: 'jstenabled', label: gettext('Enabled?'), cell: 'switch',
        type: 'switch',
      }, {
        id: 'jstkind', label: gettext('Kind'),
        type: () => {
          return {
            type: 'toggle',
            options: [
              {'label': gettext('SQL'), value: true},
              {'label': gettext('Batch'), value: false},
            ],
          };
        },
        cell: () => {
          return {
            cell: '',
            controlProps: {
              formatter: {
                fromRaw: (actualVal)=> {
                  return actualVal ? gettext('SQL') : gettext('Batch');
                }
              },
            }
          };
        },
      }, {
        id: 'jstconntype', label: gettext('Connection type'),
        type: () => {
          return {
            type: 'toggle',
            options: [
              {'label': gettext('Local'), value: true},
              {'label': gettext('Remote'), value: false},
            ],
          };
        },
        cell: () => {
          return {
            cell: '',
            controlProps: {
              formatter: {
                fromRaw: (actualVal)=> {
                  return actualVal ? gettext('Local') : gettext('Remote');
                }
              },
            }
          };
        },
        deps: ['jstkind'],
        disabled: function(state) { return !state.jstkind; },
        helpMessage: gettext('Select <strong>Local</strong> if the job step will execute on the local database server, or <strong>Remote</strong> to specify a remote database server.'),
        helpMessageMode: ['edit', 'create'],
      }, {
        id: 'jstdbname', label: gettext('Database'), type: 'select',
        options: this.fieldOptions.databases,
        controlProps: {allowClear: true, placeholder: ''},
        disabled: function(state) {
          return !state.jstkind || !state.jstconntype;
        },
        depChange: (state)=>{
          if (!state.jstkind || !state.jstconntype) {
            return {jstdbname: null};
          }
        },
        deps: ['jstkind', 'jstconntype'],
        helpMessage: gettext('Please select the database on which the job step will run.'),
        helpMessageMode: ['edit', 'create'],
      }, {
        id: 'jstconnstr', label: gettext('Connection string'), type: 'text',
        deps: ['jstkind', 'jstconntype'],
        disabled: function(state) { return !state.jstkind || state.jstconntype; },
        helpMessage: gettext('Please specify the connection string for the remote database server. Each parameter setting is in the form keyword = value. Spaces around the equal sign are optional. To write an empty value, or a value containing spaces, surround it with single quotes, e.g., keyword = \'a value\'. Single quotes and backslashes within the value must be escaped with a backslash, i.e., \' and \\.<br>For more information, please see the documentation on <a href="https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING" target="_blank">libpq connection strings</a>.'),
        helpMessageMode: ['edit', 'create'],
      }, {
        id: 'jstonerror', label: gettext('On error'), type: 'select',
        cell: 'select',
        options: [
          {'label': gettext('Fail'), 'value': 'f'},
          {'label': gettext('Success'), 'value': 's'},
          {'label': gettext('Ignore'), 'value': 'i'},
        ],
        controlProps: {allowClear: false},
      }, {
        id: 'jstdesc', label: gettext('Comment'), type: 'multiline',
      }, {
        id: 'jstcode', label: '', deps: ['jstkind'],
        type: 'sql', group: gettext('Code'), isFullTab: true,
      }
    ];
  }

  validate(state, setError) {
    let errMsg = null;

    if (state.jstkind) {
      if (state.jstconntype) {
        if (isEmptyString(state.jstdbname)) {
          setError('jstdbname', gettext('Please select a database.'));
          return true;
        } else {
          setError('jstdbname', null);
        }
      } else {
        let r = /\s*\b(\w+)\s*=\s*('([^'\\]*(?:\\.[^'\\]*)*)'|[\w|\.]*)/g;
        if (isEmptyString(state.jstconnstr)) {
          setError('jstconnstr', gettext('Please enter a connection string.'));
          return true;
        } else if (String(state.jstconnstr).replace(r, '') != '') {
          setError('jstconnstr', gettext('Please enter a valid connection string.'));
          return true;
        } else {
          let m,
            params = {
              'host': true, 'hostaddr': true, 'port': true,
              'dbname': true, 'user': true, 'password': true,
              'connect_timeout': true, 'client_encoding': true,
              'application_name': true, 'options': true,
              'fallback_application_name': true, 'sslmode': true,
              'sslcert': true, 'sslkey': true, 'sslrootcert': true,
              'sslcrl': true, 'keepalives': true, 'service': true,
              'keepalives_idle': true, 'keepalives_interval': true,
              'keepalives_count': true, 'sslcompression': true,
              'requirepeer': true, 'krbsrvname': true, 'gsslib': true,
            };

          while((m = r.exec(state.jstconnstr))) {
            if (params[m[1]]) {
              if (m[2])
                continue;
              errMsg = gettext('Please enter a valid connection string.');
              break;
            }

            errMsg = gettext('Invalid parameter in the connection string - %s.', m[1]);
            break;
          }
        }

        if (errMsg) {
          setError('jstconnstr', errMsg);
          return true;
        } else {
          setError('jstconnstr', null);
        }
      }
    } else {
      setError('jstconnstr', null);
      setError('jstdbname', null);
    }

    if (isEmptyString(state.jstcode)) {
      setError('jstcode', gettext('Please specify code to execute.'));
      return true;
    } else {
      setError('jstcode', null);
    }

    if (isEmptyString(state.jstonerror)) {
      setError('jstonerror', gettext('Please select valid on error option.'));
      return true;
    } else {
      setError('jstonerror', null);
    }
  }
}
