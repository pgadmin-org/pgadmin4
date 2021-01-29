import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import {mount} from 'enzyme';
import '../helper/enzyme.helper';
import { DefaultNodeModel } from '@projectstorm/react-diagrams';

import {TableNodeModel, TableNodeWidget} from 'pgadmin.tools.erd/erd_tool/nodes/TableNode';
import { IconButton, DetailsToggleButton } from 'pgadmin.tools.erd/erd_tool/ui_components/ToolBar';


describe('ERD TableNodeModel', ()=>{
  let modelObj = null;
  beforeAll(()=>{
    spyOn(DefaultNodeModel.prototype, 'serialize').and.returnValue({'key': 'value'});
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
    expect(modelObj.getPortName(2)).toBe('coll-port-2');
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

  it('cloneData', ()=>{
    modelObj.addColumn({name: 'col1', not_null:false, attnum: 0});
    expect(modelObj.cloneData('clonedNode')).toEqual({
      name: 'clonedNode',
      schema: 'erd',
      columns: [{name: 'col1', not_null:false, attnum: 0}],
    });
  });

  describe('setData', ()=>{
    let existPort = jasmine.createSpyObj('port', {
      'removeAllLinks': jasmine.createSpy('removeAllLinks'),
      'getSubtype': 'notset',
    });

    beforeEach(()=>{
      modelObj._data.columns = [
        {name: 'col1', not_null:false, attnum: 0},
        {name: 'col2', not_null:false, attnum: 1},
        {name: 'col3', not_null:false, attnum: 2},
      ];

      spyOn(modelObj, 'getPort').and.callFake((portName)=>{
        /* If new port added there will not be any port */
        if(portName !== 'coll-port-3') {
          return existPort;
        }
      });
      spyOn(modelObj, 'removePort');
      spyOn(modelObj, 'getPortName');
    });

    it('add columns', ()=>{
      spyOn(existPort, 'getSubtype').and.returnValue('many');
      existPort.removeAllLinks.calls.reset();
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
      spyOn(existPort, 'getSubtype').and.returnValue('many');
      existPort.removeAllLinks.calls.reset();
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

    it('remove columns', ()=>{
      spyOn(existPort, 'getSubtype').and.returnValue('one');
      existPort.removeAllLinks.calls.reset();
      modelObj.setData({
        name: 'noname',
        schema: 'erd',
        columns: [
          {name: 'col2', not_null:false, attnum: 1},
          {name: 'col3', not_null:false, attnum: 2},
        ],
      });
      expect(modelObj.getData()).toEqual({
        name: 'noname',
        schema: 'erd',
        columns: [
          {name: 'col2', not_null:false, attnum: 1},
          {name: 'col3', not_null:false, attnum: 2},
        ],
      });

      expect(modelObj.getPortName).toHaveBeenCalledWith(0);
      expect(existPort.removeAllLinks).toHaveBeenCalled();
      expect(modelObj.removePort).toHaveBeenCalledWith(existPort);
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
      },
    });
  });
});

describe('ERD TableNodeWidget', ()=>{
  let node = null;

  beforeEach(()=>{
    jasmineEnzyme();

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
    let nodeWidget = mount(<TableNodeWidget node={node}/>);
    expect(nodeWidget.getDOMNode().className).toBe('table-node ');
    expect(nodeWidget.find('.table-node .table-toolbar').length).toBe(1);
    expect(nodeWidget.find('.table-node .table-schema').text()).toBe('erd');
    expect(nodeWidget.find('.table-node .table-name').text()).toBe('table1');
    expect(nodeWidget.find('.table-node .table-cols').length).toBe(1);
    expect(nodeWidget.find(DetailsToggleButton).length).toBe(1);
    expect(nodeWidget.find(IconButton).findWhere(n => n.prop('title')=='Check note').length).toBe(1);
  });

  it('node selected', ()=>{
    spyOn(node, 'isSelected').and.returnValue(true);
    let nodeWidget = mount(<TableNodeWidget node={node}/>);
    expect(nodeWidget.getDOMNode().className).toBe('table-node selected');
  });

  it('remove note', ()=>{
    node.setNote('');
    let nodeWidget = mount(<TableNodeWidget node={node}/>);
    expect(nodeWidget.find(IconButton).findWhere(n => n.prop('title')=='Check note').length).toBe(0);
  });

  describe('generateColumn', ()=>{
    let nodeWidget = null;

    beforeEach(()=>{
      nodeWidget = mount(<TableNodeWidget node={node}/>);
    });

    it('count', ()=>{
      expect(nodeWidget.find('.table-node .table-cols .col-row').length).toBe(3);
    });

    it('column names', ()=>{
      let cols = nodeWidget.find('.table-node .table-cols .col-row-data');
      expect(cols.at(0).find('.col-name').text()).toBe('id');
      expect(cols.at(1).find('.col-name').text()).toBe('amount');
      expect(cols.at(2).find('.col-name').text()).toBe('desc');
    });

    it('data types', ()=>{
      let cols = nodeWidget.find('.table-node .table-cols .col-row-data');
      expect(cols.at(0).find('.col-datatype').text()).toBe('integer');
      expect(cols.at(1).find('.col-datatype').text()).toBe('number(10,5)');
      expect(cols.at(2).find('.col-datatype').text()).toBe('character varrying(50)');
    });

    it('show_details', (done)=>{
      nodeWidget.setState({show_details: false});
      expect(nodeWidget.find('.table-node .table-cols .col-row-data .col-datatype').length).toBe(0);

      nodeWidget.instance().toggleShowDetails(jasmine.createSpyObj('event', ['preventDefault']));
      /* Dummy set state to wait for toggleShowDetails -> setState to complete */
      nodeWidget.setState({}, ()=>{
        expect(nodeWidget.find('.table-node .table-cols .col-row-data .col-datatype').length).toBe(3);
        done();
      });
    });
  });
});
