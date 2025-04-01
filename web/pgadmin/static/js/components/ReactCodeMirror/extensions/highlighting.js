import {
  syntaxHighlighting,
} from '@codemirror/language';

import {tagHighlighter, tags} from '@lezer/highlight';

export const extendedClassHighlighter = tagHighlighter([
  {tag: tags.keyword, class: 'tok-keyword'},
  {tag: tags.number, class: 'tok-number'},
  {tag: tags.string, class: 'tok-string'},
  {tag: tags.variableName, class: 'tok-variableName'},
  {tag: tags.propertyName, class: 'tok-propertyName'},
  {tag: tags.local(tags.variableName), class: 'tok-variableName tok-local'},
  {tag: tags.definition(tags.variableName), class: 'tok-variableName tok-definition'},
  {tag: tags.special(tags.variableName), class: 'tok-variableName2'},
  {tag: tags.definition(tags.propertyName), class: 'tok-propertyName tok-definition'},
  {tag: tags.operator, class: 'tok-operator'},
  {tag: tags.comment, class: 'tok-comment'},
  {tag: tags.punctuation, class: 'tok-punctuation'},
  {tag: tags.typeName, class: 'tok-typeName'},
  {tag: tags.namespace, class: 'tok-namespace'},
  {tag: tags.name, class: 'tok-name'},
  {tag: tags.standard(tags.name), class: 'tok-name2'},
]);

export default syntaxHighlighting(extendedClassHighlighter);
