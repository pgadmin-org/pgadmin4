/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import PgaJobScheduleSchema from '../../schedules/static/js/pga_schedule.ui';

export default class PgaJobSchema extends BaseUISchema {
  constructor(fieldOptions={}, getPgaJobStepSchema=()=>[], initValues={}) {
    super({
      jobname: '',
      jobid: undefined,
      jobenabled: true,
      jobhostagent: '',
      jobjclid: 1,
      jobcreated: undefined,
      jobchanged: undefined,
      jobnextrun: undefined,
      joblastrun: undefined,
      jlgstatus: undefined,
      jobrunningat: undefined,
      jobdesc: '',
      jsteps: [],
      jschedules: [],
      ...initValues,
    });

    this.fieldOptions = {
      jobjclid: [],
      ...fieldOptions,
    };
    this.getPgaJobStepSchema = getPgaJobStepSchema;
  }

  get idAttribute() {
    return 'jobid';
  }

  get baseFields() {
    return [
      {
        id: 'jobname', label: gettext('Name'), type: 'text', noEmpty: true,
      },{
        id: 'jobid', label: gettext('ID'), mode: ['properties'],
        type: 'int',
      },{
        id: 'jobenabled', label: gettext('Enabled?'), type: 'switch',
      },{
        id: 'jobjclid', label: gettext('Job class'), type: 'select',
        options: this.fieldOptions.jobjclid,
        controlProps: {allowClear: false},
        mode: ['properties'],
      },{
        id: 'jobjclid', label: gettext('Job class'), type: 'select',
        options: this.fieldOptions.jobjclid,
        mode: ['create', 'edit'],
        controlProps: {allowClear: false},
        helpMessage: gettext('Please select a class to categorize the job. This option will not affect the way the job runs.'),
        helpMessageMode: ['edit', 'create'],
      },{
        id: 'jobhostagent', label: gettext('Host agent'), type: 'text',
        mode: ['properties'],
      },{
        id: 'jobhostagent', label: gettext('Host agent'), type: 'text',
        mode: ['edit', 'create'],
        helpMessage: gettext('Enter the hostname of a machine running pgAgent if you wish to ensure only that machine will run this job. Leave blank if any host may run the job.'),
        helpMessageMode: ['edit', 'create'],
      },{
        id: 'jobcreated', type: 'text', mode: ['properties'],
        label: gettext('Created'),
      },{
        id: 'jobchanged', type: 'text', mode: ['properties'],
        label: gettext('Changed'),
      },{
        id: 'jobnextrun', type: 'text', mode: ['properties'],
        label: gettext('Next run'),
      },{
        id: 'joblastrun', type: 'text', mode: ['properties'],
        label: gettext('Last run'),
      },{
        id: 'jlgstatus', type: 'text', label: gettext('Last result'), mode: ['properties'],
        controlProps: {
          formatter: {
            fromRaw: (originalValue)=>{
              return originalValue || gettext('Unknown');
            },
          }
        }
      },{
        id: 'jobrunningat', type: 'text', mode: ['properties'], label: gettext('Running at'),
        controlProps: {
          formatter: {
            fromRaw: (originalValue)=>{
              return originalValue || gettext('Not running currently.');
            },
          }
        }
      },{
        id: 'jobdesc', label: gettext('Comment'), type: 'multiline',
      },{
        id: 'jsteps', label: '', group: gettext('Steps'),
        type: 'collection', mode: ['edit', 'create'],
        schema: this.getPgaJobStepSchema(),
        canEdit: true, canAdd: true, canDelete: true,
        columns: [
          'jstname', 'jstenabled', 'jstkind', 'jstconntype', 'jstonerror',
        ],
      },{
        id: 'jschedules', label: '', group: gettext('Schedules'),
        type: 'collection', mode: ['edit', 'create'],
        schema: new PgaJobScheduleSchema(),
        canAdd: true, canDelete: true, canEdit: true,
        columns: ['jscname', 'jscenabled', 'jscstart', 'jscend'],
      }
    ];
  }
}
