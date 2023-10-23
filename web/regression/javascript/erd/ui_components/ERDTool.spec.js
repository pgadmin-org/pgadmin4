/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////


// The code is commented because:
// 1. @testing-library/react doesn't give instance of class components.
// 2. ERD code need to be separated from component to make it more testable
// Adding dummy
describe('ERDTool', ()=>{
  it('dummy', ()=>{});
});

// import React from 'react';

// import MockAdapter from 'axios-mock-adapter';
// import axios from 'axios/index';
// import pgAdmin from '../../fake_pgadmin';

// import ERDCore from 'pgadmin.tools.erd/erd_tool/ERDCore';
// import * as erdModule from 'pgadmin.tools.erd/ERDModule';
// import erdPref from './erd_preferences';
// import ERDTool from 'pgadmin.tools.erd/erd_tool/components/ERDTool';
// import * as ERDSqlTool from 'tools/sqleditor/static/js/show_query_tool';
// import { FakeLink, FakeNode, FakePort } from '../fake_item';
// import Theme from '../../../../pgadmin/static/js/Theme';
// import ModalProvider from '../../../../pgadmin/static/js/helpers/ModalProvider';
// import { render } from '@testing-library/react';
// import usePreferences from '../../../../pgadmin/preferences/static/js/store';
// import userEvent from '@testing-library/user-event';

// let tableDialog = jest.fn();
// let otmDialog = jest.fn();
// let mtmDialog = jest.fn();

// let getDialog = (dialogName)=>{
//   switch(dialogName) {
//   case 'table_dialog': return tableDialog;
//   case 'onetomany_dialog': return otmDialog;
//   case 'manytomany_dialog': return mtmDialog;
//   }
// };

// describe('ERDTool', ()=>{
//   let erd = null;
//   let body = null;
//   let bodyInstance = null;
//   let networkMock = null;
//   let serverVersion = 120000;
//   let colTypes = [
//     {'label': 'integer', 'value': 'integer'},
//     {'label': 'character varrying', 'value': 'character varrying'},
//   ];
//   let schemas = [
//     {'oid': 111, 'name': 'erd1'},
//     {'oid': 222, 'name': 'erd2'},
//   ];
//   let params = {
//     bgcolor: null,
//     client_platform: 'macos',
//     did: '13637',
//     fgcolor: null,
//     gen: true,
//     is_desktop_mode: true,
//     is_linux: false,
//     server_type: 'pg',
//     sgid: '1',
//     sid: '5',
//     title: 'postgres/postgres@PostgreSQL 12',
//     trans_id: 110008,
//   };
//   let newNode = new FakeNode({
//     columns: [{attnum: 0}, {attnum: 1}],
//   }, 'newid1');

//   beforeAll(()=>{
//     jest.spyOn(erdModule, 'setPanelTitle').mockImplementation(() => {});
//     jest.spyOn(ERDCore.prototype, 'repaint').mockImplementation(() => {});
//     jest.spyOn(ERDCore.prototype, 'deserializeData').mockImplementation(() => {});
//     jest.spyOn(ERDCore.prototype, 'addNode').mockReturnValue(newNode);
//     jest.spyOn(ERDCore.prototype, 'addLink').mockReturnValue(new FakeLink());
//     jest.spyOn(usePreferences.getState(), 'getPreferencesForModule').mockImplementation((module)=>{
//       if(module == 'erd') {
//         return erdPref;
//       }
//       return {};
//     })
//     networkMock = new MockAdapter(axios);
//     networkMock.onPost('/erd/initialize/110008/1/5/13637').reply(200, {'data': {
//       serverVersion: serverVersion,
//     }});
//     networkMock.onGet('/erd/prequisite/110008/1/5/13637').reply(200, {'data': {
//       'col_types': colTypes,
//       'schemas': schemas,
//     }});
//     networkMock.onGet('/erd/tables/110008/1/5/13637').reply(200, {'data': []});

//     networkMock.onPost('/erd/sql/110008/1/5/13637').reply(200, {'data': 'SELECT 1;'});

//     networkMock.onPost('/sqleditor/load_file/').reply(200, {'data': 'data'});
//     networkMock.onPost('/sqleditor/save_file/').reply(200, {'data': 'data'});
//   });

