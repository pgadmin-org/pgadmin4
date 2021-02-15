/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/*
 * The ERDCore is the middleware between the canvas engine and the UI DOM.
 */
import createEngine from '@projectstorm/react-diagrams';
import {DagreEngine, PathFindingLinkFactory, PortModelAlignment} from '@projectstorm/react-diagrams';
import { ZoomCanvasAction } from '@projectstorm/react-canvas-core';

import {TableNodeFactory, TableNodeModel } from './nodes/TableNode';
import {OneToManyLinkFactory, OneToManyLinkModel } from './links/OneToManyLink';
import { OneToManyPortFactory } from './ports/OneToManyPort';
import ERDModel from './ERDModel';

export default class ERDCore {
  constructor() {
    this._cache = {};
    this.table_counter = 1;
    this.node_position_updating = false;
    this.link_position_updating = false;
    this.initializeEngine();
    this.initializeModel();
    this.computeTableCounter();
  }

  initializeEngine() {
    this.engine = createEngine({
      registerDefaultDeleteItemsAction: false,
      registerDefaultZoomCanvasAction: false,
    });
    this.dagre_engine = new DagreEngine({
      graph: {
        marginx: 5,
        marginy: 5,
      },
      includeLinks: true,
    });

    this.engine.getNodeFactories().registerFactory(new TableNodeFactory());
    this.engine.getLinkFactories().registerFactory(new OneToManyLinkFactory());
    this.engine.getPortFactories().registerFactory(new OneToManyPortFactory());
    this.registerKeyAction(new ZoomCanvasAction({inverseZoom: true}));
  }

  initializeModel(data, callback=()=>{}) {
    let model = new ERDModel();
    if(data) {
      model.deserializeModel(data, this.engine);
      this.fireEvent(model.getOptions(), 'offsetUpdated', true);
      this.fireEvent(model.getOptions(), 'zoomUpdated', true);
    }

    const registerNodeEvents = (node) => {
      node.registerListener({
        eventDidFire: (e) => {
          if(e.function === 'selectionChanged') {
            this.fireEvent({}, 'nodesSelectionChanged', true);
          }
          else if(e.function === 'showNote') {
            this.fireEvent({node: e.entity}, 'showNote', true);
          }
          else if(e.function === 'editNode') {
            this.fireEvent({node: e.entity}, 'editNode', true);
          }
          else if(e.function === 'nodeUpdated') {
            this.fireEvent({}, 'nodesUpdated', true);
          }
          else if(e.function === 'positionChanged') {
            /* Eat up the excessive positionChanged events if node is dragged continuosly */
            if(!this.node_position_updating) {
              this.node_position_updating = true;
              this.fireEvent({}, 'nodesUpdated', true);
              setTimeout(()=>{
                this.node_position_updating = false;
              }, 500);
            }
          }
        },
      });
    };

    const registerLinkEvents = (link) => {
      link.registerListener({
        eventDidFire: (e) => {
          if(e.function === 'selectionChanged') {
            this.fireEvent({}, 'linksSelectionChanged', true);
          }
          else if(e.function === 'positionChanged') {
            /* positionChanged is triggered manually in Link */
            /* Eat up the excessive positionChanged events if link is dragged continuosly */
            if(!this.link_position_updating) {
              this.link_position_updating = true;
              this.fireEvent({}, 'linksUpdated', true);
              setTimeout(()=>{
                this.link_position_updating = false;
              }, 500);
            }
          }
        },
      });
    };

    /* Register events for deserialized data */
    model.getNodes().forEach(node => {
      registerNodeEvents(node);
    });
    model.getLinks().forEach(link => {
      registerLinkEvents(link);
    });

    /* Listen and register events for new data */
    model.registerListener({
      'nodesUpdated': (e)=>{
        if(e.isCreated) {
          registerNodeEvents(e.node);
        }
      },
      'linksUpdated': (e)=>{
        if(e.isCreated) {
          registerLinkEvents(e.link);
        }
      },
    });

    model.setGridSize(15);
    this.engine.setModel(model);
    callback();
  }

  computeTableCounter() {
    /* Some inteligence can be added to set the counter */
    this.table_counter = 1;
  }

  setCache(data, value) {
    if(typeof(data) == 'string') {
      this._cache[data] = value;
    } else {
      this._cache = {
        ...this._cache,
        ...data,
      };
    }
  }

  getCache(key) {
    return key ? this._cache[key]: this._cache;
  }

  registerModelEvent(eventName, callback) {
    this.getModel().registerListener({
      [eventName]: callback,
    });
  }

  getNextTableName() {
    let newTableName = `newtable${this.table_counter}`;
    this.table_counter++;
    return newTableName;
  }

  getEngine() {return this.engine;}

  getModel() {return this.getEngine().getModel();}

  getNewNode(initData) {
    return this.getEngine().getNodeFactories().getFactory('table').generateModel({
      initialConfig: {
        otherInfo: {
          data:initData,
        },
      },
    });
  }

  getNewLink(type, initData) {
    return this.getEngine().getLinkFactories().getFactory(type).generateModel({
      initialConfig: {
        data:initData,
      },
    });
  }

  getNewPort(type, initData, initOptions) {
    return this.getEngine().getPortFactories().getFactory(type).generateModel({
      initialConfig: {
        data:initData,
        options:initOptions,
      },
    });
  }

  addNode(data, position=[50, 50]) {
    let newNode = this.getNewNode(data);
    this.clearSelection();
    newNode.setPosition(position[0], position[1]);
    this.getModel().addNode(newNode);
    return newNode;
  }

