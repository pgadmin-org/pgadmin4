import {getTreeNodeHierarchyFromElement} from 'sources/tree/pgadmin_tree_node';
import axios from 'axios/index';
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import 'select2';
import {DialogWrapper} from 'sources/alertify/dialog_wrapper';
import Slick from 'sources/../bundle/slickgrid';
import pgAdmin from 'sources/pgadmin';
import _ from 'underscore';


export default class SearchObjectsDialogWrapper extends DialogWrapper {
  constructor(dialogContainerSelector, dialogTitle, typeOfDialog,
    jquery, pgBrowser, alertify, dialogModel, backform) {
    super(dialogContainerSelector, dialogTitle, jquery,
      pgBrowser, alertify, dialogModel, backform);

    this.grid = null;
    this.dataview = null;
    this.gridContainer = null;
  }

  showMessage(text, is_error, call_after_show=()=>{}) {
    if(text == '' || text == null) {
      this.statusBar.classList.add('d-none');
    } else {
      if(is_error) {
        this.statusBar.innerHTML = `
          <div class="error-in-footer">
            <div class="d-flex px-2 py-1">
              <div class="pr-2">
                <i class="fa fa-exclamation-triangle" aria-hidden="true" role="img"></i>
              </div>
              <div role="alert" class="alert-text">${text}</div>
              <div class="ml-auto close-error-bar">
                <a class="close-error fa fa-times text-danger"></a>
              </div>
            </div>
          </div>
        `;

        this.statusBar.querySelector('.close-error').addEventListener('click', ()=>{
          this.showMessage(null);
        });
      } else {
        this.statusBar.innerHTML = `
          <div class="info-in-footer">
            <div class="d-flex px-2 py-1">
              <div class="pr-2">
                <i class="fa fa-info-circle" aria-hidden="true"></i>
              </div>
              <div class="alert-text" role="alert">${text}</div>
            </div>
          </div>
        `;
      }
      this.statusBar.classList.remove('d-none');
      call_after_show(this.statusBar);
    }
  }

  createDialogDOM(dialogContainer) {
    dialogContainer.innerHTML = `
      <div class="d-flex flex-column w-100 h-100">
        <div class="p-2">
          <div class="row">
            <div class="col-6">
              <div class="input-group pgadmin-controls">
                  <input type="search" class="form-control" id="txtGridSearch" placeholder="` + gettext('Type at least 3 characters') + `"
                    tabindex="0" aria-describedby="labelSearch" aria-labelledby="labelSearch" autocomplete="off">
              </div>
            </div>
            <div class="col-4 d-flex">
              <select aria-label="` + gettext('Object types') + `" class="node-types"></select>
            </div>
            <div class="col-2">
              <button class="btn btn-primary btn-search w-100" disabled><span class="fa fa-search"></span>&nbsp;`+ gettext('Search') +`</button>
            </div>
          </div>
        </div>
        <div class="search-result-container flex-grow-1">
          <div class="pg-sp-container d-none">
            <div class="pg-sp-content">
              <div class="row"><div class="col-12 pg-sp-icon"></div></div>
              <div class="row"><div class="col-12 pg-sp-text"></div></div>
            </div>
          </div>
          <div class="search-result"></div>
        </div>
        <div class='search-result-count p-1'>
        </div>
        <div class="pg-prop-status-bar">
        </div>
      </div>
    `;

    return dialogContainer;
  }

  updateDimOfSearchResult() {
    let dim = this.searchResultContainer.getBoundingClientRect();
    this.searchResult.style.height = dim.height + 'px';
    this.searchResult.style.width = dim.width + 'px';
  }

  setLoading(text) {
    if(text != null) {
      this.loader.classList.remove('d-none');
      this.loader.querySelector('.pg-sp-text').innerHTML = text;
    } else {
      this.loader.classList.add('d-none');
    }
  }

  searchBtnEnabled(enabled) {
    if(typeof(enabled) != 'undefined') {
      this.searchBtn.disabled = !enabled;
    } else {
      return !this.searchBtn.disabled;
    }
  }

  searchBoxVal(val) {
    if(typeof(val) != 'undefined') {
      this.searchBox.value = val;
    } else {
      return this.searchBox.value.trim();
    }
  }

