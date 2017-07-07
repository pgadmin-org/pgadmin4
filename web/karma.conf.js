// Karma configuration
// Generated on Wed Mar 01 2017 14:19:28 GMT-0500 (EST)
const webpackConfig = require('./webpack.test.config.js');

module.exports = function (config) {
  config.set({
    frameworks: ['jasmine'],
    reporters: ['progress', 'kjhtml'],
    plugins: [
      'karma-webpack',
      'karma-phantomjs-launcher',
      'karma-jasmine',
      'karma-jasmine-html-reporter',
    ],
    files: [
      {pattern: 'pgadmin/static/**/*.js', included: false},
      {pattern: 'pgadmin/static/vendor/**/*.js', included: false},
      {pattern: 'pgadmin/browser/static/js/**/*.js', included: false},
      'regression/javascript/**/*.jsx',
      'regression/javascript/**/*.js',
      'pgadmin/static/bundle/slickgrid.js',
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


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['PhantomJS'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: false,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity,
  });
};
