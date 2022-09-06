import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import {mount} from 'enzyme';
import '../../helper/enzyme.helper';

import FloatingNote from 'pgadmin.tools.erd/erd_tool/components/FloatingNote';
import Theme from '../../../../pgadmin/static/js/Theme';

describe('ERD FloatingNote', ()=>{

  beforeEach(()=>{
    jasmineEnzyme();
  });

  it('<FloatingNote /> on OK click', ()=>{
    let floatNote = null;
    let onClose = jasmine.createSpy('onClose');
    let noteNode = {
      getNote: function() {
        return 'some note';
      },
      setNote: jasmine.createSpy('setNote'),
      getSchemaTableName: function() {
        return ['schema1', 'table1'];
      },
    };

    floatNote = mount(
      <Theme>
        <FloatingNote
          open={true} onClose={onClose} anchorEl={document.body} rows={8} noteNode={noteNode}
        />
      </Theme>);

    floatNote.find('textarea').simulate('change', {
      target: {
        value: 'the new note',
      },
    });

    floatNote.find('DefaultButton').simulate('click');
    expect(noteNode.setNote).toHaveBeenCalledWith('the new note');
    expect(onClose).toHaveBeenCalled();
  });
});