//   beforeEach(()=>{
//     erd = render(
//       <Theme>
//         <ModalProvider>
//           <ERDTool params={params} pgAdmin={pgAdmin} pgWindow={{
//             pgAdmin: pgAdmin
//           }} isTest={true} panelDocker={pgAdmin.Browser.docker}/>
//         </ModalProvider>
//       </Theme>
//     );
//   });

//   afterAll(() => {
//     networkMock.restore();
//   });

//   it('event offsetUpdated', (done)=>{
//     bodyInstance.diagram.fireEvent({offsetX: 4, offsetY: 5}, 'offsetUpdated', true);
//     setTimeout(()=>{
//       expect(bodyInstance.canvasEle.style.backgroundPosition).toBe('4px 5px');
//       done();
//     });
//   });

//   it('event zoomUpdated', (done)=>{
//     jest.spyOn(bodyInstance.diagram.getModel(), 'getOptions').mockReturnValue({gridSize: 15});
//     bodyInstance.diagram.fireEvent({zoom: 20}, 'zoomUpdated', true);
//     setTimeout(()=>{
//       expect(bodyInstance.canvasEle.style.backgroundSize).toBe('9px 9px');
//       done();
//     });
//   });

//   it('event nodesSelectionChanged', (done)=>{
//     jest.spyOn(bodyInstance.diagram, 'getSelectedNodes').mockReturnValue([new FakeNode({key:'value'})]);
//     bodyInstance.diagram.fireEvent({}, 'nodesSelectionChanged', true);
//     setTimeout(()=>{
//       expect(body.state().single_node_selected).toBe(true);
//       expect(body.state().any_item_selected).toBe(true);
//       done();
//     });
//   });

//   it('event linksSelectionChanged', (done)=>{
//     jest.spyOn(bodyInstance.diagram, 'getSelectedLinks').mockReturnValue([{key:'value'}]);
//     bodyInstance.diagram.fireEvent({}, 'linksSelectionChanged', true);
//     setTimeout(()=>{
//       expect(body.state().single_link_selected).toBe(true);
//       expect(body.state().any_item_selected).toBe(true);
//       done();
//     });
//   });

//   it('event linksUpdated', (done)=>{
//     bodyInstance.diagram.fireEvent({}, 'linksUpdated', true);
//     setTimeout(()=>{
//       expect(body.state().dirty).toBe(true);
//       done();
//     });
//   });

//   it('event nodesUpdated', (done)=>{
//     bodyInstance.diagram.fireEvent({}, 'nodesUpdated', true);
//     setTimeout(()=>{
//       expect(body.state().dirty).toBe(true);
//       done();
//     });
//   });

//   it('event showNote', (done)=>{
//     let noteNode = {key: 'value', getNote: ()=>'a note'};
//     jest.spyOn(bodyInstance, 'showNote').mockImplementation(() => {});
//     bodyInstance.diagram.fireEvent({node: noteNode}, 'showNote', true);
//     setTimeout(()=>{
//       expect(bodyInstance.showNote).toHaveBeenCalledWith(noteNode);
//       done();
//     });
//   });

//   it('event editTable', (done)=>{
//     let node = {key: 'value', getNote: ()=>'a note'};
//     jest.spyOn(bodyInstance, 'addEditTable').mockImplementation(() => {});
//     bodyInstance.diagram.fireEvent({node: node}, 'editTable', true);
//     setTimeout(()=>{
//       expect(bodyInstance.addEditTable).toHaveBeenCalledWith(node);
//       done();
//     });
//   });

//   it('addEditTable', ()=>{
//     let node1 = new FakeNode({'name': 'table1', schema: 'erd1', columns: [{name: 'col1', type: 'type1', attnum: 1}]}, 'id1');
//     let node2 = new FakeNode({'name': 'table2', schema: 'erd2', columns: [{name: 'col2', type: 'type2', attnum: 2}]}, 'id2');
//     let nodesDict = {
//       'id1': node1,
//       'id2': node2,
//     };
//     jest.spyOn(bodyInstance.diagram, 'getModel').mockReturnValue({
//       'getNodesDict': ()=>nodesDict,
//     });
//     jest.spyOn(bodyInstance.diagram, 'addLink').mockImplementation(() => {});
//     jest.spyOn(bodyInstance.diagram, 'syncTableLinks').mockImplementation(() => {});
//     /* New */
//     tableDialog.mockClear();
//     bodyInstance.addEditTable();
//     expect(tableDialog).toHaveBeenCalled();

