/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// Karma configuration
const webpackConfig = require('./webpack.test.config.js');
const isDocker = require('is-docker')();
const webpack = require('webpack');

module.exports = function (config) {
  config.set({
    frameworks: ['jasmine', 'source-map-support'],
    reporters: ['progress', 'kjhtml'],
    plugins: [
      'karma-webpack',
      'karma-chrome-launcher',
      'karma-jasmine',
      'karma-jasmine-html-reporter',
      'karma-source-map-support',
      'karma-sourcemap-loader',
      'karma-coverage',
      new webpack.SourceMapDevToolPlugin({
        /*
         * filename: null, // if no value is provided the sourcemap is inlined
         */
        filename: '[name].js.map',
        test: /\.js$/i, // process .js files only
      }),
    ],
    files: [
      'pgadmin/static/bundle/slickgrid.js',
      {pattern: 'pgadmin/static/**/*.js', included: false, watched: true},
      {pattern: 'pgadmin/browser/static/js/**/*.js', included: false, watched: true},
      {pattern: 'regression/javascript/**/*.js', watched: true},
    ],

    // list of files to exclude
    exclude: [
      'pgadmin/static/vendor/**/*[Tt]est.js',
      'pgadmin/static/vendor/**/*[Ss]pec.js',
    ],

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
      'pgadmin/**/js/**/*.js?': ['sourcemap'],
      'regression/javascript/**/*.js': ['webpack', 'sourcemap'],
      'pgadmin/static/bundle/slickgrid.js': ['webpack', 'sourcemap'],
    },

    // optionally, configure the reporter
    coverageReporter: {
      reporters: [
        // reporters not supporting the `file` property
        { type: 'html', subdir: 'report-html' },
        { type: 'lcovonly', subdir: 'report-lcov' },
      ],
      dir : 'coverage/',
      includeAllSources: true,
    },

    webpack: webpackConfig,
    webpackMiddleware: {
      stats: 'errors-only',
    },

    port: 9876,

    // enable / disable colors in the output (reporters and logs)
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_WARN,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: true,
    usePolling: true,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    customLaunchers: {
      ChromeCustom: {
        base: 'ChromeHeadless',
        // We must disable the Chrome sandbox when running Chrome inside Docker (Chrome's sandbox needs
        // more permissions than Docker allows by default)
        flags: isDocker ? ['--no-sandbox'] : [],
      },
    },
    browsers: ['ChromeCustom'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity,
  });
};
