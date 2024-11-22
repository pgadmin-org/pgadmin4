/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import ERDCore from 'pgadmin.tools.erd/erd_tool/ERDCore';
import TEST_TABLES_DATA from './test_tables';
import { FakeLink, FakeNode } from './fake_item';
import { PortModelAlignment } from '@projectstorm/react-diagrams';

describe('ERDCore', ()=>{
  let eleFactory = {
    'registerFactory': jest.fn(),
    'getFactory': jest.fn().mockReturnValue({
      'generateModel': jest.fn(),
    }),
  };
  let erdEngine = {
    'getNodeFactories': jest.fn().mockReturnValue(eleFactory),
    'getLinkFactories': jest.fn().mockReturnValue(eleFactory),
    'getPortFactories': jest.fn().mockReturnValue(eleFactory),
    'getActionEventBus': jest.fn().mockReturnValue({
      'fireAction': jest.fn(),
      'deregisterAction': jest.fn(),
      'registerAction': jest.fn()
    }),
    'setModel': jest.fn(),
    'getModel': jest.fn().mockReturnValue({
      'addNode': jest.fn(),
      'clearSelection': jest.fn(),
      'getNodesDict': jest.fn(),
      'getLinks': jest.fn(),
      'serialize': jest.fn().mockReturnValue({
        'data': 'serialized',
      }),
      'addLink': jest.fn(),
      'getNodes': jest.fn(),
      'setZoomLevel': jest.fn(),
      'getZoomLevel': jest.fn(),
      'fireEvent': jest.fn(),
      'registerListener': jest.fn(),
    }),
    'repaintCanvas': jest.fn(),
    'zoomToFitNodes': jest.fn(),
    'fireEvent': jest.fn(),
  };

  beforeAll(()=>{
    jest.spyOn(ERDCore.prototype, 'createEngine').mockReturnValue(erdEngine);
  });

  it('initialization', ()=>{
    jest.spyOn(ERDCore.prototype, 'initializeEngine');
    jest.spyOn(ERDCore.prototype, 'initializeModel');
    jest.spyOn(ERDCore.prototype, 'computeTableCounter');
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
      erdEngine.getPortFactories().getFactory().generateModel.mockClear();
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
      jest.spyOn(newNode, 'setPosition');
      jest.spyOn(erdCoreObj, 'getNewNode').mockReturnValue(newNode);
      jest.spyOn(erdCoreObj, 'clearSelection');

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
      jest.spyOn(erdCoreObj, 'getOptimumPorts').mockReturnValue([{name: 'port-1'}, {name: 'port-3'}]);
      let nodesDict = {
        'id1': node1,
        'id2': node2,
      };
      let link = new FakeLink();
      jest.spyOn(link, 'setSourcePort');
      jest.spyOn(link, 'setTargetPort');
      jest.spyOn(erdEngine.getModel(), 'getNodesDict').mockReturnValue(nodesDict);
      jest.spyOn(erdCoreObj, 'getNewLink').mockImplementation(function() {
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
      expect(Object.hasOwn(retVal,'version')).toBeTruthy();
      expect(Object.hasOwn(retVal,'data')).toBeTruthy();
      expect(erdEngine.getModel().serialize).toHaveBeenCalled();
    });

    it('deserialize', ()=>{
      let deserialValue = {
        'version': 123,
        'data': {
          'key': 'serialized',
        },
      };
      jest.spyOn(erdCoreObj, 'initializeModel');
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
      jest.spyOn(erdEngine.getModel(), 'getNodesDict').mockReturnValue(nodesDict);
      jest.spyOn(erdEngine.getModel(), 'getLinks').mockReturnValue([
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

    it('deserializeData', ()=>{
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
      jest.spyOn(erdEngine.getModel(), 'getNodesDict').mockReturnValue(nodesDict);

      jest.spyOn(erdCoreObj, 'getNewLink').mockImplementation(function() {
        return {
          setSourcePort: function() {/*This is intentional (SonarQube)*/},
          setTargetPort: function() {/*This is intentional (SonarQube)*/},
        };
      });
      jest.spyOn(erdCoreObj, 'getNewPort').mockReturnValue({id: 'id'});
      jest.spyOn(erdCoreObj, 'addNode').mockImplementation(function(data) {
        return new FakeNode({}, `id-${data.name}`);
      });
      jest.spyOn(erdCoreObj, 'addLink');
      jest.spyOn(erdCoreObj, 'dagreDistributeNodes').mockImplementation(()=>{/* intentionally empty */});

      erdCoreObj.deserializeData(TEST_TABLES_DATA);
      expect(erdCoreObj.addNode).toHaveBeenCalledTimes(TEST_TABLES_DATA.length);
      expect(erdCoreObj.addLink).toHaveBeenCalledTimes(1);
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
      jest.spyOn(erdEngine.getModel(), 'getNodes').mockReturnValue([
        new FakeNode({name:'node1'}),
        new FakeNode({name:'node2'}),
      ]);
      expect(JSON.stringify(erdCoreObj.getNodesData())).toEqual(JSON.stringify([
        {name:'node1'}, {name:'node2'},
      ]));
    });

    it('zoomIn', ()=>{
      jest.spyOn(erdEngine.getModel(), 'getZoomLevel').mockReturnValue(100);
      jest.spyOn(erdCoreObj, 'repaint');
      erdCoreObj.zoomIn();
      expect(erdEngine.getModel().setZoomLevel).toHaveBeenCalledWith(125);
      expect(erdCoreObj.repaint).toHaveBeenCalled();
    });

    it('zoomOut', ()=>{
      jest.spyOn(erdEngine.getModel(), 'getZoomLevel').mockReturnValue(100);
      jest.spyOn(erdCoreObj, 'repaint');
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
