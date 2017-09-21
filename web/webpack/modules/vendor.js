/* eslint-env node */
const path = require('path');
var vendor = {
  name: 'vendor',
  isReference: true,
  includeCSS: true,
  createSourceMap: true,
};

module.exports = vendor;

vendor.provide = {
  $: 'jquery',
  jQuery: 'jquery',
  'window.jQuery': 'jquery',
  _: 'underscore',
  S: 'underscore.string'
};


vendor.shimConfig = {
  shim: {
    'moment': {
      exports: 'moment',
    },
    'underscore': {
      exports: '_',
    },
    'jquery': {
      'exports': 'jQuery',
    },
    'jquery.event.drag': {
      'deps': ['jquery'], 'exports': 'jQuery.fn.drag',
    },
    'jquery.event.drop': {
      deps: ['jquery'], exports: '$.fn.drop'
    },
    'slick.pgadmin.formatters': {
      'deps': ['slickgrid'],
    },
    'flotr2': {
      deps: ['bean'],
    },
    'alertify': {
      'exports': 'alertify',
    },
    'jqueryui.position': {
      'deps': ['jquery'],
      'exports': 'jQuery.ui.position',
    },
    'jquery.contextmenu': {
      'deps': ['jquery', 'jqueryui.position'],
      'exports': 'jQuery.contextMenu',
    },
    'jquery.aciplugin': {
      'deps': ['jquery'],
      'exports': 'aciPluginClass',
    },
    'jquery.acitree': {
      'deps': ['jquery', 'jquery.aciplugin'],
      'exports': 'aciPluginClass.plugins.aciTree',
    },
    'jquery.acitree.utils': {
      'deps': ['jquery', 'jquery.aciplugin'],
      'exports': 'aciPluginClass.plugins.aciTreeUtils',
    },
    'jquery.acisortable': {
      'deps': ['jquery', 'jquery.aciplugin'],
      'exports': 'aciPluginClass.plugins.aciSortable',
    },
    'jquery.acifragment': {
      'deps': ['jquery', 'jquery.aciplugin'],
      'exports': 'aciPluginClass.plugins.aciFragment',
    },
    'wcdocker': {
      'deps': ['jquery', 'jquery.contextmenu'],
    },
    'bootstrap': {
      'deps': ['jquery'],
    },
    'select2': {
      'deps': ['jquery'],
      'exports': '$.fn.select2',
    },
    'bootstrap.datepicker': {
      'deps': ['jquery', 'bootstrap'],
      'exports': 'jQuery.fn.datepicker',
    },
    'bootstrap.datetimepicker': {
      deps: ['jquery', 'bootstrap'],
      'exports': 'jQuery.fn.datetimepicker',
    },
    'bootstrap.switch': {
      deps: ['jquery', 'bootstrap'],
      'exports': '$.fn.bootstrapSwitch',
    },
    'backbone': {
      exports: 'Backbone', // Once loaded, use the global 'Backbone' as the module value.
      deps: [
        'underscore', // just make sure that underscore is loaded before (uses it's global value)
        'jquery:$', // Provide jquery as dependency with name $
      ],
    },
    'backform': {
      deps: ['backbone'],
      exports: 'Backform'
    },
    'backgrid': {
      deps: ['backform'],
      exports: 'Backgrid',
    },
    'backgrid.select.all': {
      'deps': ['backgrid'],
    },
    'backgrid.paginator': {
      'deps': ['backgrid', 'backbone.paginator'],
    },
    'backgrid.filter': {
      'deps': ['backgrid'],
    },
    'backgrid.sizeable.columns': {
      'deps': ['backgrid'],
    },
  },
  alias: {
    'babel-polyfill': 'node_modules/babel-polyfill/dist/polyfill',

    'alertify': 'node_modules/alertifyjs/build/alertify',
    'moment': 'node_modules/moment/moment',
    'flotr2': 'node_modules/flotr2/flotr2',
    'bean': 'node_modules/flotr2/lib/bean',
    'jqueryui.position': 'node_modules/jquery-contextmenu/dist/jquery.ui.position',
    'jquery.contextmenu': 'node_modules/jquery-contextmenu/dist/jquery.contextMenu',
    'dropzone': 'node_modules/dropzone/dist/dropzone',
    'bignumber': 'node_modules/bignumber.js/bignumber',
    'snap.svg': 'node_modules/snapsvg/dist/snap.svg',

    'jquery.event.drag': 'node_modules/slickgrid/lib/jquery.event.drag-2.3.0',
    'jquery.event.drop': 'node_modules/slickgrid/lib/jquery.event.drop-2.3.0',

    // AciTree
    'jquery.acitree': 'node_modules/acitree/js/jquery.aciTree.min',
    'jquery.acitree.utils': 'node_modules/acitree/js/jquery.aciTree.utils',
    'jquery.aciplugin': 'node_modules/acitree/js/jquery.aciPlugin.min',
    'jquery.acisortable': 'node_modules/acitree/js/jquery.aciSortable.min',
    'jquery.acifragment': 'node_modules/acitree/js/jquery.aciFragment.min',

    'wcdocker': 'pgadmin/static/vendor/webcabin-docker/Build/wcDocker',

    // Bootstrap
    'bootstrap': 'node_modules/bootstrap/dist/js/bootstrap',

    // Backbone and Backgrid
    'backbone': 'node_modules/backbone/backbone',
    'backform': 'node_modules/backform/src/backform',
    'backgrid': 'node_modules/backgrid/lib/backgrid',
    'bootstrap.datetimepicker': 'node_modules/eonasdan-bootstrap-datetimepicker/build/js/bootstrap-datetimepicker.min',
    'bootstrap.switch': 'node_modules/bootstrap-switch/dist/js/bootstrap-switch',
    'select2': 'node_modules/select2/dist/js/select2.full',
    'backgrid.filter': 'node_modules/backgrid-filter/backgrid-filter',
    'backgrid.sizeable.columns': 'node_modules/backgrid-sizeable-columns/backgrid-sizeable-columns',
    'backgrid.select.all': 'node_modules/backgrid-select-all/backgrid-select-all',
  }
};

