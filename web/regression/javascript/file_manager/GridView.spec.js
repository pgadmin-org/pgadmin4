/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


import React from 'react';

import { render } from '@testing-library/react';
import Theme from '../../../pgadmin/static/js/Theme';
import { ItemView } from '../../../pgadmin/misc/file_manager/static/js/components/GridView';
import userEvent from '@testing-library/user-event';

describe('GridView', ()=>{


  describe('ItemView', ()=>{
    let row = {'Filename': 'test.sql', 'Size': '1KB', 'file_type': 'dir'},
      ctrlMount = (props)=>{
        return render(<Theme>
          <ItemView
            idx={0}
            selected={false}
            row={row}
            {...props}
          />
        </Theme>);
      };

    it('keydown Escape', async ()=>{
      const onEditComplete = jest.fn();
      ctrlMount({
        onEditComplete: onEditComplete,
      });
      const user = userEvent.setup();
      await user.keyboard('{Escape}');
      expect(onEditComplete).toHaveBeenCalled();
    });
  });
});
