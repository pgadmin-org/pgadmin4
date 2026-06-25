/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

// marked ships ESM-only; jest.config.js routes the module here.
// AIReport / NLQChatPanel only use it to render LLM responses to HTML
// at runtime — Jest tests on those components mock the network
// response and check component state, not rendered Markdown. A
// passthrough that wraps input as a <p> string is enough to satisfy
// module-load and not break smoke-style assertions.

const passthrough = (md) => {
  if (md == null) return '';
  return `<p>${String(md)}</p>`;
};

passthrough.parse = passthrough;
passthrough.parseInline = passthrough;
passthrough.use = () => passthrough;
passthrough.setOptions = () => passthrough;
passthrough.Renderer = function Renderer() {};
passthrough.Tokenizer = function Tokenizer() {};

export const marked = passthrough;
export const parse = passthrough;
export const parseInline = passthrough;
export default passthrough;
