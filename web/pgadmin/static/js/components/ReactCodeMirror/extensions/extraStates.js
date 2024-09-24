/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { Facet, Compartment } from '@codemirror/state';

export const indentNewLine = Facet.define({
  combine: values => values.length ? values[0] : true,
});

export const eol = Facet.define({
  combine: values => values.length ? values[0] : '\n',
});

export const autoCompleteCompartment = new Compartment();
export const eolCompartment = new Compartment();

