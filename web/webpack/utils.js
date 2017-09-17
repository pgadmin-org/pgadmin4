const _ = require('underscore');
const path = require('path');
const logger = require('./logger');
const ExtractTextPlugin = require("extract-text-webpack-plugin");

var mergeObject = function(_dest, _ref, _member, _parent) {
      logger.debug2(
        '--> mergeObject (%s [DEST], %s [REF], %s, %s)',
        _dest.name, _ref.name, _member, _parent
      );
      if (_.isUndefined(_parent)) {
        logger.debug2('[REF] %s', JSON.stringify(_ref[_member]));

        _dest[_member] = _dest[_member] || {};

        logger.debug2('[DEST] %s', JSON.stringify(_dest[_member]));
        _.extend(
          _dest[_member],
          _.extend(
            {}, _ref[_member] || {}, _dest[_member]
          )
        );
        logger.debug2('[RESULT] %s', JSON.stringify(_dest[_member]));
      } else {
        _dest[_parent] = _dest[_parent] || {};
        _dest[_parent][_member] = _dest[_parent][_member] || {};

        logger.debug2('[REF] %s', JSON.stringify(_ref[_parent][_member]));
        logger.debug2('[DEST] %s', JSON.stringify(_dest[_parent][_member]));

        _.extend(
          _dest[_parent][_member],
          _.extend(
            {}, _ref[_parent][_member] || {}, _dest[_parent][_member]
          )
        );
        logger.debug2('[RESULT] %s', JSON.stringify(_dest[_parent][_member]));
      }
    },
    mergeArray = function(_dest, _ref, _member, _parent, _prepend) {
      logger.debug2(
        '--> mergeArray (%s [DEST], %s [REF], %s, %s, %s)',
        _dest.name, _ref.name, _parent, _member, _prepend
      );
      if (_.isUndefined(_parent)) {
        logger.debug2(
          '[REF] %s', JSON.stringify(_ref[_member])
        );
        logger.debug2(
          '[MODULE] %s', JSON.stringify(_dest[_member])
        );
        if (!_prepend)
          _dest[_member] = _.union(_dest[_member] || [], _ref[_member] || []);
        else
          _dest[_member] = _.union(
            [], _ref[_member] || [], _dest[_member] || []
          );
        logger.debug2(
          '[RESULT] %s', JSON.stringify(_dest[_member])
        );
      } else {
        _dest[_parent] = _dest[_parent] || {};
        _dest[_parent][_member] = _dest[_parent][_member] || [];
        logger.debug2(
          '[REF] %s', JSON.stringify(_ref[_parent][_member])
        );
        logger.debug2(
          '[MODULE] %s', JSON.stringify(_dest[_parent][_member])
        );
        if (!_prepend)
          _dest[_parent][_member] = _.union(
            _dest[_parent][_member],
            (_ref[_parent] && _ref[_parent][_member]) || []
          );
        else
          _dest[_parent][_member] = _.union(
            [],
            (_ref[_parent] && _ref[_parent][_member]) || [],
            _dest[_parent][_member]
          );
        logger.debug2(
          '[RESULT] %s', JSON.stringify(_dest[_parent][_member])
        );
      }
    };

var merge = {
  provide: function(_module, _reference) {
    if ('provide' in _module || 'provide' in _reference) {
      var res = _.extend({}, _reference.provide || {}, _module.provide || {});

      _module.provide = res;
    }
  },
  shimConfig: function(_module, _reference) {
    if ('shimConfig' in _reference) {
      _.each(_reference.shimConfig, function(_value, _key) {
        if (_.isArray(_value)) {
          mergeArray(_module, _reference, _key, 'shimConfig');
        } else if (_.isObject(_value)) {
          mergeObject(_module, _reference, _key, 'shimConfig');
        }
      });
    }
  },
  resolve: function(_module, _reference) {
    if ('resolve' in _reference && 'modules' in _reference['resolve']) {
      mergeArray(_module, _reference, 'modules', 'resolve');
    }
  },
  externals: function(_module, _reference) {
    if ('externals' in _reference) {
      mergeArray(_module, _reference, 'externals', undefined);
    }
  },
  _module: function(_module, _reference) {
    if ('module' in _reference) {
      _.each(_reference.module, function(_value, _key) {
        if (_.isArray(_value)) {
          mergeArray(_module, _reference, _key, 'module');
        } else if (_.isObject(_value)) {
          mergeObject(_module, _reference, _key, 'module');
        }
      });
    }
  },
  /*
  stylesheets: function(_module, _reference) {
    logger.debug('Merging the stylesheets of \'%s\' in \'%s\'...', _reference.name, _module.name);
    if ('stylesheets' in _reference) {
      mergeArray(_module, _reference, 'stylesheets', undefined, true);
    }
  }
  */
};

var orderedReferences = [];