  typesVal(val) {
    if(typeof(val) != 'undefined') {
      this.typesSelect.value = val;
    } else {
      return this.typesSelect.value;
    }
  }

  setTypes(data, enabled=true) {
    this.jquery(this.typesSelect).empty().select2({
      data: data,
    });

    this.typesSelect.disabled = !enabled;
  }

  setResultCount(count) {
    if(count != 0 && !count) {
      count = gettext('Unknown');
    }
    this.searchResultCount.innerHTML = (count===1 ? gettext('%s match found.', count): gettext('%s matches found.', count));
  }

  showOtherInfo(rowno) {
    let rowData = this.dataview.getItem(rowno);
    rowData.name += ` (${rowData.other_info})`;
    rowData.other_info = null;
    this.dataview.updateItem(rowData.id, rowData);
  }

  setGridData(data) {
    this.dataview.setItems(data);
  }

  prepareGrid() {
    this.dataview = new Slick.Data.DataView();

    this.dataview.getItemMetadata = (row)=>{
      let rowData = this.dataview.getItem(row);
      if(!rowData.show_node){
        return {
          cssClasses: 'object-muted',
        };
      }
      return null;
    };

    this.dataview.setFilter((item, args)=>{
      if(args && args.type != 'all') {
        if(Array.isArray(args.type)) {
          return (args.type.indexOf(item.type) != -1);
        } else {
          return args.type == item.type;
        }
      }
      return true;
    });

    /* jquery required for select2 */
    this.jquery(this.typesSelect).on('change', ()=>{
      let type = this.typesVal();
      if(type === 'constraints') {
        type = ['constraints', 'check_constraint', 'foreign_key', 'primary_key', 'unique_constraint', 'exclusion_constraint'];
      }
      this.dataview.setFilterArgs({ type: type });
      this.dataview.refresh();
    });

    this.dataview.onRowCountChanged.subscribe((e, args) => {
      this.grid.updateRowCount();
      this.grid.render();
      this.setResultCount(args.current);
    });

    this.dataview.onRowsChanged.subscribe((e, args) => {
      this.grid.invalidateRows(args.rows);
      this.grid.render();
    });

    this.grid = new Slick.Grid(
      this.searchResult,
      this.dataview,
      [
        { id: 'name', name: gettext('Object name'), field: 'name', sortable: true, width: 50,
          formatter: (row, cell, value, columnDef, dataContext) => {
            let ret_el = `<i class='wcTabIcon ${dataContext.icon}'></i>${value}`;

            if(dataContext.other_info != null && dataContext.other_info != '') {
              ret_el += '&nbsp;<span class="object-other-info">(...)</span>';
            }

            return ret_el;
          },
        },
        { id: 'type', name: gettext('Type'), field: 'type_label', sortable: true, width: 35 },
        { id: 'path', name: gettext('Browser path'), field: 'path', sortable: false, formatter: (row, cell, value) => value },
      ],
      {
        enableCellNavigation: true,
        enableColumnReorder: false,
        multiColumnSort: true,
        explicitInitialization: true,
      }
    );

    this.grid.registerPlugin(new Slick.AutoColumnSize());

    this.grid.setSelectionModel(new Slick.RowSelectionModel({selectActiveRow: true}));

    this.grid.onKeyDown.subscribe((event) => {
      let activeRow = this.grid.getActiveCell();
      if(activeRow && !event.ctrlKey && !event.altKey && !event.metaKey && event.keyCode == 9) {
        event.preventDefault();
        event.stopImmediatePropagation();

        if(event.shiftKey) {
          this.prevToGrid.focus();
        } else {
          this.nextToGrid.focus();
        }
      }
    });

    this.grid.onClick.subscribe((event, args) => {
      if(event.target.classList.contains('object-other-info')) {
        this.showOtherInfo(args.row);
      }
    });

    this.grid.onDblClick.subscribe((event, args) => {
      let rowData = this.dataview.getItem(args.row);
      let treeMenu = this.pgBrowser.treeMenu;

      if(!rowData.show_node) {
        this.showMessage(
          gettext('%s objects are disabled in the browser. You can enable them in the <a class="pref-dialog-link">preferences dialog</a>.', rowData.type_label),
          true,
          (statusBar)=>{
            statusBar.querySelector('.pref-dialog-link').addEventListener('click', ()=>{
              if(pgAdmin.Preferences) {
                pgAdmin.Preferences.show();
              }
            });
          }
        );
        return false;
      }
      this.showMessage(gettext('Locating...'));
      treeMenu.findNodeWithToggle(rowData.id_path)
        .then((treeItem)=>{
          treeMenu.selectNode(treeItem.domNode, true);
          this.showMessage(null);
        })
        .catch((error)=>{
          this.showMessage(gettext('Unable to locate this object in the browser.'), true);
          console.warn(error, rowData.id_path);
        });
    });

    this.grid.onSort.subscribe((event, args) => {
      let cols = args.sortCols;

      this.dataview.sort(function (dataRow1, dataRow2) {
        for (var i = 0, l = cols.length; i < l; i++) {
          var field = cols[i].sortCol.field;
          var sign = cols[i].sortAsc ? 1 : -1;
          var value1 = dataRow1[field], value2 = dataRow2[field];
          var result = (value1 == value2 ? 0 : (value1 > value2 ? 1 : -1)) * sign;
          if (result != 0) {
            return result;
          }
        }
        return false;
      }, true);
    });
  }