vendor.resolve = {
  modules: ['node_modules', '.'],
  extensions: ['.js']
};

vendor.entry = [
  'babel-polyfill', 'jquery', 'underscore', 'underscore.string',
  'alertify', 'moment', 'jquery.event.drag', 'jquery.event.drop', 'jquery-ui', 'bean', 'flotr2',
  'jqueryui.position', 'jquery.contextmenu', 'snap.svg', 'dropzone',
  'bignumber', 'jquery.aciplugin', 'jquery.acifragment',
  'jquery.acitree', 'jquery.acitree.utils', 'jquery.acisortable', 'wcdocker',
  'backbone', 'backform', 'backgrid', 'bootstrap',
  'bootstrap.datetimepicker', 'bootstrap.switch', 'select2',
  'backgrid.filter', 'backgrid.sizeable.columns', 'backgrid.select.all',
];

vendor.module = {
  rules: [{
    test: require.resolve('../../node_modules/acitree/js/jquery.aciTree.min'),
    use: {
      loader: 'imports-loader?this=>window',
    },
  }, {
    test: require.resolve('../../node_modules/acitree/js/jquery.aciPlugin.min'),
    use: {
      loader: 'imports-loader?this=>window',
    },
  }, {
    test: require.resolve('snapsvg'),
    use: {
      loader: 'imports-loader?this=>window,fix=>module.exports=0',
    },
  }]
};

vendor.stylesheets = [
  'pgadmin/static/vendor/backgrid/backgrid.css',
  'node_modules/bootstrap/dist/css/bootstrap.css',
  'node_modules/alertifyjs/build/css/alertify.css',
  'node_modules/alertifyjs/build/css/themes/bootstrap.css',
  'node_modules/bootstrap/dist/css/bootstrap-theme.css',
  'node_modules/font-awesome/css/font-awesome.css',
  'node_modules/font-mfizz/font/font-mfizz.css',
  'node_modules/bootstrap-datepicker/dist/css/bootstrap-datepicker3.css',
  'node_modules/eonasdan-bootstrap-datetimepicker/build/css/bootstrap-datetimepicker.css',
  'node_modules/bootstrap-switch/dist/css/bootstrap3/bootstrap-switch.css',
  'node_modules/backgrid-select-all/backgrid-select-all.css',
  'node_modules/backgrid-filter/backgrid-filter.css',
  'node_modules/backgrid-sizeable-columns/backgrid-sizeable-columns.css',
  'node_modules/slickgrid/css/select2.css',
  'node_modules/jquery-contextmenu/dist/jquery.contextMenu.css',
  'pgadmin/static/vendor/webcabin-docker/Build/wcDocker.css',
  'node_modules/acitree/css/aciTree.css',

  'node_modules/codemirror/lib/codemirror.css',
  'node_modules/codemirror/addon/dialog/dialog.css',
  'node_modules/codemirror/addon/scroll/simplescrollbars.css',

  'node_modules/slickgrid/slick.grid.css',
  'node_modules/slickgrid/slick-default-theme.css',
  'node_modules/slickgrid/css/smoothness/jquery-ui-1.11.3.custom.css',
];
