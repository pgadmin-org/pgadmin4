/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import ERDCore from 'pgadmin.tools.erd/erd_tool/ERDCore';
import * as createEngineLib from '@projectstorm/react-diagrams';
import TEST_TABLES_DATA from './test_tables';
import { FakeLink, FakeNode } from './fake_item';
import { PortModelAlignment } from '@projectstorm/react-diagrams';

describe('ERDCore', ()=>{
  let eleFactory = jasmine.createSpyObj('nodeFactories', {
    'registerFactory': null,
    'getFactory': jasmine.createSpyObj('getFactory', ['generateModel']),
  });
  let erdEngine = jasmine.createSpyObj('engine', {
    'getNodeFactories': eleFactory,
    'getLinkFactories': eleFactory,
    'getPortFactories': eleFactory,
    'getActionEventBus': jasmine.createSpyObj('actionBus', ['fireAction', 'deregisterAction', 'registerAction']),
    'setModel': null,
    'getModel': jasmine.createSpyObj('modelObj', {
      'addNode': null,
      'clearSelection': null,
      'getNodesDict': null,
      'getLinks': null,
      'serialize': ()=>({
        'data': 'serialized',
      }),
      'addLink': null,
      'getNodes': null,
      'setZoomLevel': null,
      'getZoomLevel': null,
      'fireEvent': null,
      'registerListener': null,
    }),
    'repaintCanvas': null,
    'zoomToFitNodes': null,
    'fireEvent': null,
  });

  beforeAll(()=>{
    spyOn(createEngineLib, 'default').and.returnValue(erdEngine);
  });

  it('initialization', ()=>{
    spyOn(ERDCore.prototype, 'initializeEngine').and.callThrough();
    spyOn(ERDCore.prototype, 'initializeModel').and.callThrough();
    spyOn(ERDCore.prototype, 'computeTableCounter').and.callThrough();
    let erdCoreObj = new ERDCore();
    expect(erdCoreObj.initializeEngine).toHaveBeenCalled();
    expect(erdCoreObj.initializeModel).toHaveBeenCalled();
    expect(erdCoreObj.computeTableCounter).toHaveBeenCalled();
  });

  describe('functions', ()=>{
    let erdCoreObj;

    beforeAll(()=>{
      erdCoreObj = new ERDCore();
    });

    describe('cache check', ()=>{
      it('for single value', ()=>{
        erdCoreObj.setCache('key1', 'value1');
        expect(erdCoreObj.getCache('key1')).toEqual('value1');
      });

      it('for multiple value', ()=>{
        erdCoreObj.setCache({'key1': 'valuem1', 'key2': 'valuem2'});
        expect(erdCoreObj.getCache('key1')).toEqual('valuem1');
        expect(erdCoreObj.getCache('key2')).toEqual('valuem2');
      });
    });

    it('registerModelEvent', ()=>{
      let fn = ()=>{/*This is intentional (SonarQube)*/};
      erdCoreObj.registerModelEvent('someEvent', fn);
      expect(erdCoreObj.getModel().registerListener).toHaveBeenCalledWith({
        'someEvent': fn,
      });
    });

    it('getNextTableName', ()=>{
      expect(erdCoreObj.getNextTableName()).toEqual('newtable1');
      expect(erdCoreObj.getNextTableName()).toEqual('newtable2');
    });

    it('getEngine', ()=>{
      expect(erdCoreObj.getEngine()).toBe(erdEngine);
    });

    it('getNewNode', ()=>{
      let data = {name: 'table1'};
      erdCoreObj.getNewNode(data);

      expect(erdEngine.getNodeFactories().getFactory().generateModel).toHaveBeenCalledWith({
        initialConfig: {
          otherInfo: {
            data:data,
            dataUrl: null,
          },
        },
      });
    });

    it('getNewLink', ()=>{
      let data = {name: 'link1'};
      erdCoreObj.getNewLink('linktype', data);

      expect(erdEngine.getLinkFactories().getFactory).toHaveBeenCalledWith('linktype');
      expect(erdEngine.getLinkFactories().getFactory().generateModel).toHaveBeenCalledWith({
        initialConfig: {
          data: data,
        },
      });
    });

    it('getNewPort', ()=>{
      erdEngine.getPortFactories().getFactory().generateModel.calls.reset();
      erdCoreObj.getNewPort('port1', PortModelAlignment.LEFT);
      expect(erdEngine.getPortFactories().getFactory).toHaveBeenCalledWith('onetomany');
      expect(erdEngine.getPortFactories().getFactory().generateModel).toHaveBeenCalledWith({
        initialConfig: {
          data: null,
          options: {
            name: 'port1',
            alignment: PortModelAlignment.LEFT
          },
        },
      });
    });

    it('addNode', ()=>{
      let newNode = new FakeNode({});
      spyOn(newNode, 'setPosition');
      spyOn(erdCoreObj, 'getNewNode').and.returnValue(newNode);
      spyOn(erdCoreObj, 'clearSelection');

      let data = {name: 'link1'};

      /* Without position */
      erdCoreObj.addNode(data);
      expect(erdCoreObj.getNewNode).toHaveBeenCalledWith(data);
      expect(erdEngine.getModel().addNode).toHaveBeenCalledWith(newNode);
      expect(erdCoreObj.clearSelection).toHaveBeenCalled();

      /* With position */
      erdCoreObj.addNode(data, [108, 108]);
      expect(erdCoreObj.getNewNode().setPosition).toHaveBeenCalledWith(108, 108);
    });


    it('addLink', ()=>{
      let node1 = new FakeNode({'name': 'table1'}, 'id1');
      let node2 = new FakeNode({'name': 'table2'}, 'id2');
      spyOn(erdCoreObj, 'getOptimumPorts').and.returnValue([{name: 'port-1'}, {name: 'port-3'}]);
      let nodesDict = {
        'id1': node1,
        'id2': node2,
      };
      let link = new FakeLink();
      spyOn(link, 'setSourcePort').and.callThrough();
      spyOn(link, 'setTargetPort').and.callThrough();
      spyOn(erdEngine.getModel(), 'getNodesDict').and.returnValue(nodesDict);
      spyOn(erdCoreObj, 'getNewLink').and.callFake(function() {
        return link;
      });

      erdCoreObj.addLink({
        'referenced_column_attnum': 1,
        'referenced_table_uid': 'id1',
        'local_column_attnum': 3,
        'local_table_uid': 'id2',
      }, 'onetomany');

      expect(link.setSourcePort).toHaveBeenCalledWith({name: 'port-1'});
      expect(link.setTargetPort).toHaveBeenCalledWith({name: 'port-3'});
    });

    it('serialize', ()=>{
      let retVal = erdCoreObj.serialize();
      expect(retVal.hasOwnProperty('version')).toBeTruthy();
      expect(retVal.hasOwnProperty('data')).toBeTruthy();
      expect(erdEngine.getModel().serialize).toHaveBeenCalled();
    });

    it('deserialize', ()=>{
      let deserialValue = {
        'version': 123,
        'data': {
          'key': 'serialized',
        },
      };
      spyOn(erdCoreObj, 'initializeModel');
      erdCoreObj.deserialize(deserialValue);
      expect(erdCoreObj.initializeModel).toHaveBeenCalledWith(deserialValue.data);
    });

    it('serializeData', ()=>{
      let node1 = new FakeNode({'name': 'table1'}, 'id1');
      let node2 = new FakeNode({'name': 'table2'}, 'id2');
      let nodesDict = {
        'id1': node1,
        'id2': node2,
      };
      spyOn(erdEngine.getModel(), 'getNodesDict').and.returnValue(nodesDict);
      spyOn(erdEngine.getModel(), 'getLinks').and.returnValue([
        new FakeLink({
          'name': 'link1',
        }, 'lid1'),
        new FakeLink({
          'name': 'link2',
        }, 'lid2'),
      ]);
      expect(JSON.stringify(erdCoreObj.serializeData())).toEqual(JSON.stringify({
        nodes: {
          'id1': {'name': 'table1'},
          'id2': {'name': 'table2'},
        },
      }));
    });

    it('deserializeData', (done)=>{
      let nodesDict = {};
      TEST_TABLES_DATA.forEach((table)=>{
        nodesDict[`id-${table.name}`] = {
          getColumns: function() {
            return table.columns;
          },
          getPortName: function(attnum) {
            return `port-${attnum}`;
          },
          getPort: function(name) {
            return {'name': name};
          },
          addPort: function() {
            /*This is intentional (SonarQube)*/
          },
          getData: function() {
            return table;
          }
        };
      });
      spyOn(erdEngine.getModel(), 'getNodesDict').and.returnValue(nodesDict);

      spyOn(erdCoreObj, 'getNewLink').and.callFake(function() {
        return {
          setSourcePort: function() {/*This is intentional (SonarQube)*/},
          setTargetPort: function() {/*This is intentional (SonarQube)*/},
        };
      });
      spyOn(erdCoreObj, 'getNewPort').and.returnValue({id: 'id'});
      spyOn(erdCoreObj, 'addNode').and.callFake(function(data) {
        return new FakeNode({}, `id-${data.name}`);
      });
      spyOn(erdCoreObj, 'addLink');
      spyOn(erdCoreObj, 'dagreDistributeNodes').and.callFake(()=>{/* intentionally empty */});

      erdCoreObj.deserializeData(TEST_TABLES_DATA);
      expect(erdCoreObj.addNode).toHaveBeenCalledTimes(TEST_TABLES_DATA.length);
      expect(erdCoreObj.addLink).toHaveBeenCalledTimes(1);

      setTimeout(()=>{
        expect(erdCoreObj.dagreDistributeNodes).toHaveBeenCalled();
        done();
      }, 500);
    });

    it('clearSelection', ()=>{
      erdCoreObj.clearSelection();
      expect(erdEngine.getModel().clearSelection).toHaveBeenCalled();
    });

    it('repaint', ()=>{
      erdCoreObj.repaint();
      expect(erdEngine.repaintCanvas).toHaveBeenCalled();
    });

    it('getNodesData', ()=>{
      spyOn(erdEngine.getModel(), 'getNodes').and.returnValue([
        new FakeNode({name:'node1'}),
        new FakeNode({name:'node2'}),
      ]);
      expect(JSON.stringify(erdCoreObj.getNodesData())).toEqual(JSON.stringify([
        {name:'node1'}, {name:'node2'},
      ]));
    });

    it('zoomIn', ()=>{
      spyOn(erdEngine.getModel(), 'getZoomLevel').and.returnValue(100);
      spyOn(erdCoreObj, 'repaint');
      erdCoreObj.zoomIn();
      expect(erdEngine.getModel().setZoomLevel).toHaveBeenCalledWith(125);
      expect(erdCoreObj.repaint).toHaveBeenCalled();
    });

    it('zoomOut', ()=>{
      spyOn(erdEngine.getModel(), 'getZoomLevel').and.returnValue(100);
      spyOn(erdCoreObj, 'repaint');
      erdCoreObj.zoomOut();
      expect(erdEngine.getModel().setZoomLevel).toHaveBeenCalledWith(75);
      expect(erdCoreObj.repaint).toHaveBeenCalled();
    });

    it('zoomToFit', ()=>{
      erdCoreObj.zoomToFit();
      expect(erdEngine.zoomToFitNodes).toHaveBeenCalled();
    });

    it('fireAction', ()=>{
      erdCoreObj.fireAction({key: 'xyz'});
      expect(erdEngine.getActionEventBus().fireAction).toHaveBeenCalled();
    });

    it('fireEvent', ()=>{
      erdCoreObj.fireEvent({key: 'xyz'}, 'someevent', false);
      expect(erdEngine.fireEvent).toHaveBeenCalledWith({key: 'xyz'}, 'someevent');

      erdCoreObj.fireEvent({key: 'xyz'}, 'someevent', true);
      expect(erdEngine.getModel().fireEvent).toHaveBeenCalledWith({key: 'xyz'}, 'someevent');
    });

    it('registerKeyAction', ()=>{
      erdCoreObj.registerKeyAction({key: 'xyz'});
      expect(erdEngine.getActionEventBus().registerAction).toHaveBeenCalledWith({key: 'xyz'});
    });

    it('deregisterKeyAction', ()=>{
      let action = {key: 'xyz'};
      erdCoreObj.deregisterKeyAction(action);
      expect(erdEngine.getActionEventBus().deregisterAction).toHaveBeenCalledWith({key: 'xyz'});
    });
  });
});
