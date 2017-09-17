/* eslint-env node */

module.exports = {
  name: 'slickgrid',
  isReference: false,
  createSourceMap: true,
  provide: {},
  shimConfig: {
    shim: {},
    alias: {
      'slickgrid': 'node_modules/slickgrid',
    }
  },
  entry: ['webpack/bundles/slickgrid'],
  dependencies: ['vendor'],
};
