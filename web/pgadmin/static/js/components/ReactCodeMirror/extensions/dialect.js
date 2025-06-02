import { SQLDialect, PostgreSQL } from '@codemirror/lang-sql';
import { foldNodeProp } from '@codemirror/language';

const extraKeywords = 'unsafe';
const keywords = PostgreSQL.spec.keywords.replace(/\b\w\b/, '') + ' ' + extraKeywords;

const PgSQL = SQLDialect.define({
  charSetCasts: true,
  doubleDollarQuotedStrings: false,
  operatorChars: '+-*/<>=~!@#%^&|`?',
  specialVar: '',
  keywords: keywords,
  types: PostgreSQL.spec.types,
}).configureLanguage({
  // Disable default folding behavior as it conflicts with custom folding
  props: [
    foldNodeProp.add({
      Statement() { return null; },
      BlockComment() { return null; }
    }),
  ]
});

export default PgSQL;
