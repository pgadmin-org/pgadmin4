/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import {TreeFake} from '../tree/tree_fake';
import SearchObjectsDialogWrapper from 'tools/search_objects/static/js/search_objects_dialog_wrapper';
import axios from 'axios/index';
import MockAdapter from 'axios-mock-adapter';
import {TreeNode} from '../../../pgadmin/static/js/tree/tree';

let context = describe;

describe('SearchObjectsDialogWrapper', () => {
  let jquerySpy;
  let pgBrowser;
  let alertifySpy;
  let dialogModelKlassSpy = null;
  let backform;
  let soDialogWrapper;
  let noDataNode;
  let serverTreeNode;
  let databaseTreeNode;
  let viewSchema;
  let soJQueryContainerSpy;
  let soNodeChildNodeSpy;
  let soNode;

  beforeEach(() => {
    pgBrowser = {
      treeMenu: new TreeFake(),
      Nodes: {
        server: {
          hasId: true,
          getTreeNodeHierarchy: jasmine.createSpy('getTreeNodeHierarchy'),
        },
        database: {
          hasId: true,
          getTreeNodeHierarchy: jasmine.createSpy('getTreeNodeHierarchy'),
        },
        'coll-sometype': {
          type: 'coll-sometype',
          hasId: false,
          label: 'Some types coll',
        },
        sometype: {
          type: 'sometype',
          hasId: true,
        },
        someothertype: {
          type: 'someothertype',
          hasId: true,
          collection_type: 'coll-sometype',
        },
        'coll-edbfunc': {
          type: 'coll-edbfunc',
          hasId: true,
          label: 'Functions',
        },
        'coll-edbproc': {
          type: 'coll-edbfunc',
          hasId: true,
          label: 'Procedures',
        },
        'coll-edbvar': {
          type: 'coll-edbfunc',
          hasId: true,
          label: 'Variables',
        },
      },
      keyboardNavigation: jasmine.createSpyObj('keyboardNavigation', ['getDialogTabNavigator']),
    };
    noDataNode = pgBrowser.treeMenu.addNewNode('level1.1', undefined, [{id: 'level1'}]);
    serverTreeNode = pgBrowser.treeMenu.addNewNode('level2.1', {
      _type: 'server',
      _id: 10,
      label: 'some-tree-label',
    }, [{id: 'level2.1'}]);
    databaseTreeNode = new TreeNode('database-tree-node', {
      _type: 'database',
      _id: 123,
      _label: 'some-database-label',
    }, [{id: 'database-tree-node'}]);
    pgBrowser.treeMenu.addChild(serverTreeNode, databaseTreeNode);

    jquerySpy = jasmine.createSpy('jquerySpy');
    soNode = {
      __internal: {
        buttons: [{}, {}, {}, {
          element: {
            disabled: false,
          },
        }],
      },
      elements: {
        body: {
          childNodes: [
            {},
          ],
        },
        content: jasmine.createSpyObj('content', ['appendChild', 'attr']),
      },
    };

    soJQueryContainerSpy = jasmine.createSpyObj('soJQueryContainer', ['get', 'attr']);
    soJQueryContainerSpy.get.and.returnValue(soJQueryContainerSpy);

    viewSchema = {};
    backform = jasmine.createSpyObj('backform', ['generateViewSchema', 'Dialog']);
    backform.generateViewSchema.and.returnValue(viewSchema);

    soNodeChildNodeSpy = jasmine.createSpyObj('something', ['addClass']);
    jquerySpy.and.callFake((selector) => {
      if (selector === '<div class=\'search_objects_dialog\'></div>') {
        return soJQueryContainerSpy;
      } else if (selector === soNode.elements.body.childNodes[0]) {
        return soNodeChildNodeSpy;
      }
    });
    alertifySpy = jasmine.createSpyObj('alertify', ['alert', 'dialog']);

  });

  describe('#prepare', () => {
    beforeEach(() => {
      soDialogWrapper = new SearchObjectsDialogWrapper(
        '<div class=\'search_objects_dialog\'></div>',
        'soDialogTitle',
        'search_objects',
        jquerySpy,
        pgBrowser,
        alertifySpy,
        dialogModelKlassSpy,
        backform
      );
      soDialogWrapper = Object.assign(soDialogWrapper, soNode);
      spyOn(soDialogWrapper, 'prepareDialog').and.callThrough();
      spyOn(soDialogWrapper, 'setTypes');
      spyOn(soDialogWrapper, 'setResultCount');
    });

    context('no tree element is selected', () => {
      it('does not prepare dialog', () => {
        spyOn(soDialogWrapper, 'prepareDialog');
        soDialogWrapper.prepare();
        expect(soDialogWrapper.prepareDialog).not.toHaveBeenCalled();
      });
    });

    context('selected tree node has no data', () => {
      beforeEach(() => {
        pgBrowser.treeMenu.selectNode(noDataNode.domNode);
      });

      it('does not prepare the dialog', () => {
        spyOn(soDialogWrapper, 'prepareDialog');
        soDialogWrapper.prepare();
        expect(soDialogWrapper.prepareDialog).not.toHaveBeenCalled();
      });
    });

    context('tree element is selected', () => {
      let gridDestroySpy;
      let networkMock;

      beforeEach(() => {
        pgBrowser.treeMenu.selectNode(databaseTreeNode.domNode);
        soDialogWrapper.grid = jasmine.createSpyObj('grid', ['destroy']);
        spyOn(soDialogWrapper, 'showMessage');
        gridDestroySpy = spyOn(soDialogWrapper.grid, 'destroy');

        networkMock = new MockAdapter(axios);

      });

      afterEach(() => {
        networkMock.restore();
      });

      it('creates dialog and displays it', () => {
        soDialogWrapper.prepare();
        expect(soDialogWrapper.prepareDialog).toHaveBeenCalled();
        expect(soDialogWrapper.showMessage).toHaveBeenCalledWith(null);
      });


      it('if grid set then destroy it', () => {
        soDialogWrapper.prepare();
        expect(gridDestroySpy).toHaveBeenCalled();
        expect(soDialogWrapper.grid).toBe(null);
      });

      it('set result count to 0', () => {
        soDialogWrapper.prepare();
        expect(soDialogWrapper.setResultCount).toHaveBeenCalledWith(0);
      });

      it('setTypes called before and after the ajax success', (done) => {
        networkMock.onGet('/search_objects/types/10/123').reply(200, {
          'data': {
            'type1': 'Type Label 1',
            'type2': 'Type Label 2',
          },
        });

        soDialogWrapper.prepare();

        expect(soDialogWrapper.setTypes.calls.argsFor(0)).toEqual([
          [{ id: -1, text: 'Loading...', value: null }], false,
        ]);

        setTimeout(()=>{
          expect(soDialogWrapper.setTypes.calls.argsFor(1)).toEqual([
            [{id: 'all', text: 'All types'},
              {id: 'type1', text: 'Type Label 1'},
              {id: 'type2', text: 'Type Label 2'}],
          ]);
          done();
        }, 0);
      });

      it('setTypes called after the ajax fail', (done) => {
        networkMock.onGet('/search_objects/types/10/123').reply(500);

        soDialogWrapper.prepare();

        expect(soDialogWrapper.setTypes.calls.argsFor(0)).toEqual([
          [{ id: -1, text: 'Loading...', value: null }], false,
        ]);

        setTimeout(()=>{
          expect(soDialogWrapper.setTypes.calls.argsFor(1)).toEqual([
            [{id: -1, text: 'Failed', value: null }], false,
          ]);
          done();
        }, 0);
      });
    });
  });

  describe('showMessage', () => {
    beforeEach(() => {
      soDialogWrapper = new SearchObjectsDialogWrapper(
        '<div class=\'search_objects_dialog\'></div>',
        'soDialogTitle',
        'search_objects',
        jquerySpy,
        pgBrowser,
        alertifySpy,
        dialogModelKlassSpy,
        backform
      );
      soDialogWrapper.statusBar = document.createElement('div');
      soDialogWrapper.statusBar.classList.add('d-none');
      document.body.appendChild(soDialogWrapper.statusBar);
    });

    afterEach(() => {
      document.body.removeChild(soDialogWrapper.statusBar);
    });
    it('when info message', ()=>{
      soDialogWrapper.showMessage('locating', false);
      expect(soDialogWrapper.statusBar.classList.contains('d-none')).toBe(false);
      expect(soDialogWrapper.statusBar.querySelector('.error-in-footer')).toBe(null);
      expect(soDialogWrapper.statusBar.querySelector('.info-in-footer')).not.toBe(null);
      expect(soDialogWrapper.statusBar.querySelector('.alert-text').innerHTML).toEqual('locating');
    });

    it('when error message', ()=>{
      soDialogWrapper.showMessage('some error', true);
      expect(soDialogWrapper.statusBar.classList.contains('d-none')).toBe(false);
      expect(soDialogWrapper.statusBar.querySelector('.error-in-footer')).not.toBe(null);
      expect(soDialogWrapper.statusBar.querySelector('.info-in-footer')).toBe(null);
      expect(soDialogWrapper.statusBar.querySelector('.alert-text').innerHTML).toEqual('some error');
    });

    it('when no message', ()=>{
      soDialogWrapper.showMessage(null);
      expect(soDialogWrapper.statusBar.classList.contains('d-none')).toBe(true);
    });
  });

  describe('function', () => {
    beforeEach(() => {
      soDialogWrapper = new SearchObjectsDialogWrapper(
        '<div class=\'search_objects_dialog\'></div>',
        'soDialogTitle',
        'search_objects',
        jquerySpy,
        pgBrowser,
        alertifySpy,
        dialogModelKlassSpy,
        backform
      );
    });

    it('updateDimOfSearchResult', ()=>{
      soDialogWrapper.searchResultContainer = document.createElement('div');
      soDialogWrapper.searchResult = document.createElement('div');
      spyOn(soDialogWrapper.searchResultContainer, 'getBoundingClientRect').and.returnValue({height:100, width: 50});

      soDialogWrapper.updateDimOfSearchResult();
      expect(soDialogWrapper.searchResult.style.height).toEqual('100px');
      expect(soDialogWrapper.searchResult.style.width).toEqual('50px');
    });

    it('setLoading', ()=>{
      soDialogWrapper.loader = document.createElement('div');
      soDialogWrapper.loader.innerHTML = `
        <div class="pg-sp-text"></div>
      `;

      soDialogWrapper.setLoading('loading');
      expect(soDialogWrapper.loader.classList.contains('d-none')).toBe(false);
      expect(soDialogWrapper.loader.querySelector('.pg-sp-text').innerHTML).toEqual('loading');

      soDialogWrapper.setLoading(null);
      expect(soDialogWrapper.loader.classList.contains('d-none')).toBe(true);
    });

    it('searchBtnEnabled', ()=>{
      soDialogWrapper.searchBtn = document.createElement('button');

      soDialogWrapper.searchBtnEnabled(true);
      expect(soDialogWrapper.searchBtn.disabled).toEqual(false);
      expect(soDialogWrapper.searchBtnEnabled()).toEqual(true);

      soDialogWrapper.searchBtnEnabled(false);
      expect(soDialogWrapper.searchBtn.disabled).toEqual(true);
      expect(soDialogWrapper.searchBtnEnabled()).toEqual(false);
    });

    it('searchBoxVal', ()=>{
      soDialogWrapper.searchBox = document.createElement('input');
      soDialogWrapper.searchBoxVal('abc');
      expect(soDialogWrapper.searchBox.value).toEqual('abc');
      expect(soDialogWrapper.searchBoxVal()).toEqual('abc');
    });

    it('typesVal', ()=>{
      soDialogWrapper.typesSelect = document.createElement('select');
      let opt = document.createElement('option');
      opt.appendChild( document.createTextNode('Some type') );
      opt.value = 'sometype';
      soDialogWrapper.typesSelect.appendChild(opt);

      soDialogWrapper.typesVal('sometype');
      expect(soDialogWrapper.typesSelect.value).toEqual('sometype');
      expect(soDialogWrapper.typesVal()).toEqual('sometype');
    });

    it('setGridData', ()=>{
      soDialogWrapper.dataview = jasmine.createSpyObj('dataview', ['setItems']);
      soDialogWrapper.setGridData([{id:'somedata'}]);
      expect(soDialogWrapper.dataview.setItems).toHaveBeenCalled();
    });

    it('setGridData', ()=>{
      soDialogWrapper.searchResultCount = document.createElement('span');

      soDialogWrapper.setResultCount(0);
      expect(soDialogWrapper.searchResultCount.innerHTML).toEqual('0 matches found.');

      soDialogWrapper.setResultCount(1);
      expect(soDialogWrapper.searchResultCount.innerHTML).toEqual('1 match found.');

      soDialogWrapper.setResultCount();
      expect(soDialogWrapper.searchResultCount.innerHTML).toEqual('Unknown matches found.');
    });

    it('onDialogResize', ()=>{
      soDialogWrapper.grid = jasmine.createSpyObj('grid', ['autosizeColumns', 'resizeCanvas']);
      spyOn(soDialogWrapper, 'updateDimOfSearchResult');

      soDialogWrapper.onDialogResize();
      expect(soDialogWrapper.updateDimOfSearchResult).toHaveBeenCalled();
      expect(soDialogWrapper.grid.resizeCanvas).toHaveBeenCalled();
      expect(soDialogWrapper.grid.autosizeColumns).toHaveBeenCalled();
    });

    it('onDialogShow', (done)=>{
      spyOn(soDialogWrapper, 'prepareGrid').and.callFake(function() {
        this.grid = jasmine.createSpyObj('grid', ['init']);
      });

      spyOn(soDialogWrapper, 'focusOnDialog');
      spyOn(soDialogWrapper, 'updateDimOfSearchResult');
      spyOn(soDialogWrapper, 'setGridData');
      spyOn(soDialogWrapper, 'onDialogResize');


      soDialogWrapper.onDialogShow();
      setTimeout(()=>{
        expect(soDialogWrapper.prepareGrid).toHaveBeenCalled();
        expect(soDialogWrapper.focusOnDialog).toHaveBeenCalled();
        expect(soDialogWrapper.setGridData).toHaveBeenCalledWith([]);
        expect(soDialogWrapper.onDialogResize).toHaveBeenCalled();
        done();
      }, 750);
    });

    context('getCollNode', ()=>{
      it('type have same coll node', ()=>{
        let collNode = soDialogWrapper.getCollNode('sometype');
        expect(collNode.type).toEqual('coll-sometype');
      });

      it('type does not same coll node', ()=>{
        let collNode = soDialogWrapper.getCollNode('someothertype');
        expect(collNode.type).toEqual('coll-sometype');
      });

      it('type does not have coll node at all', ()=>{
        let collNode = soDialogWrapper.getCollNode('database');
        expect(collNode).toBe(null);
      });
    });

    it('finaliseData', ()=>{
      spyOn(soDialogWrapper, 'translateSearchObjectsPath').and.returnValue(['disp/path', ['obj1/123', 'obj2/432']]);
      let data = soDialogWrapper.finaliseData({
        name: 'objname',
        type: 'sometype',
        type_label: 'Some types coll',
        path: ':some.123:/path',
        show_node: true,
        other_info: null,
      });
      expect(data).toEqual({
        id: 'obj1/123.obj2/432',
        icon: 'icon-sometype',
        name: 'objname',
        type: 'sometype',
        type_label: 'Some types coll',
        path: 'disp/path',
        id_path: ['obj1/123', 'obj2/432'],
        show_node: true,
        other_info: null,
      });
    });

    context('translateSearchObjectsPath', ()=>{
      let path = null, catalog_level = null;
      beforeEach(()=>{
        pgBrowser.Nodes = {
          'server_group': {
            type:'server_group',
            label: 'Server group',
          },
          'server': {
            type:'server',
            label: 'Server',
          },
          'coll-database': {
            type:'coll-database',
            label: 'Databases',
          },
          'database': {
            type:'database',
            label: 'Database',
          },
          'coll-schema': {
            type:'coll-schema',
            label: 'Schemas',
          },
          'schema': {
            type:'schema',
            label: 'Schema',
          },
          'coll-table': {
            type:'coll-table',
            label: 'Tables',
          },
          'table': {
            type:'table',
            label: 'Table',
          },
          'sometype': {
            type:'sometype',
            label: 'Some type',
            collection_type: 'coll-table',
          },
          'coll-catalog': {
            type:'coll-catalog',
            label: 'Catalogs',
          },
          'catalog': {
            type:'catalog',
            label: 'Catalog',
          },
          'coll-catalog_object': {
            type:'coll-catalog_object',
            label: 'Catalog Objects',
          },
          'catalog_object': {
            type:'catalog_object',
            label: 'catalog object',
          },
        };

        soDialogWrapper.treeInfo = {
          'server_group': {'id': 'server_group/1', '_id': 1},
          'server': {'id': 'server/3', '_id': 3},
          'database': {'id': 'database/18456', '_id': 18456},
        };
      });
      it('regular schema', ()=>{
        path = ':schema.2200:/test_db/:table.2604:/sampletab';
        catalog_level = 'N';

        let retVal = soDialogWrapper.translateSearchObjectsPath(path, catalog_level);
        expect(retVal).toEqual([
          'Schemas/test_db/Tables/sampletab',
          ['server_group/1','server/3','coll-database/3','database/18456','coll-schema/18456','schema/2200','coll-table/2200','table/2604'],
        ]);
      });

      context('catalog schema', ()=>{
        it('with db support', ()=>{
          path = ':schema.11:/PostgreSQL Catalog (pg_catalog)/:table.2604:/pg_class';
          catalog_level = 'D';

          let retVal = soDialogWrapper.translateSearchObjectsPath(path, catalog_level);
          expect(retVal).toEqual([
            'Catalogs/PostgreSQL Catalog (pg_catalog)/Tables/pg_class',
            ['server_group/1','server/3','coll-database/3','database/18456','coll-catalog/18456','catalog/11','coll-table/11','table/2604'],
          ]);
        });

        it('with object support only', ()=>{
          path = ':schema.11:/ANSI (information_schema)/:table.2604:/attributes';
          catalog_level = 'O';

          let retVal = soDialogWrapper.translateSearchObjectsPath(path, catalog_level);
          expect(retVal).toEqual([
            'Catalogs/ANSI (information_schema)/Catalog Objects/attributes',
            ['server_group/1','server/3','coll-database/3','database/18456','coll-catalog/18456','catalog/11','coll-catalog_object/11','catalog_object/2604'],
          ]);
        });
      });
    });
  });
});