  onDialogResize() {
    this.updateDimOfSearchResult();

    if(this.grid) {
      this.grid.resizeCanvas();
      this.grid.autosizeColumns();
    }
  }

  onDialogShow() {
    this.focusOnDialog(this);

    setTimeout(()=>{
      if(!this.grid) {
        this.prepareGrid();
      }
      this.updateDimOfSearchResult();
      this.grid.init();
      this.setGridData([]);
      this.onDialogResize();
    }, 500);
  }

  getBaseUrl(endpoint) {
    return url_for('search_objects.'+endpoint, {
      sid: this.treeInfo.server._id,
      did: this.treeInfo.database._id,
    });
  }

  getCollNode(node_type) {
    if('coll-'+node_type in this.pgBrowser.Nodes) {
      return this.pgBrowser.Nodes['coll-'+node_type];
    } else if(node_type in this.pgBrowser.Nodes &&
              typeof(this.pgBrowser.Nodes[node_type].collection_type) === 'string') {
      return this.pgBrowser.Nodes[this.pgBrowser.Nodes[node_type].collection_type];
    }

    return null;
  }

  getSelectedNode() {
    const tree = this.pgBrowser.treeMenu;
    const selectedNode = tree.selected();
    if (selectedNode) {
      return tree.findNodeByDomElement(selectedNode);
    } else {
      return undefined;
    }
  }

  finaliseData(datum) {
    datum.icon = 'icon-' + datum.type;
    /* finalise path */
    [datum.path, datum.id_path] = this.translateSearchObjectsPath(datum.path, datum.catalog_level);
    /* id is required by slickgrid dataview */
    datum.id = datum.id_path ? datum.id_path.join('.') : _.uniqueId(datum.name);

    /* Esacpe XSS */
    datum.name = _.escape(datum.name);
    datum.path = _.escape(datum.path);
    datum.other_info = datum.other_info ? _.escape(datum.other_info) : datum.other_info;

    return datum;
  }

