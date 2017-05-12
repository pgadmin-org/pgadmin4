//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////////////////

var allTestFiles = [];
var TEST_REGEXP = /(spec|test)\.js$/i;

// Get a list of all the test files to include
Object.keys(window.__karma__.files).forEach(function (file) {
  if (TEST_REGEXP.test(file)) {
    // Normalize paths to RequireJS module names.
    // If you require sub-dependencies of test files to be loaded as-is (requiring file extension)
    // then do not normalize the paths
    var normalizedTestModule = file.replace(/^\/base\/|\.js$/g, '');
    allTestFiles.push(normalizedTestModule)
  }
});

var sourcesDir = '/base/pgadmin/static/';
require.config({
  // Karma serves files under /base, which is the basePath from your config file
  baseUrl: '/base',

  paths: {
    'alertify': sourcesDir + 'vendor/alertifyjs/alertify',
    'jquery': sourcesDir + 'vendor/jquery/jquery-1.11.2',
    'jquery.ui': sourcesDir + 'vendor/jquery-ui/jquery-ui-1.11.3',
    'jquery.event.drag': sourcesDir + 'vendor/jquery-ui/jquery.event.drag-2.2',
    'underscore': sourcesDir + 'vendor/underscore/underscore',
    'underscore.string': sourcesDir + 'vendor/underscore/underscore.string',
    'slickgrid': sourcesDir + 'vendor/slickgrid/slick.core',
    'slickgrid/slick.grid': sourcesDir + 'vendor/slickgrid/slick.grid',
    'slickgrid/slick.rowselectionmodel': sourcesDir + 'vendor/slickgrid/plugins/slick.rowselectionmodel',
    'translations': '/base/regression/javascript/fake_translations',
    'sources': sourcesDir + 'js'
  },

  shim: {
    'underscore': {
      exports: '_'
    },
    "slickgrid": {
      "deps": [
        'jquery', "jquery.ui", "jquery.event.drag"
      ],
      "exports": 'window.Slick'
    },
    "slickgrid/slick.grid": {
      "deps": [
        'jquery', "jquery.ui", "jquery.event.drag", "slickgrid"
      ],
      "exports": 'window.Slick.Grid'
    },
    "slickgrid/slick.rowselectionmodel": {
      "deps": [
        "jquery"
      ],
      "exports": 'window.Slick.RowSelectionModel'
    },
    "backbone": {
      "deps": ['underscore', 'jquery'],
      "exports": 'Backbone'
    },
    "backbone.paginator": {
      "deps": ['underscore', 'jquery', 'backbone']
    },
    "bootstrap": {
      "deps": ['jquery'],
    },
    "backgrid": {
      "deps": ['backform'],
      "exports": 'Backgrid',
    },
    "backgrid.select.all": {
      "deps": ['backgrid']
    },
    "backgrid.paginator": {
      "deps": ['backgrid', 'backbone.paginator']
    },
    "backgrid.filter": {
      "deps": ['backgrid']
    },
    "backgrid.sizeable.columns": {
      "deps": ['backgrid']
    },
    "bootstrap.switch": {
      "deps": ['jquery', 'bootstrap'],
      "exports": 'jQuery.fn.bootstrapSwitch'
    },
    "select2": {
      "deps": ['jquery'],
      "exports": 'jQuery.fn.select2'
    },
    "bootstrap.datepicker": {
      "deps": ['jquery', 'bootstrap'],
      "exports": 'jQuery.fn.datepicker'
    },
    "bootstrap.datetimepicker": {
      "deps": ['jquery', 'bootstrap', 'moment'],
      "exports": 'jQuery.fn.datetimepicker'
    },
    "pgadmin.backgrid": {
      "deps": ["backgrid", "bootstrap.datetimepicker", "bootstrap.switch"],
    },
    "pgadmin.backform": {
      "deps": ['backform', "pgadmin.backgrid", "select2"],
    },
    "jquery.event.drag": {
      "deps": ['jquery'], "exports": 'jQuery.fn.drag'
    },
    "jquery.ui": {"deps": ['jquery']}
  },

  // dynamically load all test files
  deps: allTestFiles,

  // we have to kickoff jasmine, as it is asynchronous
  callback: window.__karma__.start
});

