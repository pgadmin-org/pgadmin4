/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';

export default class DBMSJobSchedulerSchema extends BaseUISchema {
  constructor() {
    super({
      jobid: null,
      jobname: '',
      jobstatus: '',
      joberror: ''
    });
  }

  get idAttribute() {
    return 'jobid';
  }

  get baseFields() {
    return [
      {
        id: 'jobid', label: gettext('ID'), cell: 'int', mode: ['properties']
      }, {
        id: 'jobname', label: gettext('Name'), cell: 'text'
      }, {
        id: 'jobstatus', label: gettext('Status'), cell: 'text'
      }, {
        id: 'joberror', label: gettext('Error'), cell: 'text'
      }, {
        id: 'jobstarttime', label: gettext('Start Time'), cell: 'datetimepicker'
      }, {
        id: 'jobendtime', label: gettext('End Time'), cell: 'datetimepicker'
      }, {
        id: 'jobnextrun', label: gettext('Next Run'), cell: 'datetimepicker'
      }];
  }
}
