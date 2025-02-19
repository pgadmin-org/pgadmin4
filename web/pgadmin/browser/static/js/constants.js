/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';

export const AUTH_METHODS = {
  INTERNAL: 'internal',
  LDAP: 'ldap',
  KERBEROS: 'kerberos',
  OAUTH2: 'oauth2',
  WEBSERVER: 'webserver'
};

export const TAB_CHANGE = 'TAB_CHANGE';

export const BROWSER_PANELS = {
  MAIN: 'id-main',
  OBJECT_EXPLORER: 'id-object-explorer',
  DASHBOARD: 'id-dashboard',
  PROPERTIES: 'id-properties',
  SQL: 'id-sql',
  STATISTICS: 'id-statistics',
  DEPENDENCIES: 'id-dependencies',
  DEPENDENTS: 'id-dependents',
  PROCESSES: 'id-processes',
  PROCESS_DETAILS: 'id-process-details',
  EDIT_PROPERTIES: 'id-edit-properties',
  UTILITY_DIALOG: 'id-utility',
  QUERY_TOOL: 'id-query-tool',
  PSQL_TOOL: 'id-psql-tool',
  ERD_TOOL: 'id-erd-tool',
  SCHEMA_DIFF_TOOL: 'id-schema-diff-tool',
  DEBUGGER_TOOL: 'id-debugger-tool',
  CLOUD_WIZARD: 'id-cloud-wizard',
  GRANT_WIZARD: 'id-grant-wizard',
  SEARCH_OBJECTS: 'id-search-objects',
  USER_MANAGEMENT: 'id-user-management',
  IMPORT_EXPORT_SERVERS: 'id-import-export-servers',
  WELCOME_QUERY_TOOL: 'id-welcome-querytool',
  WELCOME_PSQL_TOOL: 'id-welcome-psql'
};

export const WORKSPACES = {
  DEFAULT: 'default_workspace',
  QUERY_TOOL: 'query_tool_workspace',
  PSQL_TOOL: 'psql_workspace',
  SCHEMA_DIFF_TOOL: 'schema_diff_workspace'
};