  addLink(data, type) {
    let tableNodesDict = this.getModel().getNodesDict();
    let sourceNode = tableNodesDict[data.referenced_table_uid];
    let targetNode = tableNodesDict[data.local_table_uid];

    let portName = sourceNode.getPortName(data.referenced_column_attnum);
    let sourcePort = sourceNode.getPort(portName);
    /* Create the port if not there */
    if(!sourcePort) {
      sourcePort = sourceNode.addPort(this.getNewPort(type, null, {name:portName, subtype: 'one', alignment:PortModelAlignment.RIGHT}));
    }

    portName = targetNode.getPortName(data.local_column_attnum);
    let targetPort = targetNode.getPort(portName);
    /* Create the port if not there */
    if(!targetPort) {
      targetPort = targetNode.addPort(this.getNewPort(type, null, {name:portName, subtype: 'many', alignment:PortModelAlignment.RIGHT}));
    }

    /* Link the ports */
    let newLink = this.getNewLink(type, data);
    newLink.setSourcePort(sourcePort);
    newLink.setTargetPort(targetPort);
    this.getModel().addLink(newLink);
    return newLink;
  }

  serialize(version) {
    return {
      version: version||0,
      data: this.getModel().serialize(),
    };
  }

  deserialize(json_data) {
    if(json_data.version) {
      this.initializeModel(json_data.data);
    }
  }

  serializeData() {
    let nodes = {}, links = {};
    let nodesDict = this.getModel().getNodesDict();

    Object.keys(nodesDict).forEach((id)=>{
      nodes[id] = nodesDict[id].serializeData();
    });

    this.getModel().getLinks().map((link)=>{
      links[link.getID()] = link.serializeData(nodesDict);
    });

    /* Separate the links from nodes so that we don't have any dependancy issues */
    return {
      'nodes': nodes,
      'links': links,
    };
  }

  deserializeData(data){
    let oidUidMap = {};
    let uidFks = [];
    data.forEach((node)=>{
      let newData = {
        name: node.name,
        schema: node.schema,
        description: node.description,
        columns: node.columns,
        primary_key: node.primary_key,
      };
      let newNode = this.addNode(newData);
      oidUidMap[node.oid] = newNode.getID();
      if(node.foreign_key) {
        node.foreign_key.forEach((a_fk)=>{
          uidFks.push({
            uid: newNode.getID(),
            data: a_fk.columns[0],
          });
        });
      }
    });

    /* Lets use the oidUidMap for creating the links */
    uidFks.forEach((fkData)=>{
      let tableNodesDict = this.getModel().getNodesDict();
      let newData = {
        local_table_uid: fkData.uid,
        local_column_attnum: undefined,
        referenced_table_uid: oidUidMap[fkData.data.references],
        referenced_column_attnum: undefined,
      };

      let sourceNode = tableNodesDict[newData.referenced_table_uid];
      let targetNode = tableNodesDict[newData.local_table_uid];

      newData.local_column_attnum = _.find(targetNode.getColumns(), (col)=>col.name==fkData.data.local_column).attnum;
      newData.referenced_column_attnum = _.find(sourceNode.getColumns(), (col)=>col.name==fkData.data.referenced).attnum;

      this.addLink(newData, 'onetomany');
    });
    setTimeout(this.dagreDistributeNodes.bind(this), 250);
  }

  repaint() {
    this.getEngine().repaintCanvas();
  }

  clearSelection() {
    this.getEngine()
      .getModel()
      .clearSelection();
  }

  getNodesData() {
    return this.getEngine().getModel().getNodes().map((node)=>{
      return node.getData();
    });
  }

  getSelectedNodes() {
    return this.getEngine()
      .getModel()
      .getSelectedEntities()
      .filter(entity => entity instanceof TableNodeModel);
  }

  getSelectedLinks() {
    return this.getEngine()
      .getModel()
      .getSelectedEntities()
      .filter(entity => entity instanceof OneToManyLinkModel);
  }

  dagreDistributeNodes() {
    this.dagre_engine.redistribute(this.getModel());
    this.getEngine()
      .getLinkFactories()
      .getFactory(PathFindingLinkFactory.NAME)
      .calculateRoutingMatrix();
    this.repaint();
  }

  zoomIn() {
    let model = this.getEngine().getModel();
    if(model){
      model.setZoomLevel(model.getZoomLevel() + 25);
      this.repaint();
    }
  }

  zoomOut() {
    let model = this.getEngine().getModel();
    if(model) {
      let zoomLevel = model.getZoomLevel();
      zoomLevel -= 25;
      /* Don't go belo zoom level 10 */
      if(zoomLevel <= 10) {
        zoomLevel = 10;
      }
      model.setZoomLevel(zoomLevel);
      this.repaint();
    }
  }

  zoomToFit() {
    this.getEngine().zoomToFitNodes();
  }

  // Sample call: this.fireAction({ type: 'keydown', ctrlKey: true, code: 'KeyN' });
  fireAction(event) {
    this.getEngine().getActionEventBus().fireAction({
      event: {
        ...event,
        key: '',
        preventDefault: () => {},
        stopPropagation: () => {},
      },
    });
  }

  fireEvent(data, eventName, model=false) {
    if(model) {
      this.getEngine().getModel().fireEvent(data, eventName);
    } else {
      this.getEngine().fireEvent(data, eventName);
    }
  }

  registerKeyAction(action) {
    this.getEngine().getActionEventBus().registerAction(action);
  }

  deregisterKeyAction(action) {
    this.getEngine().getActionEventBus().deregisterAction(action);
  }
}
