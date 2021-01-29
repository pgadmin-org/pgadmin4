/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import ERDCore from 'pgadmin.tools.erd/erd_tool/ERDCore';
import * as createEngineLib from '@projectstorm/react-diagrams';
import TEST_TABLES_DATA from './test_tables';

describe('ERDCore', ()=>{
  let eleFactory = jasmine.createSpyObj('nodeFactories', {
    'registerFactory': null,
    'getFactory': jasmine.createSpyObj('getFactory', ['generateModel', 'calculateRoutingMatrix']),
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
      let fn = ()=>{};
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
      let data = {name: 'link1'};
      let options = {opt1: 'val1'};
      erdCoreObj.getNewPort('porttype', data, options);

      expect(erdEngine.getPortFactories().getFactory).toHaveBeenCalledWith('porttype');
      expect(erdEngine.getPortFactories().getFactory().generateModel).toHaveBeenCalledWith({
        initialConfig: {
          data:data,
          options:options,
        },
      });
    });

    it('addNode', ()=>{
      let newNode = jasmine.createSpyObj('newNode', ['setPosition']);
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
      let nodesDict = {
        'id1': {
          serializeData: function(){ return {
            'name': 'table1',
          };},
          getPortName: function(attnum) {
            return `port-${attnum}`;
          },
          getPort: function() {
            return null;
          },
          addPort: jasmine.createSpy('addPort').and.callFake((obj)=>obj),
        },
        'id2': {
          serializeData: function(){ return {
            'name': 'table2',
          };},
          getPortName: function(attnum) {
            return `port-${attnum}`;
          },
          getPort: function() {
            return null;
          },
          addPort: jasmine.createSpy('addPort').and.callFake((obj)=>obj),
        },
      };
      let link = jasmine.createSpyObj('link', ['setSourcePort', 'setTargetPort']);
      spyOn(erdEngine.getModel(), 'getNodesDict').and.returnValue(nodesDict);
      spyOn(erdCoreObj, 'getNewLink').and.callFake(function() {
        return link;
      });
      spyOn(erdCoreObj, 'getNewPort').and.callFake(function(type, initData, options) {
        return {
          name: options.name,
        };
      });

      erdCoreObj.addLink({
        'referenced_column_attnum': 1,
        'referenced_table_uid': 'id1',
        'local_column_attnum': 3,
        'local_table_uid': 'id2',
      }, 'onetomany');

      expect(nodesDict['id1'].addPort).toHaveBeenCalledWith({name: 'port-1'});
      expect(nodesDict['id2'].addPort).toHaveBeenCalledWith({name: 'port-3'});
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
      spyOn(erdEngine.getModel(), 'getNodesDict').and.returnValue({
        'id1': {
          serializeData: function(){ return {
            'name': 'table1',
          };},
        },
        'id2': {
          serializeData: function(){ return {
            'name': 'table2',
          };},
        },
      });
      spyOn(erdEngine.getModel(), 'getLinks').and.returnValue([
        {
          serializeData:  function(){ return {
            'name': 'link1',
          };},
          getID:  function(){ return 'lid1'; },
        },
        {
          serializeData:  function(){ return {
            'name': 'link2',
          };},
          getID:  function(){ return 'lid2'; },
        },
      ]);
      expect(JSON.stringify(erdCoreObj.serializeData())).toEqual(JSON.stringify({
        nodes: {
          'id1': {'name': 'table1'},
          'id2': {'name': 'table2'},
        },
        links: {
          'lid1': {'name': 'link1'},
          'lid2': {'name': 'link2'},
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

          },
        };
      });
      spyOn(erdEngine.getModel(), 'getNodesDict').and.returnValue(nodesDict);

      spyOn(erdCoreObj, 'getNewLink').and.callFake(function() {
        return {
          setSourcePort: function() {},
          setTargetPort: function() {},
        };
      });
      spyOn(erdCoreObj, 'getNewPort').and.returnValue({id: 'id'});
      spyOn(erdCoreObj, 'addNode').and.callFake(function(data) {
        return {
          getID: function() {
            return `id-${data.name}`;
          },
        };
      });
      spyOn(erdCoreObj, 'addLink');
      spyOn(erdCoreObj, 'dagreDistributeNodes');

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
        {getData: function () {return {name:'node1'};}},
        {getData: function () {return {name:'node2'};}},
      ]);
      expect(JSON.stringify(erdCoreObj.getNodesData())).toEqual(JSON.stringify([
        {name:'node1'}, {name:'node2'},
      ]));
    });

    it('dagreDistributeNodes', ()=>{
      spyOn(erdCoreObj.dagre_engine, 'redistribute');
      erdCoreObj.dagreDistributeNodes();
      expect(erdEngine.getLinkFactories().getFactory().calculateRoutingMatrix).toHaveBeenCalled();
      expect(erdCoreObj.dagre_engine.redistribute).toHaveBeenCalledWith(erdEngine.getModel());
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
