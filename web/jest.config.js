const webpackShimAlias = require('./webpack.shim').resolveAlias;

const webpackAliasToJestModules = ()=>{
  const ret = {
    '\\.svg': '<rootDir>/regression/javascript/__mocks__/svg.js'
  };
  Object.keys(webpackShimAlias).forEach((an)=>{
    // eg - sources: ./pgadmin/static/js/ to '^sources/(.*)$': '<rootDir>/pgadmin/static/js/$1'
    let ap = webpackShimAlias[an].replace(__dirname, '<rootDir>');
    if(ap.endsWith('/')) {
      ret[`^${an}/(.*)$`] = ap + '$1';
      return;
    }
    ret[`^${an}$`] = ap;
  });

  // Overrides
  ret['^translations$'] = '<rootDir>/regression/javascript/fake_translations';
  ret['^pgadmin.browser.messages$'] = '<rootDir>/regression/javascript/fake_messages';
  ret['^pgadmin.browser.endpoints$'] = '<rootDir>/regression/javascript/fake_endpoints';
  ret['^pgadmin.browser.translations$'] = '<rootDir>/regression/javascript/fake_translations';
  ret['^pgadmin.user_management.current_user$'] = '<rootDir>/regression/javascript/fake_current_user';
  ret['^pgadmin.server.supported_servers$'] = '<rootDir>/regression/javascript/fake_supported_servers';

  const sources = ret['^sources/(.*)$'];
  delete ret['^sources/(.*)$'];

  ret['^sources/pgadmin$'] = '<rootDir>/regression/javascript/fake_pgadmin';
  ret['^sources/gettext$'] = '<rootDir>/regression/javascript/fake_gettext';
  ret['^sources/(.*)$'] = sources;

  // Only for tests
  ret['^pgadmin.schema.dir/(.*)$'] = '<rootDir>/pgadmin/browser/server_groups/servers/databases/schemas/static/js/$1';
  ret['^browser/(.*)$'] = '<rootDir>/pgadmin/browser/static/js/$1';

  return ret;
};

module.exports = {
  'roots': ['<rootDir>/pgadmin/', '<rootDir>/regression/javascript'],
  'moduleFileExtensions': ['js', 'jsx', 'ts', 'tsx'],
  'moduleNameMapper': webpackAliasToJestModules(),
  'transform': {
    '^.+\\.(js|jsx|mjs|cjs|ts|tsx)$': 'babel-jest',
  },
  'setupFilesAfterEnv': [
    '<rootDir>/regression/javascript/setup-jest.js',
  ],
  'testMatch': [
    '<rootDir>/regression/javascript/**/*{spec,test}.{js,jsx,ts,tsx}'
  ],
  'testEnvironment': 'jsdom',
  'transformIgnorePatterns': [
    '[/\\\\]node_modules[/\\\\](?!react-dnd|dnd-core|@react-dnd).+\\.(js|jsx|mjs|cjs|ts|tsx)$',
    '^.+\\.module\\.(css|sass|scss)$'
  ]
};