//     let saveCallback = tableDialog.mock.calls[tableDialog.mock.calls.length - 1][3];
//     let newData = {key: 'value'};
//     saveCallback(newData);
//     expect(bodyInstance.diagram.addNode.mock.calls[bodyInstance.diagram.addNode.mock.calls.length - 1][0]).toEqual(newData);

//     /* Existing */
//     tableDialog.mockClear();
//     let node = new FakeNode({name: 'table1', schema: 'erd1'});
//     jest.spyOn(node, 'setData').mockImplementation(() => {});
//     bodyInstance.addEditTable(node);
//     expect(tableDialog).toHaveBeenCalled();

//     saveCallback = tableDialog.mock.calls[tableDialog.mock.calls.length - 1][3];
//     newData = {key: 'value'};
//     saveCallback(newData);
//     expect(node.setData).toHaveBeenCalledWith(newData);
//   });

//   it('onEditTable', ()=>{
//     let node = {key: 'value'};
//     jest.spyOn(bodyInstance, 'addEditTable').mockImplementation(() => {});
//     jest.spyOn(bodyInstance.diagram, 'getSelectedNodes').mockReturnValue([node]);
//     bodyInstance.onEditTable();
//     expect(bodyInstance.addEditTable).toHaveBeenCalledWith(node);
//   });

//   it('onAddNewNode', ()=>{
//     jest.spyOn(bodyInstance, 'addEditTable').mockImplementation(() => {});
//     bodyInstance.onAddNewNode();
//     expect(bodyInstance.addEditTable).toHaveBeenCalled();
//   });

//   it('onCloneNode', ()=>{
//     let node = new FakeNode({name: 'table1', schema: 'erd1'});
//     jest.spyOn(bodyInstance.diagram, 'getSelectedNodes').mockReturnValue([node]);
//     jest.spyOn(bodyInstance.diagram, 'getNextTableName').mockReturnValue('newtable1');
//     bodyInstance.diagram.addNode.mockClear();
//     bodyInstance.onCloneNode();
//     let cloneArgs = bodyInstance.diagram.addNode.mock.calls[0];
//     expect(cloneArgs[0]).toEqual(expect.objectContaining({
//       name: 'newtable1',
//       schema: 'erd1',
//     }));
//     expect(cloneArgs[1]).toEqual([50, 50]);
//   });

//   it('onDeleteNode', (done)=>{
//     let node = new FakeNode({name: 'table1', schema: 'erd1'});
//     let link = new FakeLink({local_table_uid: 'tid1'});
//     let port = new FakePort();
//     jest.spyOn(port, 'getLinks').mockReturnValue([link]);
//     jest.spyOn(node, 'remove').mockImplementation(() => {});
//     jest.spyOn(node, 'getPorts').mockReturnValue([port]);
//     let nodesDict = {
//       'tid1': node
//     };
//     jest.spyOn(bodyInstance.diagram, 'getModel').mockReturnValue({
//       'getNodesDict': ()=>nodesDict,
//     });
//     jest.spyOn(bodyInstance.diagram, 'removeOneToManyLink').mockImplementation(() => {});
//     jest.spyOn(bodyInstance.diagram, 'getSelectedNodes').mockReturnValue([node]);
//     jest.spyOn(bodyInstance.diagram, 'getSelectedLinks').mockReturnValue([link]);

//     bodyInstance.onDeleteNode();
//     setTimeout(()=>{
//       expect(node.remove).toHaveBeenCalled();
//       expect(bodyInstance.diagram.removeOneToManyLink).toHaveBeenCalledWith(link);
//       done();
//     });
//   });

