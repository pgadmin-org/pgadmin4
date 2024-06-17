import { SQLDialect, PostgreSQL } from '@codemirror/lang-sql';

const extraKeywords = 'unsafe';
const keywords = PostgreSQL.spec.keywords.replace(/\b\w\b/, '') + ' ' + extraKeywords;

const PgSQL = SQLDialect.define({
  charSetCasts: true,
  doubleDollarQuotedStrings: false,
  operatorChars: '+-*/<>=~!@#%^&|`?',
  specialVar: '',
  keywords: keywords,
  types: PostgreSQL.spec.types,
});
export default PgSQL;
