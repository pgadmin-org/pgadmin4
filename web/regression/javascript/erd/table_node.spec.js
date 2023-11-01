
import React from 'react';


import { DefaultNodeModel } from '@projectstorm/react-diagrams';

import {TableNodeModel, TableNodeWidget} from 'pgadmin.tools.erd/erd_tool/nodes/TableNode';
import Theme from '../../../pgadmin/static/js/Theme';
import { render } from '@testing-library/react';


describe('ERD TableNodeModel', ()=>{
  let modelObj = null;
  beforeAll(()=>{
    jest.spyOn(DefaultNodeModel.prototype, 'serialize').mockReturnValue({'key': 'value'});
  });
  beforeEach(()=>{
    modelObj = new TableNodeModel({
      color: '#000',
      otherInfo: {
        note: 'some note',
        data: {
          name: 'table1',
          schema: 'erd',
        },
      },
    });
  });

  it('init', ()=>{
    expect(modelObj.getData()).toEqual({
      columns: [],
      name: 'table1',
      schema: 'erd',
    });
    expect(modelObj.getNote()).toBe('some note');
    expect(modelObj.getColumns()).toEqual([]);
  });

  it('getPortName', ()=>{
    expect(modelObj.getPortName(2)).toBe('coll-port-2-right');
  });

  it('setNote', ()=>{
    modelObj.setNote('some note to test');
    expect(modelObj.getNote()).toBe('some note to test');
  });

  it('addColumn', ()=>{
    modelObj.addColumn({name: 'col1', not_null:false, attnum: 0});
    expect(modelObj.getColumns()).toEqual([{name: 'col1', not_null:false, attnum: 0}]);
  });

  it('getColumnAt', ()=>{
    modelObj.addColumn({name: 'col1', not_null:false, attnum: 0});
    modelObj.addColumn({name: 'col2', not_null:false, attnum: 1});
    expect(modelObj.getColumnAt(0)).toEqual({name: 'col1', not_null:false, attnum: 0});
    expect(modelObj.getColumnAt(1)).toEqual({name: 'col2', not_null:false, attnum: 1});
    expect(modelObj.getColumnAt(2)).toBeUndefined();
  });

  it('setName', ()=>{
    modelObj.setName('changedName');
    expect(modelObj.getData().name).toBe('changedName');
  });

  describe('setData', ()=>{
    let existPort = {
      'removeAllLinks': jest.fn(),
    };

    beforeEach(()=>{
      modelObj._data.columns = [
        {name: 'col1', not_null:false, attnum: 0},
        {name: 'col2', not_null:false, attnum: 1},
        {name: 'col3', not_null:false, attnum: 2},
      ];

      jest.spyOn(modelObj, 'getPort').mockImplementation((portName)=>{
        /* If new port added there will not be any port */
        if(portName !== 'coll-port-3') {
          return existPort;
        }
      });
      jest.spyOn(modelObj, 'removePort').mockImplementation(() => {});
      jest.spyOn(modelObj, 'getPortName').mockImplementation(() => {});
    });

    it('add columns', ()=>{
      existPort.removeAllLinks.mockClear();
      modelObj.setData({
        name: 'noname',
        schema: 'erd',
        columns: [
          {name: 'col1', not_null:false, attnum: 0},
          {name: 'col2', not_null:false, attnum: 1},
          {name: 'col3', not_null:false, attnum: 2},
          {name: 'col4', not_null:false, attnum: 3},
        ],
      });
      expect(modelObj.getData()).toEqual({
        name: 'noname',
        schema: 'erd',
        columns: [
          {name: 'col1', not_null:false, attnum: 0},
          {name: 'col2', not_null:false, attnum: 1},
          {name: 'col3', not_null:false, attnum: 2},
          {name: 'col4', not_null:false, attnum: 3},
        ],
      });
      expect(existPort.removeAllLinks).not.toHaveBeenCalled();
    });

    it('update columns', ()=>{
      existPort.removeAllLinks.mockClear();
      modelObj.setData({
        name: 'noname',
        schema: 'erd',
        columns: [
          {name: 'col1', not_null:false, attnum: 0, is_primary_key: false},
          {name: 'col2updated', not_null:false, attnum: 1, is_primary_key: false},
          {name: 'col3', not_null:true, attnum: 2, is_primary_key: false},
        ],
      });
      expect(modelObj.getData()).toEqual({
        name: 'noname',
        schema: 'erd',
        columns: [
          {name: 'col1', not_null:false, attnum: 0, is_primary_key: false},
          {name: 'col2updated', not_null:false, attnum: 1, is_primary_key: false},
          {name: 'col3', not_null:true, attnum: 2, is_primary_key: false},
        ],
      });
      expect(existPort.removeAllLinks).not.toHaveBeenCalled();
    });
  });

  it('getSchemaTableName', ()=>{
    expect(modelObj.getSchemaTableName()).toEqual(['erd', 'table1']);
  });

  it('serializeData', ()=>{
    modelObj.addColumn({name: 'col1', not_null:false, attnum: 0});
    expect(modelObj.serializeData()).toEqual({
      name: 'table1',
      schema: 'erd',
      columns: [{name: 'col1', not_null:false, attnum: 0}],
    });
  });

  it('serialize', ()=>{
    let retVal = modelObj.serialize();
    expect(DefaultNodeModel.prototype.serialize).toHaveBeenCalled();
    expect(retVal).toEqual({
      key: 'value',
      otherInfo:  {
        data: {
          columns: [],
          name: 'table1',
          schema: 'erd',
        },
        note: 'some note',
        metadata: {
          data_failed: false, is_promise: false
        }
      },
    });
  });
});

