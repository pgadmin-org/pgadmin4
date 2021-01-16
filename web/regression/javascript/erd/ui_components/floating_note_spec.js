import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import {mount} from 'enzyme';
import '../../helper/enzyme.helper';

import FloatingNote from 'pgadmin.tools.erd/erd_tool/ui_components/FloatingNote';

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

    floatNote = mount(<FloatingNote open={false} onClose={onClose}
      reference={null} noteNode={noteNode} appendTo={document.body} rows={8}/>);

    floatNote.find('textarea').simulate('change', {
      target: {
        value: 'the new note',
      },
    });
    floatNote.find('button[data-label="OK"]').simulate('click');
    expect(noteNode.setNote).toHaveBeenCalledWith('the new note');
    expect(onClose).toHaveBeenCalled();
  });
});
