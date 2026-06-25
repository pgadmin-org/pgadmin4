/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// RuleTester spec for the local `register-schema` ESLint rule. The
// rule enforces design D10: every default-exported BaseUISchema
// subclass must be wrapped in `registerSchema()`. CI fails when a
// schema author forgets the wrap; the audit harness then sees a
// missing entry rather than a silent gap.
//
// Cases covered:
//   - direct class extending BaseUISchema with no wrap → ERROR
//   - identifier export (class declared above) with no wrap → ERROR
//   - identifier export wrapped in registerSchema → OK
//   - class expression wrapped in registerSchema → OK
//   - identifier export wrapped in a different function → ERROR
//     (e.g. someoneWrappingFn(Foo) hides the schema; rule should
//     surface it so the wrap is corrected to registerSchema)
//   - class not extending BaseUISchema → OK (rule ignores)
//   - default export that isn't a class → OK
//   - schema declared but NOT default-exported → OK (it's an inner
//     helper, registry only tracks default exports)

const { RuleTester } = require('eslint');
const babelParser = require('@babel/eslint-parser');
const rule = require('../../../eslint-plugins/local-rules/rules/register-schema');

const ruleTester = new RuleTester({
  languageOptions: {
    parser: babelParser,
    parserOptions: {
      requireConfigFile: false,
      babelOptions: {
        configFile: false,
        babelrc: false,
        presets: [],
        plugins: ['@babel/plugin-syntax-jsx'],
      },
    },
    sourceType: 'module',
    ecmaVersion: 2022,
  },
});

ruleTester.run('register-schema', rule, {
  valid: [
    {
      name: 'identifier export wrapped in registerSchema',
      code: `
        import BaseUISchema from 'sources/SchemaView/base_schema.ui';
        import { registerSchema } from 'sources/SchemaView/SchemaState';
        class FooSchema extends BaseUISchema {}
        export default registerSchema(FooSchema);
      `,
    },
    {
      name: 'class expression wrapped in registerSchema',
      code: `
        import BaseUISchema from 'sources/SchemaView/base_schema.ui';
        import { registerSchema } from 'sources/SchemaView/SchemaState';
        export default registerSchema(class FooSchema extends BaseUISchema {});
      `,
    },
    {
      name: 'class not extending BaseUISchema is ignored',
      code: `
        class Helper {}
        export default Helper;
      `,
    },
    {
      name: 'default export of non-class is ignored',
      code: `
        export default { foo: 1 };
      `,
    },
    {
      name: 'schema declared but not default-exported is ignored',
      code: `
        import BaseUISchema from 'sources/SchemaView/base_schema.ui';
        class InnerHelperSchema extends BaseUISchema {}
        export const inner = new InnerHelperSchema();
        export default {};
      `,
    },
    {
      name: 'identifier export of non-schema variable',
      code: `
        const x = 42;
        export default x;
      `,
    },
  ],
  invalid: [
    {
      name: 'direct class declaration extending BaseUISchema with no wrap',
      code: `
        import BaseUISchema from 'sources/SchemaView/base_schema.ui';
        export default class FooSchema extends BaseUISchema {}
      `,
      errors: [{ messageId: 'missingWrap' }],
    },
    {
      name: 'identifier export with no wrap',
      code: `
        import BaseUISchema from 'sources/SchemaView/base_schema.ui';
        class FooSchema extends BaseUISchema {}
        export default FooSchema;
      `,
      errors: [{ messageId: 'missingWrap' }],
    },
    {
      name: 'identifier export wrapped in unrelated function',
      code: `
        import BaseUISchema from 'sources/SchemaView/base_schema.ui';
        function decorate(x) { return x; }
        class FooSchema extends BaseUISchema {}
        export default decorate(FooSchema);
      `,
      errors: [{ messageId: 'missingWrap' }],
    },
    {
      name: 'direct class expression in non-registerSchema call',
      code: `
        import BaseUISchema from 'sources/SchemaView/base_schema.ui';
        function decorate(x) { return x; }
        export default decorate(class FooSchema extends BaseUISchema {});
      `,
      errors: [{ messageId: 'missingWrap' }],
    },
  ],
});

// RuleTester throws on first failure — reaching here means all cases passed.
test('register-schema rule passes all RuleTester cases', () => {
  expect(true).toBe(true);
});
