import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import {mount} from 'enzyme';
import '../../helper/enzyme.helper';
import MockAdapter from 'axios-mock-adapter';
import axios from 'axios/index';

import ERDCore from 'pgadmin.tools.erd/erd_tool/ERDCore';
import * as erdModule from 'pgadmin.tools.erd/erd_module';
import erdPref from './erd_preferences';
import BodyWidget from 'pgadmin.tools.erd/erd_tool/ui_components/BodyWidget';
import * as ERDSqlTool from 'tools/datagrid/static/js/show_query_tool';

let pgAdmin = {
  Browser: {
    Events: {
      on: jasmine.createSpy('on'),
    },
    get_preferences_for_module: function() {
      return erdPref;
    },
    docker: {
      findPanels: function() {
        return [
          {
            isVisible: function() {
              return true;
            },
          },
        ];
      },
    },
    onPreferencesChange: ()=>{},
    utils: {
      app_version_int: 1234,
    },
  },
  FileManager: {
    init: jasmine.createSpy(),
    show_dialog: jasmine.createSpy(),
  },
};

let pgWindow = {
  pgAdmin: pgAdmin,
};

let alertify = jasmine.createSpyObj('alertify', {
  'success': null,
  'error': null,
  'confirm': null,
  'alert': {
    'set': ()=>{},
  },
});

let tableDialog = jasmine.createSpyObj('TableDialog', ['show']);
let otmDialog = jasmine.createSpyObj('otmDialog', ['show']);
let mtmDialog = jasmine.createSpyObj('mtmDialog', ['show']);

let getDialog = (dialogName)=>{
  switch(dialogName) {
  case 'entity_dialog': return tableDialog;
  case 'onetomany_dialog': return otmDialog;
  case 'manytomany_dialog': return mtmDialog;
  }
};