  /* This function will translate the path given by search objects API into two parts
   * 1. The display path on the UI
   * 2. The tree search path to locate the object on the tree.
   *
   * Sample path returned by search objects API
   * :schema.11:/pg_catalog/:table.2604:/pg_attrdef
   *
   * Sample path required by tree locator
   * Normal object  - server_group/1.server/3.coll-database/3.database/13258.coll-schema/13258.schema/2200.coll-table/2200.table/41773
   * pg_catalog schema - server_group/1.server/3.coll-database/3.database/13258.coll-catalog/13258.catalog/11.coll-table/11.table/2600
   * Information Schema, dbo, sys:
   *  server_group/1.server/3.coll-database/3.database/13258.coll-catalog/13258.catalog/12967.coll-catalog_object/12967.catalog_object/13204
   *  server_group/1.server/11.coll-database/11.database/13258.coll-catalog/13258.catalog/12967.coll-catalog_object/12967.catalog_object/12997.coll-catalog_object_column/12997.catalog_object_column/13
   *
   * Column catalog_level has values as
   * N - Not a catalog schema
   * D - Catalog schema with DB support - pg_catalog
   * O - Catalog schema with object support only - info schema, dbo, sys
   */
  translateSearchObjectsPath(path, catalog_level) {
    if (path === null) {
      return [null, null];
    }

    catalog_level = catalog_level || 'N';

    /* path required by tree locator */
    /* the path received from the backend is after the DB node, initial path setup */
    let id_path = [
      this.treeInfo.server_group.id,
      this.treeInfo.server.id,
      this.getCollNode('database').type + '/' + this.treeInfo.server._id,
      this.treeInfo.database.id,
    ];

    let prev_node_id = this.treeInfo.database._id;

    /* add the slash to match regex, remove it from display path later */
    path = '/' + path;
    /* the below regex will match all /:schema.2200:/ */
    let new_path = path.replace(/\/:[a-zA-Z_]+\.[0-9]+:\//g, (token)=>{
      let orig_token = token;
      /* remove the slash and colon */
      token = token.slice(2, -2);
      let [node_type, node_oid, others] = token.split('.');
      if(typeof(others) !== 'undefined') {
        return token;
      }

      /* schema type is "catalog" for catalog schemas */
      node_type = (['D', 'O'].indexOf(catalog_level) != -1 && node_type == 'schema') ? 'catalog' : node_type;

      /* catalog like info schema will only have views and tables AKA catalog_object except for pg_catalog */
      node_type = (catalog_level === 'O' && ['view', 'table'].indexOf(node_type) != -1) ? 'catalog_object' : node_type;

      /* catalog_object will have column node as catalog_object_column */
      node_type = (catalog_level === 'O' && node_type == 'column') ? 'catalog_object_column' : node_type;

      /* If collection node present then add it */
      let coll_node = this.getCollNode(node_type);
      if(coll_node) {
        /* Add coll node to the path */
        if(prev_node_id != null) id_path.push(`${coll_node.type}/${prev_node_id}`);

        /* Add the node to the path */
        id_path.push(`${node_type}/${node_oid}`);

        /* This will be needed for coll node */
        prev_node_id = node_oid;

        /* This will be displayed in the grid */
        return  `/${coll_node.label}/`;
      } else if(node_type in this.pgBrowser.Nodes) {
        /* Add the node to the path */
        id_path.push(`${node_type}/${node_oid}`);

        /* This will be need for coll node id path */
        prev_node_id = node_oid;

        /* Remove the token and replace with slash. This will be displayed in the grid */
        return '/';
      }
      prev_node_id = null;
      return orig_token;
    });