//   it('onAutoDistribute', ()=>{
//     jest.spyOn(bodyInstance.diagram, 'dagreDistributeNodes').mockImplementation(()=>{/* intentionally empty */});
//     bodyInstance.onAutoDistribute();
//     expect(bodyInstance.diagram.dagreDistributeNodes).toHaveBeenCalled();
//   });

//   it('onDetailsToggle', (done)=>{
//     let node = {
//       'fireEvent': jest.fn()
//     };
//     jest.spyOn(bodyInstance.diagram, 'getModel').mockReturnValue({
//       'getNodes': ()=>[node],
//     });

//     let show_details = body.state().show_details;
//     bodyInstance.onDetailsToggle();
//     body.setState({}, ()=>{
//       expect(body.state().show_details).toBe(!show_details);
//       expect(node.fireEvent).toHaveBeenCalledWith({show_details: !show_details}, 'toggleDetails');
//       done();
//     });
//   });

//   it('onLoadDiagram', ()=>{
//     bodyInstance.onLoadDiagram();
//     expect(pgAdmin.Tools.FileManager.show).toHaveBeenCalled();
//   });

//   it('openFile', (done)=>{
//     jest.spyOn(bodyInstance.diagram, 'deserialize').mockImplementation(() => {});
//     bodyInstance.openFile('test.pgerd');
//     setTimeout(()=>{
//       expect(body.state()).toEqual(expect.objectContaining({
//         current_file: 'test.pgerd',
//         dirty: false,
//       }));
//       expect(bodyInstance.diagram.deserialize).toHaveBeenCalledWith({data: 'data'});
//       done();
//     });
//   });

//   it('onSaveDiagram', (done)=>{
//     body.setState({
//       current_file: 'newfile.pgerd',
//     });
//     bodyInstance.onSaveDiagram();
//     setTimeout(()=>{
//       expect(body.state()).toEqual(expect.objectContaining({
//         current_file: 'newfile.pgerd',
//         dirty: false,
//       }));
//       done();
//     });

//     pgAdmin.Tools.FileManager.show.mockClear();
//     bodyInstance.onSaveDiagram(true);
//     expect(pgAdmin.Tools.FileManager.show.mock.calls[0][0]).toEqual({
//       'supported_types': ['*','pgerd'],
//       'dialog_type': 'create_file',
//       'dialog_title': 'Save File',
//       'btn_primary': 'Save',
//     });
//   });

//   it('onSaveAsDiagram', ()=>{
//     jest.spyOn(bodyInstance, 'onSaveDiagram').mockImplementation(() => {});
//     bodyInstance.onSaveAsDiagram();
//     expect(bodyInstance.onSaveDiagram).toHaveBeenCalledWith(true);
//   });

//   it('onSQLClick', (done)=>{
//     jest.spyOn(bodyInstance.diagram, 'serializeData').mockReturnValue({key: 'value'});
//     jest.spyOn(ERDSqlTool, 'showERDSqlTool').mockImplementation(() => {});
//     jest.spyOn(localStorage, 'setItem').mockImplementation(() => {});
//     bodyInstance.onSQLClick();

//     setTimeout(()=>{
//       let sql = '-- This script was generated by the ERD tool in pgAdmin 4.\n'
//       + '-- Please log an issue at https://redmine.postgresql.org/projects/pgadmin4/issues/new if you find any bugs, including reproduction steps.\n'
//       + 'BEGIN;\nSELECT 1;\nEND;';

//       expect(localStorage.setItem).toHaveBeenCalledWith('erd'+params.trans_id, sql);
//       expect(ERDSqlTool.showERDSqlTool).toHaveBeenCalled();
//       done();
//     });
//   });

//   it('onOneToManyClick', ()=>{
//     let node = new FakeNode({}, 'id1');
//     let node1 = new FakeNode({'name': 'table1', schema: 'erd1', columns: [{name: 'col1', type: 'type1', attnum: 1}]}, 'id1');
//     let node2 = new FakeNode({'name': 'table2', schema: 'erd2', columns: [{name: 'col2', type: 'type2', attnum: 2}]}, 'id2');
//     let nodesDict = {
//       'id1': node1,
//       'id2': node2,
//     };
//     jest.spyOn(bodyInstance.diagram, 'getModel').mockReturnValue({
//       'getNodesDict': ()=>nodesDict,
//     });
//     jest.spyOn(bodyInstance.diagram, 'addLink').mockImplementation(() => {});
//     jest.spyOn(bodyInstance.diagram, 'getSelectedNodes').mockReturnValue([node]);

