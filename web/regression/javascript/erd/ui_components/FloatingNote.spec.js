/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';

import FloatingNote from 'pgadmin.tools.erd/erd_tool/components/FloatingNote';
import Theme from '../../../../pgadmin/static/js/Theme';
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

describe('ERD FloatingNote', ()=>{

  it('<FloatingNote /> on OK click', async ()=>{
    let floatNote = null;
    let onClose = jest.fn();
    let noteNode = {
      getNote: function() {
        return 'some note';
      },
      setNote: jest.fn(),
      getSchemaTableName: function() {
        return ['schema1', 'table1'];
      },
    };
    const user = userEvent.setup();

    await act(async ()=>{
      floatNote = await render(
        <Theme>
          <FloatingNote
            open={true} onClose={onClose} anchorEl={document.body} rows={8} noteNode={noteNode}
          />
        </Theme>);
    });

    await user.clear(floatNote.container.querySelector('textarea'));
    await user.type(floatNote.container.querySelector('textarea'), 'the new note');
    await user.click(floatNote.container.querySelector('button'));
    expect(noteNode.setNote).toHaveBeenCalledWith('the new note');
    expect(onClose).toHaveBeenCalled();
  });
});