describe('ERD BodyWidget', ()=>{
  let body = null;
  let bodyInstance = null;
  let networkMock = null;
  let serverVersion = 120000;
  let colTypes = [
    {'label': 'integer', 'value': 'integer'},
    {'label': 'character varrying', 'value': 'character varrying'},
  ];
  let schemas = [
    {'oid': 111, 'name': 'erd1'},
    {'oid': 222, 'name': 'erd2'},
  ];
  let params = {
    bgcolor: null,
    client_platform: 'macos',
    did: '13637',
    fgcolor: null,
    gen: true,
    is_desktop_mode: true,
    is_linux: false,
    server_type: 'pg',
    sgid: '1',
    sid: '5',
    title: 'postgres/postgres@PostgreSQL 12',
    trans_id: 110008,
  };

  beforeAll(()=>{
    spyOn(erdModule, 'setPanelTitle');
    spyOn(ERDCore.prototype, 'repaint');
    spyOn(ERDCore.prototype, 'deserializeData');
    spyOn(ERDCore.prototype, 'addNode').and.returnValue({
      setSelected: ()=>{},
      getColumns: ()=>([{attnum: 0}, {attnum: 1}]),
      getID: ()=>'newid1',
    });
    spyOn(ERDCore.prototype, 'addLink').and.returnValue({
      setSelected: ()=>{},
    });
    spyOn(alertify, 'confirm').and.callFake((arg1, arg2, okCallback)=>{
      okCallback();
    });

    networkMock = new MockAdapter(axios);
    networkMock.onPost('/erd/initialize/110008/1/5/13637').reply(200, {'data': {
      serverVersion: serverVersion,
    }});
    networkMock.onGet('/erd/prequisite/110008/1/5/13637').reply(200, {'data': {
      'col_types': colTypes,
      'schemas': schemas,
    }});
    networkMock.onGet('/erd/tables/110008/1/5/13637').reply(200, {'data': []});

    networkMock.onPost('/erd/sql/110008/1/5/13637').reply(200, {'data': 'SELECT 1;'});

    networkMock.onPost('/sqleditor/load_file/').reply(200, {'data': 'data'});
    networkMock.onPost('/sqleditor/save_file/').reply(200, {'data': 'data'});
  });

  beforeEach(()=>{
    jasmineEnzyme();
    body = mount(<BodyWidget params={params} pgAdmin={pgAdmin} pgWindow={pgWindow} getDialog={getDialog} transformToSupported={()=>{}} alertify={alertify}/>);
    bodyInstance = body.instance();
  });

  afterAll(() => {
    networkMock.restore();
    if(body) {
      body.unmount();
    }
  });

  it('constructor', (done)=>{

    expect(body.find('ToolBar').length).toBe(1);
    expect(body.find('ConnectionBar').length).toBe(1);
    expect(body.find('FloatingNote').length).toBe(1);
    expect(body.find('.diagram-container Loader').length).toBe(1);
    expect(body.find('.diagram-container CanvasWidget').length).toBe(1);

    body.instance().setState({}, ()=>{
      let instance = body.instance();

      setTimeout(()=>{
        expect(body.state()).toEqual(jasmine.objectContaining({
          server_version: serverVersion,
          preferences: erdPref,
        }));
        expect(instance.diagram.getCache('colTypes')).toEqual(colTypes);
        expect(instance.diagram.getCache('schemas')).toEqual(schemas);
        done();
      });
    });
  });

  it('event offsetUpdated', (done)=>{
    bodyInstance.diagram.fireEvent({offsetX: 4, offsetY: 5}, 'offsetUpdated', true);
    setTimeout(()=>{
      expect(bodyInstance.canvasEle.style.backgroundPosition).toBe('4px 5px');
      done();
    });
  });

  it('event zoomUpdated', (done)=>{
    spyOn(bodyInstance.diagram.getModel(), 'getOptions').and.returnValue({gridSize: 15});
    bodyInstance.diagram.fireEvent({zoom: 20}, 'zoomUpdated', true);
    setTimeout(()=>{
      expect(bodyInstance.canvasEle.style.backgroundSize).toBe('9px 9px');
      done();
    });
  });

  it('event nodesSelectionChanged', (done)=>{
    spyOn(bodyInstance.diagram, 'getSelectedNodes').and.returnValue([{key:'value'}]);
    bodyInstance.diagram.fireEvent({}, 'nodesSelectionChanged', true);
    setTimeout(()=>{
      expect(body.state().single_node_selected).toBe(true);
      expect(body.state().any_item_selected).toBe(true);
      done();
    });
  });

  it('event linksSelectionChanged', (done)=>{
    spyOn(bodyInstance.diagram, 'getSelectedLinks').and.returnValue([{key:'value'}]);
    bodyInstance.diagram.fireEvent({}, 'linksSelectionChanged', true);
    setTimeout(()=>{
      expect(body.state().single_link_selected).toBe(true);
      expect(body.state().any_item_selected).toBe(true);
      done();
    });
  });

  it('event linksUpdated', (done)=>{
    bodyInstance.diagram.fireEvent({}, 'linksUpdated', true);
    setTimeout(()=>{
      expect(body.state().dirty).toBe(true);
      done();
    });
  });

  it('event nodesUpdated', (done)=>{
    bodyInstance.diagram.fireEvent({}, 'nodesUpdated', true);
    setTimeout(()=>{
      expect(body.state().dirty).toBe(true);
      done();
    });
  });

  it('event showNote', (done)=>{
    let noteNode = {key: 'value', getNote: ()=>'a note'};
    spyOn(bodyInstance, 'showNote');
    bodyInstance.diagram.fireEvent({node: noteNode}, 'showNote', true);
    setTimeout(()=>{
      expect(bodyInstance.showNote).toHaveBeenCalledWith(noteNode);
      done();
    });
  });

  it('event editNode', (done)=>{
    let node = {key: 'value', getNote: ()=>'a note'};
    spyOn(bodyInstance, 'addEditNode');
    bodyInstance.diagram.fireEvent({node: node}, 'editNode', true);
    setTimeout(()=>{
      expect(bodyInstance.addEditNode).toHaveBeenCalledWith(node);
      done();
    });
  });

  it('getDialog', ()=>{
    bodyInstance.getDialog('entity_dialog')();
    expect(tableDialog.show).toHaveBeenCalled();

    bodyInstance.getDialog('onetomany_dialog')();
    expect(otmDialog.show).toHaveBeenCalled();

    bodyInstance.getDialog('manytomany_dialog')();
    expect(mtmDialog.show).toHaveBeenCalled();
  });

  it('addEditNode', ()=>{
    /* New */
    tableDialog.show.calls.reset();
    bodyInstance.addEditNode();
    expect(tableDialog.show).toHaveBeenCalled();

    let saveCallback = tableDialog.show.calls.mostRecent().args[7];
    let newData = {key: 'value'};
    saveCallback(newData);
    expect(bodyInstance.diagram.addNode).toHaveBeenCalledWith(newData);

    /* Existing */
    tableDialog.show.calls.reset();
    let node = jasmine.createSpyObj('node',{
      getSchemaTableName: ['erd1', 'table1'],
      setData: null,
      getData: null,
    });
    bodyInstance.addEditNode(node);
    expect(tableDialog.show).toHaveBeenCalled();

    saveCallback = tableDialog.show.calls.mostRecent().args[7];
    newData = {key: 'value'};
    saveCallback(newData);
    expect(node.setData).toHaveBeenCalledWith(newData);
  });

  it('onEditNode', ()=>{
    let node = {key: 'value'};
    spyOn(bodyInstance, 'addEditNode');
    spyOn(bodyInstance.diagram, 'getSelectedNodes').and.returnValue([node]);
    bodyInstance.onEditNode();
    expect(bodyInstance.addEditNode).toHaveBeenCalledWith(node);
  });

  it('onAddNewNode', ()=>{
    spyOn(bodyInstance, 'addEditNode');
    bodyInstance.onAddNewNode();
    expect(bodyInstance.addEditNode).toHaveBeenCalled();
  });

  it('onCloneNode', ()=>{
    let node = jasmine.createSpyObj('node',{
      getSchemaTableName: ['erd1', 'table1'],
      setData: null,
      getData: null,
      cloneData: {key: 'value'},
      getPosition: {x: 30, y: 30},
    });
    spyOn(bodyInstance.diagram, 'getSelectedNodes').and.returnValue([node]);
    spyOn(bodyInstance.diagram, 'getNextTableName').and.returnValue('newtable1');
    bodyInstance.onCloneNode();
    expect(bodyInstance.diagram.addNode).toHaveBeenCalledWith({key: 'value'}, [50, 50]);
  });

  it('onDeleteNode', (done)=>{
    let node = jasmine.createSpyObj('node',{
      getSchemaTableName: ['erd1', 'table1'],
      setData: null,
      getData: null,
      cloneData: {key: 'value'},
      getPosition: {x: 30, y: 30},
      remove: null,
      setSelected: null,
    });
    let link = jasmine.createSpyObj('link', {
      remove: null,
      setSelected: null,
      getTargetPort: jasmine.createSpyObj('port', ['remove']),
      getSourcePort: jasmine.createSpyObj('port', ['remove']),
    });
    spyOn(bodyInstance.diagram, 'getSelectedNodes').and.returnValue([node]);
    spyOn(bodyInstance.diagram, 'getSelectedLinks').and.returnValue([link]);

    bodyInstance.onDeleteNode();
    setTimeout(()=>{
      expect(node.remove).toHaveBeenCalled();
      expect(link.remove).toHaveBeenCalled();
      done();
    });
  });

  it('onAutoDistribute', ()=>{
    spyOn(bodyInstance.diagram, 'dagreDistributeNodes');
    bodyInstance.onAutoDistribute();
    expect(bodyInstance.diagram.dagreDistributeNodes).toHaveBeenCalled();
  });

  it('onDetailsToggle', (done)=>{
    let node = jasmine.createSpyObj('node',['fireEvent']);
    spyOn(bodyInstance.diagram, 'getModel').and.returnValue({
      'getNodes': ()=>[node],
    });

    let show_details = body.state().show_details;
    bodyInstance.onDetailsToggle();
    body.setState({}, ()=>{
      expect(body.state().show_details).toBe(!show_details);
      expect(node.fireEvent).toHaveBeenCalledWith({show_details: !show_details}, 'toggleDetails');
      done();
    });
  });

  it('onLoadDiagram', ()=>{
    bodyInstance.onLoadDiagram();
    expect(pgAdmin.FileManager.show_dialog).toHaveBeenCalled();
  });

  it('openFile', (done)=>{
    spyOn(bodyInstance.diagram, 'deserialize');
    bodyInstance.openFile('test.pgerd');
    setTimeout(()=>{
      expect(body.state()).toEqual(jasmine.objectContaining({
        current_file: 'test.pgerd',
        dirty: false,
      }));
      expect(bodyInstance.diagram.deserialize).toHaveBeenCalledWith({data: 'data'});
      done();
    });
  });

  it('onSaveDiagram', (done)=>{
    body.setState({
      current_file: 'newfile.pgerd',
    });
    bodyInstance.onSaveDiagram();
    setTimeout(()=>{
      expect(body.state()).toEqual(jasmine.objectContaining({
        current_file: 'newfile.pgerd',
        dirty: false,
      }));
      done();
    });

    bodyInstance.onSaveDiagram(true);
    expect(pgAdmin.FileManager.show_dialog).toHaveBeenCalledWith({
      'supported_types': ['pgerd'],
      'dialog_type': 'create_file',
      'dialog_title': 'Save File',
      'btn_primary': 'Save',
    });
  });

  it('onSaveAsDiagram', ()=>{
    spyOn(bodyInstance, 'onSaveDiagram');
    bodyInstance.onSaveAsDiagram();
    expect(bodyInstance.onSaveDiagram).toHaveBeenCalledWith(true);
  });

  it('onSQLClick', (done)=>{
    spyOn(bodyInstance.diagram, 'serializeData').and.returnValue({key: 'value'});
    spyOn(ERDSqlTool, 'showERDSqlTool');
    spyOn(localStorage, 'setItem');
    bodyInstance.onSQLClick();

    setTimeout(()=>{
      let sql = '-- This script was generated by a beta version of the ERD tool in pgAdmin 4.\n'
      + '-- Please log an issue at https://redmine.postgresql.org/projects/pgadmin4/issues/new if you find any bugs, including reproduction steps.\n'
      + 'BEGIN;\nSELECT 1;\nEND;';

      expect(localStorage.setItem).toHaveBeenCalledWith('erd'+params.trans_id, sql);
      expect(ERDSqlTool.showERDSqlTool).toHaveBeenCalled();
      done();
    });
  });

  it('onOneToManyClick', ()=>{
    let node = jasmine.createSpyObj('node',{
      getID: 'id1',
    });
    spyOn(bodyInstance.diagram, 'getSelectedNodes').and.returnValue([node]);

    otmDialog.show.calls.reset();
    bodyInstance.onOneToManyClick();
    expect(otmDialog.show).toHaveBeenCalled();

    let saveCallback = otmDialog.show.calls.mostRecent().args[4];
    let newData = {key: 'value'};
    saveCallback(newData);
    expect(bodyInstance.diagram.addLink).toHaveBeenCalledWith(newData, 'onetomany');
  });

  it('onManyToManyClick', ()=>{
    let node = jasmine.createSpyObj('node',{
      getID: 'id1',
    });
    spyOn(bodyInstance.diagram, 'getSelectedNodes').and.returnValue([node]);

    mtmDialog.show.calls.reset();
    bodyInstance.onManyToManyClick();
    expect(mtmDialog.show).toHaveBeenCalled();

    /* onSave */
    let nodesDict = {
      'id1': {
        getID: ()=>'id1',
        getData: ()=>({name: 'table1', schema: 'erd1'}),
        getColumnAt: ()=>({name: 'col1', type: 'type1', attnum: 0}),
        addPort: jasmine.createSpy('addPort').and.callFake((obj)=>obj),
      },
      'id2': {
        getID: ()=>'id2',
        getData: ()=>({name: 'table2', schema: 'erd2'}),
        getColumnAt: ()=>({name: 'col2', type: 'type2', attnum: 1}),
        addPort: jasmine.createSpy('addPort').and.callFake((obj)=>obj),
      },
    };
    spyOn(bodyInstance.diagram, 'getModel').and.returnValue({
      'getNodesDict': ()=>nodesDict,
    });
    spyOn(bodyInstance.diagram, 'addLink');
    let saveCallback = mtmDialog.show.calls.mostRecent().args[4];
    let newData = {
      left_table_uid: 'id1',
      left_table_column_attnum: 1,
      right_table_uid: 'id2',
      right_table_column_attnum: 2,
    };

    bodyInstance.diagram.addNode.calls.reset();
    bodyInstance.diagram.addLink.calls.reset();
    saveCallback(newData);
    expect(bodyInstance.diagram.addNode).toHaveBeenCalledWith({
      name: 'table1_table2',
      schema: 'erd1',
      columns: [
        {
          type: 'type1',
          name: 'table1_col1',
          is_primary_key: false,
          attnum: 0,
        },
        {
          type: 'type2',
          name: 'table2_col2',
          is_primary_key: false,
          attnum: 1,
        },
      ],
    });

    let linkData = {
      local_table_uid: 'newid1',
      local_column_attnum: 0,
      referenced_table_uid: 'id1',
      referenced_column_attnum : 1,
    };
    expect(bodyInstance.diagram.addLink.calls.argsFor(0)).toEqual([linkData, 'onetomany']);
    linkData = {
      local_table_uid: 'newid1',
      local_column_attnum: 1,
      referenced_table_uid: 'id2',
      referenced_column_attnum : 2,
    };
    expect(bodyInstance.diagram.addLink.calls.argsFor(1)).toEqual([linkData, 'onetomany']);
  });

  it('onNoteClick', ()=>{
    let noteNode = {key: 'value', getNote: ()=>'a note'};
    spyOn(bodyInstance.diagram, 'getSelectedNodes').and.returnValue([noteNode]);
    spyOn(bodyInstance.diagram.getEngine(), 'getNodeElement').and.returnValue(null);
    spyOn(bodyInstance.diagram.getEngine(), 'getNodeElement').and.returnValue(null);
    spyOn(bodyInstance, 'setState');
    bodyInstance.onNoteClick();
    expect(bodyInstance.setState).toHaveBeenCalledWith({
      note_node: noteNode,
      note_open: true,
    });
  });
});
