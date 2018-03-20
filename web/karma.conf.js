// Karma configuration
const webpackConfig = require('./webpack.test.config.js');
const isDocker = require('is-docker')();

module.exports = function (config) {
  config.set({
    frameworks: ['jasmine'],
    reporters: ['progress', 'kjhtml'],
    plugins: [
      'karma-webpack',
      'karma-chrome-launcher',
      'karma-jasmine',
      'karma-jasmine-html-reporter',
    ],
    files: [
      'pgadmin/static/bundle/slickgrid.js',
      {pattern: 'pgadmin/static/**/*.js', included: false, watched: true},
      {pattern: 'pgadmin/browser/static/js/**/*.js', included: false, watched: true},
      'regression/javascript/**/*.jsx',
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
      'regression/javascript/**/*.js': ['webpack'],
      'regression/javascript/**/*.jsx': ['webpack'],
      'pgadmin/static/bundle/slickgrid.js': ['webpack'],
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
