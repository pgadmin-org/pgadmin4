/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import TableDialog from './TableDialog';
import OneToManyDialog from './OneToManyDialog';
import ManyToManyDialog from './ManyToManyDialog';
import pgBrowser from 'top/browser/static/js/browser';
import 'sources/backgrid.pgadmin';
import 'sources/backform.pgadmin';

export default function getDialog(dialogName) {
  if(dialogName === 'table_dialog') {
    return new TableDialog(pgBrowser);
  } else if(dialogName === 'onetomany_dialog') {
    return new OneToManyDialog(pgBrowser);
  } else if(dialogName === 'manytomany_dialog') {
    return new ManyToManyDialog(pgBrowser);
  }
}
