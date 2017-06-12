// Karma configuration
// Generated on Wed Mar 01 2017 14:19:28 GMT-0500 (EST)

module.exports = function(config) {
  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: '',


    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine', 'requirejs'],


    // list of files / patterns to load in the browser
    files: [
      'regression/javascript/test-main.js',
      {pattern: 'regression/javascript/**/*.js', included: false},
      {pattern: 'pgadmin/static/vendor/**/*.js', included: false},
      {pattern: 'pgadmin/static/js/**/*.js', included: false},
      {pattern: 'pgadmin/browser/static/js/**/*.js', included: false},
      {pattern: 'pgadmin/static/img/*.png', included: false}
    ],


    // list of files to exclude
    exclude: [
      'pgadmin/static/vendor/**/*[Tt]est.js',
      'pgadmin/static/vendor/**/*[Ss]pec.js'
    ],


    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {
    },


    // test results reporter to use
    // possible values: 'dots', 'progress'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['progress'],


    // web server port
    port: 9876,


    // enable / disable colors in the output (reporters and logs)
    colors: true,


    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,


    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['PhantomJS'],


    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true,

    // Concurrency level
    // how many browser should be started simultaneous
    concurrency: Infinity
  })
}
