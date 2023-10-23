/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import EventBus from '../../pgadmin/static/js/helpers/EventBus';

const Browser = {
  messages: {
    'CANNOT_BE_EMPTY': '\'%s\' cannot be empty.',
    'MUST_BE_INT': '\'%s\' must be an integer.'
  },
  Events: new EventBus(),
  get_preferences_for_module: ()=>({}),
  docker: {
    eventBus: new EventBus(),
    find: ()=>{},
    openTab: ()=>{},
    focus: ()=>{},
  },
  onPreferencesChange: ()=>{/*This is intentional (SonarQube)*/},
  utils: {
    app_version_int: 1234,
  },
  Tools: {
    SQLEditor: {},
    FileManager: {
      show: jest.fn(),
    },
  },
  Nodes: {
    server: {
      hasId: true,
      getTreeNodeHierarchy: jest.fn(),
    },
    database: {
      hasId: true,
      getTreeNodeHierarchy: jest.fn(),
    },
    'coll-sometype': {
      type: 'coll-sometype',
      hasId: false,
      label: 'Some types coll',
    },
    sometype: {
      type: 'sometype',
      hasId: true,
    },
    someothertype: {
      type: 'someothertype',
      hasId: true,
      collection_type: 'coll-sometype',
    },
    'coll-edbfunc': {
      type: 'coll-edbfunc',
      hasId: true,
      label: 'Functions',
    },
    'coll-edbproc': {
      type: 'coll-edbfunc',
      hasId: true,
      label: 'Procedures',
    },
    'coll-edbvar': {
      type: 'coll-edbfunc',
      hasId: true,
      label: 'Variables',
    },
  },
  notifier: {
    alert: ()=>{/*This is intentional (SonarQube)*/},
    error: ()=>{/*This is intentional (SonarQube)*/},
    success: ()=>{/*This is intentional (SonarQube)*/},
    confirm: ()=>{/*This is intentional (SonarQube)*/},
    notify: ()=>{/*This is intentional (SonarQube)*/},
  },
  stdH: {
    sm: 200,
    md: 400,
    lg: 550,
    default: 550,
  },
  stdW: {
    sm: 500,
    md: 700,
    lg: 900,
    default: 500,
  },
};

const fakePgAdmin = {
  Browser: Browser,
};

export default fakePgAdmin;