export const WEEKDAYS = [
    {label: gettext('Sunday'), value: '7'},
    {label: gettext('Monday'), value: '1'},
    {label: gettext('Tuesday'), value: '2'},
    {label: gettext('Wednesday'), value: '3'},
    {label: gettext('Thursday'), value: '4'},
    {label: gettext('Friday'), value: '5'},
    {label: gettext('Saturday'), value: '6'},
  ],
  MONTHDAYS = [
    {label: gettext('1st'), value: '1'}, {label: gettext('2nd'), value: '2'},
    {label: gettext('3rd'), value: '3'}, {label: gettext('4th'), value: '4'},
    {label: gettext('5th'), value: '5'}, {label: gettext('6th'), value: '6'},
    {label: gettext('7th'), value: '7'}, {label: gettext('8th'), value: '8'},
    {label: gettext('9th'), value: '9'}, {label: gettext('10th'), value: '10'},
    {label: gettext('11th'), value: '11'}, {label: gettext('12th'), value: '12'},
    {label: gettext('13th'), value: '13'}, {label: gettext('14th'), value: '14'},
    {label: gettext('15th'), value: '15'}, {label: gettext('16th'), value: '16'},
    {label: gettext('17th'), value: '17'}, {label: gettext('18th'), value: '18'},
    {label: gettext('19th'), value: '19'}, {label: gettext('20th'), value: '20'},
    {label: gettext('21st'), value: '21'}, {label: gettext('22nd'), value: '22'},
    {label: gettext('23rd'), value: '23'}, {label: gettext('24th'), value: '24'},
    {label: gettext('25th'), value: '25'}, {label: gettext('26th'), value: '26'},
    {label: gettext('27th'), value: '27'}, {label: gettext('28th'), value: '28'},
    {label: gettext('29th'), value: '29'}, {label: gettext('30th'), value: '30'},
    {label: gettext('31st'), value: '31'},
  ],
  MONTHS = [
    {label: gettext('January'),value: '1'}, {label: gettext('February'),value: '2'},
    {label: gettext('March'), value: '3'}, {label: gettext('April'), value: '4'},
    {label: gettext('May'), value: '5'}, {label: gettext('June'), value: '6'},
    {label: gettext('July'), value: '7'}, {label: gettext('August'), value: '8'},
    {label: gettext('September'), value: '9'}, {label: gettext('October'), value: '10'},
    {label: gettext('November'), value: '11'}, {label: gettext('December'), value: '12'},
  ],
  HOURS = [
    {label: gettext('00'), value: '00'}, {label: gettext('01'), value: '01'}, {label: gettext('02'), value: '02'}, {label: gettext('03'), value: '03'},
    {label: gettext('04'), value: '04'}, {label: gettext('05'), value: '05'}, {label: gettext('06'), value: '06'}, {label: gettext('07'), value: '07'},
    {label: gettext('08'), value: '08'}, {label: gettext('09'), value: '09'}, {label: gettext('10'), value: '10'}, {label: gettext('11'), value: '11'},
    {label: gettext('12'), value: '12'}, {label: gettext('13'), value: '13'}, {label: gettext('14'), value: '14'}, {label: gettext('15'), value: '15'},
    {label: gettext('16'), value: '16'}, {label: gettext('17'), value: '17'}, {label: gettext('18'), value: '18'}, {label: gettext('19'), value: '19'},
    {label: gettext('20'), value: '20'}, {label: gettext('21'), value: '21'}, {label: gettext('22'), value: '22'}, {label: gettext('23'), value: '23'},
  ],
  MINUTES = [
    {label: gettext('00'), value: '00'}, {label: gettext('01'), value: '01'}, {label: gettext('02'), value: '02'}, {label: gettext('03'), value: '03'},
    {label: gettext('04'), value: '04'}, {label: gettext('05'), value: '05'}, {label: gettext('06'), value: '06'}, {label: gettext('07'), value: '07'},
    {label: gettext('08'), value: '08'}, {label: gettext('09'), value: '09'}, {label: gettext('10'), value: '10'}, {label: gettext('11'), value: '11'},
    {label: gettext('12'), value: '12'}, {label: gettext('13'), value: '13'}, {label: gettext('14'), value: '14'}, {label: gettext('15'), value: '15'},
    {label: gettext('16'), value: '16'}, {label: gettext('17'), value: '17'}, {label: gettext('18'), value: '18'}, {label: gettext('19'), value: '19'},
    {label: gettext('20'), value: '20'}, {label: gettext('21'), value: '21'}, {label: gettext('22'), value: '22'}, {label: gettext('23'), value: '23'},
    {label: gettext('24'), value: '24'}, {label: gettext('25'), value: '25'}, {label: gettext('26'), value: '26'}, {label: gettext('27'), value: '27'},
    {label: gettext('28'), value: '28'}, {label: gettext('29'), value: '29'}, {label: gettext('30'), value: '30'}, {label: gettext('31'), value: '31'},
    {label: gettext('32'), value: '32'}, {label: gettext('33'), value: '33'}, {label: gettext('34'), value: '34'}, {label: gettext('35'), value: '35'},
    {label: gettext('36'), value: '36'}, {label: gettext('37'), value: '37'}, {label: gettext('38'), value: '38'}, {label: gettext('39'), value: '39'},
    {label: gettext('40'), value: '40'}, {label: gettext('41'), value: '41'}, {label: gettext('42'), value: '42'}, {label: gettext('43'), value: '43'},
    {label: gettext('44'), value: '44'}, {label: gettext('45'), value: '45'}, {label: gettext('46'), value: '46'}, {label: gettext('47'), value: '47'},
    {label: gettext('48'), value: '48'}, {label: gettext('49'), value: '49'}, {label: gettext('50'), value: '50'}, {label: gettext('51'), value: '51'},
    {label: gettext('52'), value: '52'}, {label: gettext('53'), value: '53'}, {label: gettext('54'), value: '54'}, {label: gettext('55'), value: '55'},
    {label: gettext('56'), value: '56'}, {label: gettext('57'), value: '57'}, {label: gettext('58'), value: '58'}, {label: gettext('59'), value: '59'},
  ];

export const PGAGENT_MONTHDAYS = [...MONTHDAYS].concat([{label: gettext('Last day'), value: 'Last Day'}]);
