import BaseUISchema from 'sources/utils/BaseUISchema';
import gettext from 'sources/gettext';

// 1. Define the child schema for individual tasks inside the chain array
class PGTimetableTaskSchema extends BaseUISchema {
  constructor() {
    super({
      task_kind: 'SQL',
      command: ''
    });
  }

  get baseFields() {
    return [
      {
        id: 'task_kind',
        label: gettext('Kind'),
        type: 'select',
        control: 'select',
        options: [
          { label: 'SQL Script', value: 'SQL' },
          { label: 'Shell / OS Command', value: 'PROGRAM' },
          { label: 'Built-In Boot Task', value: 'BUILTIN' }
        ],
        editable: true,
        width: 150
      },
      {
        id: 'command',
        label: gettext('Script / Command Executable'),
        type: 'textarea',
        editable: true,
        cell: 'string'
      }
    ];
  }
}

// 2. Define the main schema for the master chain configuration
export default class PGTimetableChainSchema extends BaseUISchema {
  constructor(fieldOptions = {}) {
    super({
      id: undefined,
      name: '',
      run_at: '',
      max_instances: 1,
      live: true,
      tasks: []
    });
    this.fieldOptions = fieldOptions;
  }

  get baseFields() {
    return [
      {
        id: 'name',
        label: gettext('Name'),
        type: 'text',
        mode: ['properties', 'create', 'edit'],
        group: gettext('General'),
        required: true
      },
      {
        id: 'live',
        label: gettext('Enabled?'),
        type: 'switch',
        mode: ['properties', 'create', 'edit'],
        group: gettext('General')
      },
      {
        id: 'max_instances',
        label: gettext('Max Instances'),
        type: 'int',
        mode: ['properties', 'create', 'edit'],
        group: gettext('General'),
        min: 1
      },
      {
        id: 'run_at',
        label: gettext('Cron Expression'),
        type: 'text',
        mode: ['properties', 'create', 'edit'],
        group: gettext('Schedules'),
        placeholder: '* * * * *',
        required: true
      },
      {
        id: 'tasks',
        label: gettext('Tasks / Steps Sequence'),
        type: 'collection',
        mode: ['create', 'edit'],
        group: gettext('Steps'),
        schema: new PGTimetableTaskSchema(), // Nesting our row-level task schema here
        canAdd: true,
        canDelete: true,
        canEdit: true,
        uniqueCol : ['task_order']
      }
    ];
  }

  // Frontend validation logic before sending data to create.sql / update.sql
  validate(data, modifiedFields) {
    let msg = null;

    if (!data.name || data.name.trim() === '') {
      msg = gettext('Chain name cannot be empty.');
      this.setError('name', msg);
      return true;
    }

    if (!data.run_at || data.run_at.trim() === '') {
      msg = gettext('Cron expression schedule is required.');
      this.setError('run_at', msg);
      return true;
    }

    if (!data.tasks || data.tasks.length === 0) {
      msg = gettext('A chain must contain at least one step task.');
      this.setError('tasks', msg);
      return true;
    }

    return false; // Returns false if the form passes validation safely
  }
}