describe('ERD TableNodeWidget', ()=>{
  let node = null;

  beforeEach(()=>{


    node = new TableNodeModel({
      color: '#000',
      otherInfo: {
        note: 'some note',
        data: {
          name: 'table1',
          schema: 'erd',
          columns: [{
            attnum: 0,
            is_primary_key: true,
            name: 'id',
            cltype: 'integer',
            attlen: null,
            attprecision: null,
          }, {
            attnum: 1,
            is_primary_key: false,
            name: 'amount',
            cltype: 'number',
            attlen: 10,
            attprecision: 5,
          }, {
            attnum: 2,
            is_primary_key: false,
            name: 'desc',
            cltype: 'character varrying',
            attlen: 50,
            attprecision: null,
          }],
        },
      },
    });
  });

  it('render', ()=>{
    let nodeWidget = render(<Theme><TableNodeWidget node={node}/></Theme>);
    expect(nodeWidget.container.querySelectorAll('[aria-label="Show Details"]').length).toBe(1);
    expect(nodeWidget.container.querySelectorAll('[aria-label="Check Note"]').length).toBe(1);
    expect(nodeWidget.container.querySelectorAll('div[data-test="schema-name"]').length).toBe(1);
    expect(nodeWidget.container.querySelectorAll('div[data-test="table-name"]').length).toBe(1);
    expect(nodeWidget.container.querySelectorAll('div[data-test="column-row"]').length).toBe(3);
  });

  it('remove note', ()=>{
    node.setNote('');
    let nodeWidget = render(<Theme><TableNodeWidget node={node}/></Theme>);
    expect(nodeWidget.container.querySelectorAll('[aria-label="Check Note"]').length).toBe(0);
  });

  describe('generateColumn', ()=>{
    let nodeWidget = null;

    beforeEach(()=>{
      nodeWidget = render(<Theme><TableNodeWidget node={node}/></Theme>);
    });

    it('count', ()=>{
      expect(nodeWidget.container.querySelectorAll('div[data-test="column-row"]').length).toBe(3);
    });

    it('column names', ()=>{
      let cols = nodeWidget.container.querySelectorAll('div[data-test="column-row"]');

      expect(cols[0].querySelector('span[data-test="column-name"]').textContent).toBe('id');
      expect(cols[1].querySelector('span[data-test="column-name"]').textContent).toBe('amount');
      expect(cols[2].querySelector('span[data-test="column-name"]').textContent).toBe('desc');
    });

    it('data types', ()=>{
      let cols = nodeWidget.container.querySelectorAll('div[data-test="column-row"]');

      expect(cols[0].querySelector('span[data-test="column-type"]').textContent).toBe('integer');
      expect(cols[1].querySelector('span[data-test="column-type"]').textContent).toBe('number(10,5)');
      expect(cols[2].querySelector('span[data-test="column-type"]').textContent).toBe('character varrying(50)');
    });
  });
});
