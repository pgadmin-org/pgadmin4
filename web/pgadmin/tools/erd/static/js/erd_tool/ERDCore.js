/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/*
 * The ERDCore is the middleware between the canvas engine and the UI DOM.
 */
import createEngine, {DagreEngine, PortModelAlignment} from '@projectstorm/react-diagrams';
import { ZoomCanvasAction } from '@projectstorm/react-canvas-core';
import _ from 'lodash';

import {TableNodeFactory, TableNodeModel } from './nodes/TableNode';
import {OneToManyLinkFactory, OneToManyLinkModel, POINTER_SIZE } from './links/OneToManyLink';
import { OneToManyPortFactory } from './ports/OneToManyPort';
import ERDModel from './ERDModel';
import ForeignKeySchema from '../../../../../browser/server_groups/servers/databases/schemas/tables/constraints/foreign_key/static/js/foreign_key.ui';
import diffArray from 'diff-arrays-of-objects';
import TableSchema from '../../../../../browser/server_groups/servers/databases/schemas/tables/static/js/table.ui';
import ColumnSchema from '../../../../../browser/server_groups/servers/databases/schemas/tables/columns/static/js/column.ui';
import { Polygon } from '@projectstorm/geometry';

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

  initializeModel(data, callback=()=>{/*This is intentional (SonarQube)*/}) {
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
          else if(e.function === 'editTable') {
            this.fireEvent({node: e.entity}, 'editTable', true);
          }
          else if(e.function === 'nodeUpdated') {
            this.fireEvent({}, 'nodesUpdated', true);
          }
          else if(e.function === 'positionChanged') {
            /* Eat up the excessive positionChanged events if node is dragged continuosly */
            if(!this.node_position_updating) {
              this.node_position_updating = true;
              this.fireEvent({}, 'nodesUpdated', true);
              this.optimizePortsPosition(node);
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

  getBoundingLinksRect() {
    return Polygon.boundingBoxFromPolygons(
      this.getEngine().getModel().getLinks().map((l)=>l.getBoundingBox()));
  }

  getNewNode(initData, dataUrl=null) {
    return this.getEngine().getNodeFactories().getFactory('table').generateModel({
      initialConfig: {
        otherInfo: {
          data:initData,
          dataUrl: dataUrl,
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

  getNewPort(portName, alignment) {
    return this.getEngine().getPortFactories().getFactory('onetomany').generateModel({
      initialConfig: {
        data: null,
        options: {
          name: portName,
          alignment: alignment
        },
      },
    });
  }

  getLeftRightPorts(node, attnum) {
    const leftPort = node.getPort(node.getPortName(attnum, PortModelAlignment.LEFT))
      ?? node.addPort(this.getNewPort(node.getPortName(attnum, PortModelAlignment.LEFT), PortModelAlignment.LEFT));
    const rightPort = node.getPort(node.getPortName(attnum, PortModelAlignment.RIGHT))
      ?? node.addPort(this.getNewPort(node.getPortName(attnum, PortModelAlignment.RIGHT), PortModelAlignment.RIGHT));

    return [leftPort, rightPort];
  }

  optimizePortsPosition(node) {
    Object.values(node.getLinks()).forEach((link)=>{
      const sourcePort = link.getSourcePort();
      const targetPort = link.getTargetPort();

      const [newSourcePort, newTargetPort] = this.getOptimumPorts(
        sourcePort.getNode(),
        sourcePort.getNode().getPortAttnum(sourcePort.getName()),
        targetPort.getNode(),
        targetPort.getNode().getPortAttnum(targetPort.getName())
      );

      sourcePort != newSourcePort && link.setSourcePort(newSourcePort);
      targetPort != newTargetPort && link.setTargetPort(newTargetPort);
    });
  }

  addNode(data, position=[50, 50], metadata={}) {
    let newNode = this.getNewNode(data);
    this.clearSelection();
    newNode.setPosition(position[0], position[1]);
    newNode.setMetadata(metadata);
    this.getModel().addNode(newNode);
    return newNode;
  }

  removeNode(node) {
    let self = this;
    node.setSelected(false);
    Object.values(node.getPorts()).forEach((port)=>{
      Object.values(port.getLinks()).forEach((link)=>{
        self.removeOneToManyLink(link);
      });
    });
    node.remove();
  }

  anyDuplicateNodeName(newNodeData, oldNodeData) {
    if(newNodeData.name == oldNodeData?.name && newNodeData.schema == oldNodeData?.schema) {
      return false;
    }
    return _.filter(this.getNodesData(), (n)=>{
      return n.name==newNodeData.name && n.schema==newNodeData.schema;
    }).length > 0;
  }

  getOptimumPorts(sourceNode, sourceAttnum, targetNode, targetAttnum) {
    const [sourceLeftPort, sourceRightPort] = this.getLeftRightPorts(sourceNode, sourceAttnum);
    const [targetLeftPort, targetRightPort] = this.getLeftRightPorts(targetNode, targetAttnum);

    /* Lets use right as default */
    let sourcePort = sourceRightPort;
    let targetPort = targetRightPort;
    const sourceNodePos = sourceNode.getBoundingBox();
    const targetNodePos = targetNode.getBoundingBox();
    const sourceLeftX = sourceNodePos.getBottomLeft().x;
    const sourceRightX = sourceNodePos.getBottomRight().x;
    const targetLeftX = targetNodePos.getBottomLeft().x;
    const targetRightX = targetNodePos.getBottomRight().x;

    const OFFSET = POINTER_SIZE*2+10;

    if(targetLeftX - sourceRightX >= OFFSET) {
      sourcePort = sourceRightPort;
      targetPort = targetLeftPort;
    } else if(sourceLeftX - targetRightX >= OFFSET) {
      sourcePort = sourceLeftPort;
      targetPort = targetRightPort;
    } else if(targetLeftX - sourceRightX < OFFSET || sourceLeftX - targetRightX < OFFSET) {
      if(sourcePort.getAlignment() == PortModelAlignment.RIGHT) {
        targetPort = targetRightPort;
      } else {
        targetPort = targetLeftPort;
      }
    }
    return [sourcePort, targetPort];
  }

  addLink(data, type) {
    let tableNodesDict = this.getModel().getNodesDict();
    let sourceNode = tableNodesDict[data.referenced_table_uid];
    let targetNode = tableNodesDict[data.local_table_uid];

    const [sourcePort, targetPort] = this.getOptimumPorts(
      sourceNode, data.referenced_column_attnum, targetNode, data.local_column_attnum);

    /* Link the ports */
    let newLink = this.getNewLink(type, data);
    newLink.setSourcePort(sourcePort);
    newLink.setTargetPort(targetPort);
    this.getModel().addLink(newLink);
    return newLink;
  }

  removePortLinks(port) {
    let links = port.getLinks();
    Object.values(links).forEach((link)=>{
      link.getTargetPort().remove();
      link.getSourcePort().remove();
      link.setSelected(false);
      link.remove();
    });
  }

  syncColDrop(tableNode, oldTableData) {
    let self = this;
    if(!oldTableData) {
      return;
    }
    let tableData = tableNode.getData();
    /* Remove the links if column dropped or primary key removed */
    _.differenceWith(oldTableData.columns, tableData.columns, function(existing, incoming) {
      if(existing.attnum == incoming.attnum && existing.is_primary_key && !incoming.is_primary_key) {
        return false;
      }
      return existing.attnum == incoming.attnum;
    }).forEach((col)=>{
      let existPort = tableNode.getPort(tableNode.getPortName(col.attnum));
      if(existPort) {
        Object.values(existPort.getLinks()).forEach((link)=>{
          self.removeOneToManyLink(link);
        });
        tableNode.removePort(existPort);
      }
    });
  }

  syncFkRefNames(tableNode, oldTableData) {
    if(!oldTableData) {
      return;
    }
    let tableData = tableNode.getData();
    /* Sync the name changes in references FK */
    Object.values(tableNode.getLinks()).forEach((link)=>{
      if(link.getSourcePort().getNode() != tableNode) {
        /* SourcePort is the referred table */
        /* If the link doesn't refer this table, skip it */
        return;
      }
      let linkData = link.getData();
      let fkTableNode = this.getModel().getNodesDict()[linkData.local_table_uid];

      let newForeingKeys = [];
      /* Update the FK table with new references */
      fkTableNode.getData().foreign_key?.forEach((theFkRow)=>{
        for(let fkColumn of theFkRow.columns) {
          if(fkColumn.references == tableNode.getID()) {
            let attnum = _.find(oldTableData.columns, (c)=>c.name==fkColumn.referenced).attnum;
            fkColumn.referenced = _.find(tableData.columns, (colm)=>colm.attnum==attnum).name;
            fkColumn.references_table_name = tableData.name;
          }
        }
        newForeingKeys.push(theFkRow);
      });
      fkTableNode.setData({
        ...fkTableNode.getData(),
        foreign_key: newForeingKeys,
      });
    });
  }

  syncTableLinks(tableNode, oldTableData) {
    if(oldTableData) {
      this.syncColDrop(tableNode, oldTableData);
      this.syncFkRefNames(tableNode, oldTableData);
    }
    /* Sync the changed/removed/added foreign keys */
    let tableData = tableNode.getData();
    let tableNodesDict = this.getModel().getNodesDict();

    const addLink = (theFk)=>{
      if(!theFk) return;
      let newData = {
        local_table_uid: tableNode.getID(),
        local_column_attnum: undefined,
        referenced_table_uid: theFk.references,
        referenced_column_attnum: undefined,
      };
      let sourceNode = tableNodesDict[newData.referenced_table_uid];

      newData.local_column_attnum = _.find(tableNode.getColumns(), (col)=>col.name==theFk.local_column).attnum;
      newData.referenced_column_attnum = _.find(sourceNode.getColumns(), (col)=>col.name==theFk.referenced).attnum;

      this.addLink(newData, 'onetomany');
    };

    const removeLink = (theFk)=>{
      if(!theFk) return;

      let tableNodesDict = this.getModel().getNodesDict();
      let sourceNode = tableNodesDict[theFk.references];

      let localAttnum = _.find(tableNode.getColumns(), (col)=>col.name==theFk.local_column).attnum;
      let refAttnum = _.find(sourceNode.getColumns(), (col)=>col.name==theFk.referenced).attnum;
      const fkLink = Object.values(tableNode.getLinks()).find((link)=>{
        const ldata = link.getData();
        return ldata.local_column_attnum == localAttnum
          && ldata.local_table_uid == tableNode.getID()
          && ldata.referenced_column_attnum == refAttnum
          && ldata.referenced_table_uid == theFk.references;
      });
      fkLink?.remove();
    };

    const changeDiff = diffArray(
      oldTableData?.foreign_key || [],
      tableData?.foreign_key || [],
      'cid'
    );

    changeDiff.added.forEach((theFk)=>{
      addLink(theFk.columns[0]);
    });
    changeDiff.removed.forEach((theFk)=>{
      removeLink(theFk.columns[0]);
    });

    if(changeDiff.updated.length > 0) {
      for(const changedRow of changeDiff.updated) {
        let rowIndx = _.findIndex(tableData.foreign_key, (f)=>f.cid==changedRow.cid);
        const changeDiffCols = diffArray(
          oldTableData.foreign_key[rowIndx].columns,
          tableData.foreign_key[rowIndx].columns,
          'cid'
        );
        if(changeDiffCols.removed.length > 0) {
          /* any change in columns length remove all and create new link */
          oldTableData.foreign_key[rowIndx].columns.forEach((col)=>{
            removeLink(col);
          });
          addLink(tableData.foreign_key[rowIndx].columns[0]);
        }
      }
    }
  }

  addOneToManyLink(onetomanyData) {
    let newFk = new ForeignKeySchema({}, {}, ()=>{/*This is intentional (SonarQube)*/}, {autoindex: false});
    let tableNodesDict = this.getModel().getNodesDict();
    let fkColumn = {};
    let sourceNode = tableNodesDict[onetomanyData.referenced_table_uid];
    let targetNode = tableNodesDict[onetomanyData.local_table_uid];

    fkColumn.local_column = _.find(targetNode.getColumns(), (colm)=>colm.attnum==onetomanyData.local_column_attnum).name;
    fkColumn.referenced = _.find(sourceNode.getColumns(), (colm)=>colm.attnum==onetomanyData.referenced_column_attnum).name;
    fkColumn.references = onetomanyData.referenced_table_uid;
    fkColumn.references_table_name = sourceNode.getData().name;

    let tableData = targetNode.getData();
    tableData.foreign_key = tableData.foreign_key || [];

    let col = newFk.fkColumnSchema.getNewData(fkColumn);
    tableData.foreign_key.push(
      newFk.getNewData({
        columns: [col],
      })
    );
    targetNode.setData(tableData);
    let newLink = this.addLink(onetomanyData, 'onetomany');
    this.clearSelection();
    newLink.setSelected(true);
    this.repaint();
  }

  removeOneToManyLink(link) {
    let linkData = link.getData();
    let tableNode = this.getModel().getNodesDict()[linkData.local_table_uid];
    let tableData = tableNode.getData();

    let newForeingKeys = [];
    tableData.foreign_key?.forEach((theFkRow)=>{
      let theFk = theFkRow.columns[0];
      let attnum = _.find(tableNode.getColumns(), (col)=>col.name==theFk.local_column).attnum;
      /* Skip all those whose attnum and table matches to the link */
      if(linkData.local_column_attnum != attnum || linkData.referenced_table_uid != theFk.references) {
        newForeingKeys.push(theFkRow);
      }
    });
    tableData.foreign_key = newForeingKeys;
    tableNode.setData(tableData);
    link.getTargetPort().remove();
    link.getSourcePort().remove();
    link.setSelected(false);
    link.remove();
  }

  addManyToManyLink(manytomanyData) {
    let nodes = this.getModel().getNodesDict();
    let leftNode = nodes[manytomanyData.left_table_uid];
    let rightNode = nodes[manytomanyData.right_table_uid];

    let tableObj = new TableSchema({}, {}, {
      constraints:()=>{/*This is intentional (SonarQube)*/},
      columns:()=>new ColumnSchema(()=>{/*This is intentional (SonarQube)*/}, {}, {}, {}),
      vacuum_settings:()=>{/*This is intentional (SonarQube)*/},
    }, ()=>{/*This is intentional (SonarQube)*/}, ()=>{/*This is intentional (SonarQube)*/}, ()=>{/*This is intentional (SonarQube)*/}, ()=>{/*This is intentional (SonarQube)*/});

    let tableData = tableObj.getNewData({
      name: `${leftNode.getData().name}_${rightNode.getData().name}`,
      schema: leftNode.getData().schema,
      columns: [tableObj.columnsSchema.getNewData({
        ...leftNode.getColumnAt(manytomanyData.left_table_column_attnum),
        'name': `${leftNode.getData().name}_${leftNode.getColumnAt(manytomanyData.left_table_column_attnum).name}`,
        'attnum': 0,
        'is_primary_key': false,
      }),tableObj.columnsSchema.getNewData({
        ...rightNode.getColumnAt(manytomanyData.right_table_column_attnum),
        'name': `${rightNode.getData().name}_${rightNode.getColumnAt(manytomanyData.right_table_column_attnum).name}`,
        'attnum': 1,
        'is_primary_key': false,
      })],
    });

    let newNode = this.addNode(tableData);
    this.clearSelection();
    newNode.setSelected(true);

    let linkData = {
      local_table_uid: newNode.getID(),
      local_column_attnum: newNode.getColumns()[0].attnum,
      referenced_table_uid: manytomanyData.left_table_uid,
      referenced_column_attnum : manytomanyData.left_table_column_attnum,
    };
    this.addOneToManyLink(linkData);

    linkData = {
      local_table_uid: newNode.getID(),
      local_column_attnum: newNode.getColumns()[1].attnum,
      referenced_table_uid: manytomanyData.right_table_uid,
      referenced_column_attnum : manytomanyData.right_table_column_attnum,
    };
    this.addOneToManyLink(linkData);

    this.repaint();
  }

  cloneTableData(tableData, name) {
    const SKIP_CLONE_KEYS = ['foreign_key'];

    if(!tableData) {
      return tableData;
    }
    let newData = {
      ..._.pickBy(tableData, (_v, k)=>(SKIP_CLONE_KEYS.indexOf(k) == -1)),
    };
    if(name) {
      newData['name'] = name;
    }
    return newData;
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
    let nodes = {};
    let nodesDict = this.getModel().getNodesDict();

    Object.keys(nodesDict).forEach((id)=>{
      let nodeData = nodesDict[id].serializeData();
      if(nodeData) {
        nodes[id] = nodeData;
      }
    });

    return {
      'nodes': nodes,
    };
  }

  deserializeData(data){
    let oidUidMap = {};

    /* Add the nodes */
    data.forEach((nodeData)=>{
      let newNode = this.addNode(TableSchema.getErdSupportedData(nodeData));
      oidUidMap[nodeData.oid] = newNode.getID();
    });

    /* Lets use the oidUidMap for creating the links */
    let tableNodesDict = this.getModel().getNodesDict();
    _.forIn(tableNodesDict, (node, uid)=>{
      let nodeData = node.getData();
      if(nodeData.foreign_key) {
        nodeData.foreign_key.forEach((theFk)=>{
          delete theFk.oid;
          theFk = theFk.columns[0];
          theFk.references = oidUidMap[theFk.references];
          let newData = {
            local_table_uid: uid,
            local_column_attnum: undefined,
            referenced_table_uid: theFk.references,
            referenced_column_attnum: undefined,
          };
          let sourceNode = tableNodesDict[newData.referenced_table_uid];
          let targetNode = tableNodesDict[newData.local_table_uid];

          newData.local_column_attnum = _.find(targetNode.getColumns(), (col)=>col.name==theFk.local_column).attnum;
          newData.referenced_column_attnum = _.find(sourceNode.getColumns(), (col)=>col.name==theFk.referenced).attnum;

          this.addLink(newData, 'onetomany');
        });
      }
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
        preventDefault: () => {/*This is intentional (SonarQube)*/},
        stopPropagation: () => {/*This is intentional (SonarQube)*/},
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
