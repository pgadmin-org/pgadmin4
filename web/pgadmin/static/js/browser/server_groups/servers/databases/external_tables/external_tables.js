/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

export function initialize(pgBrowser, gettext) {
  if (!pgBrowser.Nodes['coll-external_table']) {
    pgBrowser.Nodes['coll-external_table'] =
      pgBrowser.Collection.extend({
        node: 'external_table',
        label: gettext('External Tables'),
        type: 'coll-external_tables',
        columns: ['name', 'fdwowner', 'description'],
      });
  }

  if (!pgBrowser.Nodes['external_table']) {
    pgBrowser.Nodes['external_table'] = pgBrowser.Node.extend({
      parent_type: 'database',
      type: 'external_table',
      label: gettext('External Table'),
      collection_type: 'coll-external_table',
      hasSQL: true,
      model: pgBrowser.Node.Model.extend({
        defaults: {
          name: undefined,
          type: undefined,
          encoding: undefined,
          format_type: undefined,
          format_option: undefined,
          external_options: undefined,
          command: undefined,
          execute_on: undefined,
        },
        schema: [
          {
            id: 'name',
            label: gettext('Name'),
            type: 'text',
            mode: ['properties'],
          }, {
            id: 'type',
            label: gettext('Type'),
            type: 'text',
            mode: ['properties'],
          }, {
            id: 'encoding',
            label: gettext('Encoding'),
            type: 'text',
            mode: ['properties'],
          }, {
            id: 'format_type',
            label: gettext('Format Type'),
            type: 'text',
            mode: ['properties'],
          }, {
            id: 'format_option',
            label: gettext('Format Options'),
            type: 'text',
            mode: ['properties'],
          }, {
            id: 'external_options',
            label: gettext('External Options'),
            type: 'text',
            mode: ['properties'],
          }, {
            id: 'command',
            label: gettext('Command'),
            type: 'text',
            mode: ['properties'],
          }, {
            id: 'execute_on',
            label: gettext('Execute on'),
            type: 'text',
            mode: ['properties'],
          },
        ],
      }),
    });
  }

  return pgBrowser;
}