const loadBundle= function(_module, _references, _order) {
  var module_path,
      isRootModule = _references ? false : true;

  _references = _references || {};
  _order = _order || [];

  if (_module.startsWith('pgadmin')) {
    module_path = path.resolve(__dirname, '../../', _module);
  } else {
    module_path = path.resolve(__dirname, './modules/', _module);
  }

  var res = null;

  if (_module in _references) {
    res = _references[_module];
    logger.debug('Using the existing module (%s)...', _module);
  } else {
    logger.debug('Loading module (%s) from \'%s\'...', _module, module_path);
    try {
      var mod = require(module_path);
      if (isRootModule) {
        // Let's not consider using the provide for the current module in
        // itself.
        mod.provide = null;
      }

      if (mod.dependencies) {
        _.each(mod.dependencies, function(_dep) {

          if (!(_dep in _references)) {
            var ref = loadBundle(_dep, _references, _order);

            if (_module in _references)
              throw "Circular dependency found between " + mod.name + ' and ' + _module + '.';

            _references[_dep] = ref;
            _order.push(_dep);
          }
        });
      }
      res = mod;
    } catch (e) {
      logger.error(e);
      throw e;
    }
  }

  if (isRootModule) {
    var entries = 0;

    res.references = _references;
    res._order = _.union([], _order);
    res.excludeFromSourceMaps = [];

    _.each(_order, function(_ref, _idx) {
      var mod = res.references[_ref];
      logger.debug('Merging the reference \'%s\' in \'%s\'...', mod.name, res.name);
      if (!mod.isReference) {
        res._order.splice(_idx - entries, 1);
        entries += 1;
      }
      // We would exclude the entries of the other references from the
      // current module.
      if (mod.shimConfig && mod.shimConfig.alias) {
        res.excludeFromSourceMaps = _.union(
          res.excludeFromSourceMaps, _.values(mod.shimConfig.alias)
        );
      }
      _.each(merge, function(mergeFunc) {
        mergeFunc(res, mod);
      });
    });
    res.excludeFromSourceMaps = _.uniq(res.excludeFromSourceMaps);
    _.each(res.excludeFromSourceMaps, function(_name, _idx) {
      res.excludeFromSourceMaps[_idx] = `./${_name}.js`;
    });

    res.module = res.module || {};
    var rules = res.module.rules = res.module.rules || [];

    if (res.includeCSS) {
      rules.unshift({
        test: /\.scss$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: ['css-loader', 'sass-loader']
        })
      }, {
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: ["css-loader"]
        })
      }, {
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        loader: 'file-loader?name=../../js/generated/fonts/[name].[ext]',
        exclude: /vendor/,
      }, {
        test: /\.(jpe?g|png|gif|svg)$/i,
        loaders: [
          'file-loader?hash=sha512&digest=hex&name=../../js/generated/img/[name].[ext]', {
            loader: 'image-webpack-loader',
            query: {
              bypassOnDebug: true,
              mozjpeg: {
                progressive: true,
              },
              gifsicle: {
                interlaced: false,
              },
              optipng: {
                optimizationLevel: 7,
              },
              pngquant: {
                quality: '75-90',
                speed: 3,
              },
            }
          }
        ],
        exclude: /vendor/,
      });
    }
    rules.unshift({
      test: /\.jsx?$/,
      exclude: [/node_modules/, /vendor/],
      use: {
        loader: 'babel-loader',
        options: {
          presets: ['es2015', 'react'],
        },
      },
    });

    if (res.shimConfig) {
      rules.unshift({
        /*
         * Transforms the code in a way that it works in the webpack
         * environment. It uses imports-loader internally to load dependency.
         * Its configuration is specified in webpack.shim.js
         *
         * Ref: https://www.npmjs.com/package/shim-loader
         */
        test: /\.js/,
        loader: 'shim-loader',
        query: {shim: res.shimConfig.shim, resolveAlias: res.shimConfig.alias},
        include: path.resolve(__dirname, '..'),
      });
    }
  }

  return res;
};

const makeModuleFromBundle = function(_module) {
  var res = {
    entry: {},
    output: {
      path: path.resolve(__dirname, '../pgadmin/static/generated/'),
      filename: '[name].js',
    },
    resolve: {
      extensions: ['.js'],
      modules: ['node_modules', '.']
    },
    context: path.resolve(__dirname, '..'),
    module: _module.module,
    plugins: []
  };

  if (!_module.entry) {
    logger.error('Module must define an entry!')
  }

  if (_module.shimConfig) {
    res.resolve.alias = _module.shimConfig.alias;
  }

  if (_module.stylesheets && _module.stylesheets.length) {
    _module.entry = _.union([], _module.stylesheets, _module.entry);
  }
  res['entry'][_module.name] = _module.entry;
  _module.output = _module.output || {};

  res.output.path = _module.output.path || path.resolve(
    __dirname, '../pgadmin/static/js/generated/'
  );

  if (_module.externals)
    res.externals = _module.externals;

  if (_module.resolve) {
    res.resolve.modules = _module.resolve.modules || res.resolve.modules;
    res.resolve.extensions =
      _module.resolve.extensions || res.resolve.extensions;
  }

  res.output.libraryTarget = 'amd';
  if (_module.isReference) {
    _module.output.manifest = _module.output.manifest ||
      path.join(__dirname, 'references', _module.name + '.json');
    res.output.library = "[name]";
  }
  if (_module.includeCSS) {
    res.plugins.push(new ExtractTextPlugin('../../css/generated/' + _module.name + ".css"));
  }

  _.each(_module.references, function(_ref, _key) {
    logger.debug("Updating reference manifest of '%s'...", _key);
    _ref.output = _ref.output || {};
    _ref.output.manifest = _ref.output.manifest || path.join(
      __dirname, 'references', _ref.name + '.json'
    );
  });

  return res;
};

module.exports =  {
  loadBundle: loadBundle,
  makeModuleFromBundle: makeModuleFromBundle,
};
