/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import React from 'react';

import { render, screen, waitFor } from '@testing-library/react';
import Theme from '../../../pgadmin/static/js/Theme';
import { FileNameEditor } from '../../../pgadmin/misc/file_manager/static/js/components/ListView';
import userEvent from '@testing-library/user-event';

describe('ListView', ()=>{


  describe('FileNameEditor', ()=>{
    let row = {'Filename': 'test.sql', 'Size': '1KB'},
      column = {
        key: 'Filename'
      },
      ctrlMount = (props)=>{
        return render(<Theme>
          <FileNameEditor
            row={row}
            column={column}
            {...props}
          />
        </Theme>);
      };

    it('init', async ()=>{
      ctrlMount({
        onRowChange: ()=>{/* test func */},
        onClose: ()=>{/* test func */},
      });
      await waitFor(()=>{
        expect(screen.getByRole('textbox').value).toEqual('test.sql');
      });
    });

    it('keydown Tab', async ()=>{
      let onCloseSpy = jest.fn();
      ctrlMount({
        onRowChange: ()=>{/* test func */},
        onClose: onCloseSpy,
      });
      const user = userEvent.setup();
      await user.type(screen.getByRole('textbox'), '{Tab}');
      expect(onCloseSpy).toHaveBeenCalled();
    });
  });
});