//     bodyInstance.onOneToManyClick();
//     let saveCallback = otmDialog.mock.calls[otmDialog.mock.calls.length - 1][2];
//     let newData = {
//       local_table_uid: 'id1',
//       local_column_attnum: 1,
//       referenced_table_uid: 'id2',
//       referenced_column_attnum: 2,
//     };
//     saveCallback(newData);
//     expect(bodyInstance.diagram.addLink).toHaveBeenCalledWith(newData, 'onetomany');
//   });

//   it('onManyToManyClick', ()=>{
//     let node = new FakeNode({}, 'id1');
//     let node1 = new FakeNode({'name': 'table1', schema: 'erd1', columns: [{name: 'col1', type: 'type1', attnum: 1}]}, 'id1');
//     let node2 = new FakeNode({'name': 'table2', schema: 'erd2', columns: [{name: 'col2', type: 'type2', attnum: 2}]}, 'id2');
//     let nodesDict = {
//       'id1': node1,
//       'id2': node2,
//       'newid1': newNode,
//     };
//     jest.spyOn(bodyInstance.diagram, 'getModel').mockReturnValue({
//       'getNodesDict': ()=>nodesDict,
//     });
//     jest.spyOn(bodyInstance.diagram, 'getSelectedNodes').mockReturnValue([node]);

//     bodyInstance.onManyToManyClick();

//     /* onSave */
//     jest.spyOn(bodyInstance.diagram, 'addLink').mockImplementation(() => {});
//     let saveCallback = mtmDialog.mock.calls[mtmDialog.mock.calls.length - 1][2];
//     let newData = {
//       left_table_uid: 'id1',
//       left_table_column_attnum: 1,
//       right_table_uid: 'id2',
//       right_table_column_attnum: 2,
//     };

//     bodyInstance.diagram.addNode.mockClear();
//     bodyInstance.diagram.addLink.mockClear();
//     saveCallback(newData);
//     let tableData = bodyInstance.diagram.addNode.mock.calls[0][0];
//     expect(tableData).toEqual(expect.objectContaining({
//       name: 'table1_table2',
//       schema: 'erd1',
//     }));
//     expect(tableData.columns[0]).toEqual(expect.objectContaining({
//       type: 'type1',
//       name: 'table1_col1',
//       attnum: 0,
//     }));
//     expect(tableData.columns[1]).toEqual(expect.objectContaining({
//       type: 'type2',
//       name: 'table2_col2',
//       attnum: 1,
//     }));

//     let linkData = {
//       local_table_uid: 'newid1',
//       local_column_attnum: 0,
//       referenced_table_uid: 'id1',
//       referenced_column_attnum : 1,
//     };
//     expect(bodyInstance.diagram.addLink.mock.calls[0]).toEqual([linkData, 'onetomany']);
//     linkData = {
//       local_table_uid: 'newid1',
//       local_column_attnum: 1,
//       referenced_table_uid: 'id2',
//       referenced_column_attnum : 2,
//     };
//     expect(bodyInstance.diagram.addLink.mock.calls[1]).toEqual([linkData, 'onetomany']);
//   });

//   it('onNoteClick', ()=>{
//     let noteNode = {key: 'value', getNote: ()=>'a note'};
//     jest.spyOn(bodyInstance.diagram, 'getSelectedNodes').mockReturnValue([noteNode]);
//     jest.spyOn(bodyInstance.diagram.getEngine(), 'getNodeElement').mockReturnValue(null);
//     jest.spyOn(bodyInstance.diagram.getEngine(), 'getNodeElement').mockReturnValue(null);
//     jest.spyOn(bodyInstance, 'setState').mockImplementation(() => {});
//     bodyInstance.onNoteClick();
//     expect(bodyInstance.setState).toHaveBeenCalledWith({
//       note_node: noteNode,
//       note_open: true,
//     });
//   });
// });
