/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import '../helper/enzyme.helper';
import { createMount } from '@material-ui/core/test-utils';
import Theme from '../../../pgadmin/static/js/Theme';
import { ItemView } from '../../../pgadmin/misc/file_manager/static/js/components/GridView';

describe('GridView', ()=>{
  let mount;

  /* Use createMount so that material ui components gets the required context */
  /* https://material-ui.com/guides/testing/#api */
  beforeAll(()=>{
    mount = createMount();
  });

  afterAll(() => {
    mount.cleanUp();
  });

  beforeEach(()=>{
    jasmineEnzyme();
  });

  describe('ItemView', ()=>{
    let row = {'Filename': 'test.sql', 'Size': '1KB', 'file_type': 'dir'},
      ctrlMount = (props)=>{
        return mount(<Theme>
          <ItemView
            idx={0}
            selected={false}
            row={row}
            {...props}
          />
        </Theme>);
      };

    it('keydown Escape', (done)=>{
      const onEditComplete = jasmine.createSpy('onEditComplete');
      let ctrl = ctrlMount({
        onEditComplete: onEditComplete,
      });
      setTimeout(()=>{
        ctrl.update();
        ctrl.find('div[data-test="filename-div"]').simulate('keydown', { code: 'Escape'});
        setTimeout(()=>{
          expect(onEditComplete).toHaveBeenCalled();
          done();
        });
      }, 0);
    });
  });
});