    /* Remove the slash we had added */
    new_path = new_path.substring(1);
    return [new_path, id_path];
  }

  prepareDialog() {
    this.showMessage(null);
    this.setResultCount(0);
    if(this.grid) {
      this.grid.destroy();
      this.grid = null;
    }

    /* Load types */
    this.setTypes([{
      id: -1,
      text: gettext('Loading...'),
      value: null,
    }], false);

    axios.get(
      this.getBaseUrl('types')
    ).then((res)=>{
      let types = [{
        id: 'all',
        text: gettext('All types'),
      }];

      for (const key of Object.keys(res.data.data).sort()) {
        types.push({
          id: key,
          text: res.data.data[key],
        });
      }
      this.setTypes(types);
    }).catch(()=>{
      this.setTypes([{
        id: -1,
        text: gettext('Failed'),
        value: null,
      }], false);
    });
  }

  main(title) {
    this.set('title', title);
  }

  setup() {
    return {
      buttons: [{
        text: '',
        key: 112,
        className: 'btn btn-primary-icon pull-left fa fa-question pg-alertify-icon-button',
        attrs: {
          name: 'dialog_help',
          type: 'button',
          label: gettext('Help'),
          'aria-label': gettext('Help'),
          url: url_for('help.static', {
            'filename': 'search_objects.html',
          }),
        },
      }, {
        text: gettext('Close'),
        key: 27,
        className: 'btn btn-secondary fa fa-lg fa-times pg-alertify-button',
        'data-btn-name': 'cancel',
      }],
      // Set options for dialog
      options: {
        title: this.dialogTitle,
        //disable both padding and overflow control.
        padding: !1,
        overflow: !1,
        model: 0,
        resizable: true,
        maximizable: true,
        pinnable: false,
        closableByDimmer: false,
        modal: false,
      },
    };
  }

  build() {
    let tmpEle = document.createElement('div');
    tmpEle.innerHTML = this.dialogContainerSelector;
    let dialogContainer = tmpEle.firstChild;

    // Append the container
    this.elements.content.innerHTML = '';
    this.elements.content.appendChild(dialogContainer);

    this.createDialogDOM(dialogContainer);
    this.alertify.pgDialogBuild.apply(this);

    this.loader = dialogContainer.getElementsByClassName('pg-sp-container')[0];

    this.searchBox = dialogContainer.querySelector('#txtGridSearch');
    this.searchBtn = dialogContainer.querySelector('.btn-search');
    this.typesSelect = dialogContainer.querySelector('.node-types');
    this.searchResultContainer = dialogContainer.querySelector('.search-result-container');
    this.searchResult = dialogContainer.querySelector('.search-result');
    this.searchResultCount = dialogContainer.querySelector('.search-result-count');
    this.statusBar = dialogContainer.querySelector('.pg-prop-status-bar');

    /* These two values are required to come out of grid when tab is
     * pressed in the grid. Slickgrid does not allow any way to come out
     */
    this.nextToGrid = this.elements.footer.querySelector('.ajs-button');
    this.prevToGrid = this.typesSelect;

    /* init select2 */
    this.setTypes([{
      id: -1,
      text: gettext('Loading...'),
      value: null,
    }], false);

    /* on search box change */
    this.searchBox.addEventListener('input', ()=>{
      if(this.searchBoxVal().length >= 3) {
        this.searchBtnEnabled(true);
      } else {
        this.searchBtnEnabled(false);
      }
    });

    /* on enter key press */
    this.searchBox.addEventListener('keypress', (e)=>{
      if(e.keyCode == 13) {
        e.stopPropagation();
        if(this.searchBtnEnabled()) {
          this.searchBtn.dispatchEvent(new Event('click'));
        }
      }
    });

    /* on search button click */
    this.searchBtn.addEventListener('click', ()=>{
      this.searchBtnEnabled(false);
      this.setGridData([]);
      this.showMessage(null);

      this.setLoading(gettext('Searching....'));
      axios.get(this.getBaseUrl('search'), {
        params: {
          text: this.searchBoxVal(),
          type: this.typesVal(),
        },
      }).then((res)=>{
        let grid_data = res.data.data.map((row)=>{
          return this.finaliseData(row);
        });

        this.setGridData(grid_data);
      }).catch((error)=>{
        let errmsg = '';

        if (error.response) {
          if(error.response.data && error.response.data.errormsg) {
            errmsg = error.response.data.errormsg;
          } else {
            errmsg = error.response.statusText;
          }
        } else if (error.request) {
          errmsg = gettext('No response received');
        } else {
          errmsg = error.message;
        }
        this.showMessage(gettext('An unexpected occurred: %s', errmsg), true);
        console.warn(error);
      }).finally(()=>{
        this.setLoading(null);
        this.searchBtnEnabled(true);
      });
    });

    this.set({
      'onresized': this.onDialogResize.bind(this),
      'onmaximized': this.onDialogResize.bind(this),
      'onrestored': this.onDialogResize.bind(this),
      'onshow': this.onDialogShow.bind(this),
    });
  }

  prepare() {
    let selectedTreeNode = this.getSelectedNode();
    if (!this.getSelectedNodeData(selectedTreeNode)) {
      return;
    }

    this.treeInfo = getTreeNodeHierarchyFromElement(this.pgBrowser, selectedTreeNode);
    this.prepareDialog();
    this.focusOnDialog(this);
  }

  callback(event) {
    if (this.wasHelpButtonPressed(event)) {
      event.cancel = true;
      this.pgBrowser.showHelp(
        event.button.element.name,
        event.button.element.getAttribute('url'),
        null,
        null,
      );
      return;
    }
  }
}
