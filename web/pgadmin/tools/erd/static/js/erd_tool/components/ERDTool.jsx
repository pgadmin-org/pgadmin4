/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import * as React from 'react';
import { CanvasWidget, Action, InputType } from '@projectstorm/react-canvas-core';
import PropTypes from 'prop-types';
import _ from 'lodash';
import {toPng} from 'html-to-image';

import ERDCore from '../ERDCore';
import ConnectionBar, { STATUS as CONNECT_STATUS } from './ConnectionBar';
import FloatingNote from './FloatingNote';
import {setPanelTitle} from '../../ERDModule';
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import {showERDSqlTool} from 'tools/sqleditor/static/js/show_query_tool';
import TableSchema from '../../../../../../browser/server_groups/servers/databases/schemas/tables/static/js/table.ui';
import { ModalContext } from '../../../../../../static/js/helpers/ModalProvider';
import ERDDialogs from '../dialogs';
import ConfirmSaveContent from '../../../../../../static/js/Dialogs/ConfirmSaveContent';
import Loader from '../../../../../../static/js/components/Loader';
import { MainToolBar } from './MainToolBar';
import { Box } from '@mui/material';
import EventBus from '../../../../../../static/js/helpers/EventBus';
import { ERD_EVENTS } from '../ERDConstants';
import getApiInstance, { callFetch, parseApiError } from '../../../../../../static/js/api_instance';
import { openSocket, socketApiGet } from '../../../../../../static/js/socket_instance';
import { LAYOUT_EVENTS } from '../../../../../../static/js/helpers/Layout';
import usePreferences from '../../../../../../preferences/static/js/store';
import pgAdmin from 'sources/pgadmin';
import { styled } from '@mui/material/styles';
import BeforeUnload from './BeforeUnload';
import { isMac } from '../../../../../../static/js/keyboard_shortcuts';

/* Custom react-diagram action for keyboard events */
export class KeyboardShortcutAction extends Action {
  constructor(shortcut_handlers=[]) {
    super({
      type: InputType.KEY_DOWN,
      fire: ({ event })=>{
        this.callHandler(event);
      },
    });
    this.shortcuts = {};
    this.preferencesStore = usePreferences.getState();

    for(let shortcut_val of shortcut_handlers){
      let [key, handler] = shortcut_val;
      if(key) {
        this.shortcuts[this.shortcutKey(key.alt, (isMac() && key.ctrl_is_meta) ? false : key.control, key.shift, isMac() && Boolean(key.ctrl_is_meta), key.key.key_code)] = handler;
      }
    }
  }

  shortcutKey(altKey, ctrlKey, shiftKey, metaKey, keyCode) {
    return `${altKey}:${ctrlKey}:${shiftKey}:${metaKey}:${keyCode}`;
  }

  callHandler(event) {
    let handler = this.shortcuts[this.shortcutKey(event.altKey, event.ctrlKey, event.shiftKey, event.metaKey, event.keyCode)];
    if(handler) {
      event.stopPropagation();
      event.preventDefault();
      handler();
    }
  }
}

const getCanvasGrid = (theme)=>{
  let erdCanvasBg = encodeURIComponent(theme.otherVars.erdCanvasBg);
  let erdGridColor = encodeURIComponent(theme.otherVars.erdGridColor);

  return `url("data:image/svg+xml, %3Csvg width='100%25' viewBox='0 0 45 45' style='background-color:${erdCanvasBg}' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='smallGrid' width='15' height='15' patternUnits='userSpaceOnUse'%3E%3Cpath d='M 15 0 L 0 0 0 15' fill='none' stroke='${erdGridColor}' stroke-width='0.5'/%3E%3C/pattern%3E%3Cpattern id='grid' width='45' height='45' patternUnits='userSpaceOnUse'%3E%3Crect width='100' height='100' fill='url(%23smallGrid)'/%3E%3Cpath d='M 100 0 L 0 0 0 100' fill='none' stroke='${erdGridColor}' stroke-width='1'/%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23grid)' /%3E%3C/svg%3E%0A")`;
};

const StyledBox = styled(Box)(({theme})=>({
  '& .ERDTool-diagramContainer': {
    position: 'relative',
    width: '100%',
    flexGrow: 1,
    minHeight: 0,
    '& .ERDTool-diagramCanvas': {
      width: '100%',
      height: '100%',
      color: theme.palette.text.primary,
      backgroundColor: theme.otherVars.erdCanvasBg,
      backgroundImage: getCanvasGrid(theme),
      cursor: 'unset',
      flexGrow: 1,
    },
  },
  '& .ERDTool-html2canvasReset': {
    backgroundImage: 'none !important',
    overflow: 'auto !important',
  }
}));

/* The main body container for the ERD */
export default class ERDTool extends React.Component {
  static contextType = ModalContext;
  constructor(props) {
    super(props);
    this.state = {
      conn_status: CONNECT_STATUS.DISCONNECTED,
      server_version: null,
      any_item_selected: false,
      single_node_selected: false,
      single_link_selected: false,
      coll_types: [],
      loading_msg: null,
      note_open: false,
      note_node: null,
      current_file: null,
      dirty: false,
      show_details: true,
      is_new_tab: false,
      is_close_tab_warning: true,
      preferences: {},
      table_dialog_open: true,
      oto_dialog_open: true,
      otm_dialog_open: true,
      database: null,
      fill_color: null,
      text_color: null,
    };
    this.diagram = new ERDCore();
    /* Flag for checking if user has opted for save before close */
    this.closeOnSave = React.createRef();
    this.containerRef = React.createRef();
    this.diagramContainerRef = React.createRef();
    this.canvasEle = props.isTest ? document.createElement('div') : null;
    this.noteRefEle = null;
    this.keyboardActionObj = null;
    this.erdDialogs = new ERDDialogs(this.context);
    this.apiObj = getApiInstance();
    this.preferencesStore = usePreferences.getState();

    this.eventBus = new EventBus();

    _.bindAll(this, ['onLoadDiagram', 'onSaveDiagram', 'onSQLClick',
      'onImageClick', 'onAddNewNode', 'onEditTable', 'onCloneNode', 'onDeleteNode', 'onNoteClick',
      'onNoteClose', 'onOneToOneClick', 'onOneToManyClick', 'onManyToManyClick', 'onAutoDistribute', 'onDetailsToggle',
      'onChangeColors', 'onDropNode', 'onNotationChange', 'closePanel'
    ]);

    this.diagram.zoomToFit = this.diagram.zoomToFit.bind(this.diagram);
    this.diagram.zoomIn = this.diagram.zoomIn.bind(this.diagram);
    this.diagram.zoomOut = this.diagram.zoomOut.bind(this.diagram);
    this.forceClose = this.closePanel;
  }

  registerModelEvents() {
    let diagramEvents = {
      'offsetUpdated': (event)=>{
        this.realignGrid({backgroundPosition: `${event.offsetX}px ${event.offsetY}px`});
        event.stopPropagation();
      },
      'zoomUpdated': (event)=>{
        let { gridSize } = this.diagram.getModel().getOptions();
        let bgSize = gridSize*event.zoom/100;
        this.realignGrid({backgroundSize: `${bgSize*3}px ${bgSize*3}px`});
      },
      'nodesSelectionChanged': ()=>{
        let singleNodeSelected = false;
        if(this.diagram.getSelectedNodes().length == 1) {
          let metadata = this.diagram.getSelectedNodes()[0].getMetadata();
          if(!metadata.is_promise) {
            singleNodeSelected = true;
          }
        }
        const anyItemSelected = this.diagram.getSelectedNodes().length > 0 || this.diagram.getSelectedLinks().length > 0;
        this.setState({
          single_node_selected: singleNodeSelected,
          any_item_selected: anyItemSelected,
        });
        this.eventBus.fireEvent(ERD_EVENTS.SINGLE_NODE_SELECTED, singleNodeSelected);
        this.eventBus.fireEvent(ERD_EVENTS.ANY_ITEM_SELECTED, anyItemSelected);
      },
      'linksSelectionChanged': ()=>{
        const anyItemSelected = this.diagram.getSelectedNodes().length > 0 || this.diagram.getSelectedLinks().length > 0;
        this.setState({
          single_link_selected: this.diagram.getSelectedLinks().length == 1,
          any_item_selected: this.diagram.getSelectedNodes().length > 0 || this.diagram.getSelectedLinks().length > 0,
        });
        this.eventBus.fireEvent(ERD_EVENTS.ANY_ITEM_SELECTED, anyItemSelected);
      },
      'linksUpdated': () => {
        this.setState({dirty: true});
        this.eventBus.fireEvent(ERD_EVENTS.DIRTY, true);
      },
      'nodesUpdated': ()=>{
        this.setState({dirty: true});
        this.eventBus.fireEvent(ERD_EVENTS.DIRTY, true);
      },
      'showNote': (event)=>{
        this.showNote(event.node);
      },
      'editTable': (event) => {
        this.addEditTable(event.node);
      },
    };
    Object.keys(diagramEvents).forEach(eventName => {
      this.diagram.registerModelEvent(eventName, diagramEvents[eventName]);
    });
  }

  registerEvents() {
    this.eventBus.registerListener(ERD_EVENTS.LOAD_DIAGRAM, this.onLoadDiagram);
    this.eventBus.registerListener(ERD_EVENTS.SAVE_DIAGRAM, this.onSaveDiagram);
    this.eventBus.registerListener(ERD_EVENTS.SHOW_SQL, this.onSQLClick);
    this.eventBus.registerListener(ERD_EVENTS.DOWNLOAD_IMAGE, this.onImageClick);
    this.eventBus.registerListener(ERD_EVENTS.ADD_NODE, this.onAddNewNode);
    this.eventBus.registerListener(ERD_EVENTS.EDIT_NODE, this.onEditTable);
    this.eventBus.registerListener(ERD_EVENTS.CLONE_NODE, this.onCloneNode);
    this.eventBus.registerListener(ERD_EVENTS.DELETE_NODE, this.onDeleteNode);
    this.eventBus.registerListener(ERD_EVENTS.SHOW_NOTE, this.onNoteClick);
    this.eventBus.registerListener(ERD_EVENTS.ONE_TO_ONE, this.onOneToOneClick);
    this.eventBus.registerListener(ERD_EVENTS.ONE_TO_MANY, this.onOneToManyClick);
    this.eventBus.registerListener(ERD_EVENTS.MANY_TO_MANY, this.onManyToManyClick);
    this.eventBus.registerListener(ERD_EVENTS.AUTO_DISTRIBUTE, this.onAutoDistribute);
    this.eventBus.registerListener(ERD_EVENTS.TOGGLE_DETAILS, this.onDetailsToggle);
    this.eventBus.registerListener(ERD_EVENTS.CHANGE_COLORS, this.onChangeColors);
    this.eventBus.registerListener(ERD_EVENTS.ZOOM_FIT, this.diagram.zoomToFit);
    this.eventBus.registerListener(ERD_EVENTS.ZOOM_IN, this.diagram.zoomIn);
    this.eventBus.registerListener(ERD_EVENTS.ZOOM_OUT, this.diagram.zoomOut);
  }

  registerKeyboardShortcuts() {
    /* First deregister to avoid double events */
    this.keyboardActionObj && this.diagram.deregisterKeyAction(this.keyboardActionObj);

    this.keyboardActionObj = new KeyboardShortcutAction([
      [this.state.preferences.open_project, ()=>{
        this.eventBus.fireEvent(ERD_EVENTS.LOAD_DIAGRAM);
      }],
      [this.state.preferences.save_project, ()=>{
        this.eventBus.fireEvent(ERD_EVENTS.SAVE_DIAGRAM);
      }],
      [this.state.preferences.save_project_as, ()=>{
        this.eventBus.fireEvent(ERD_EVENTS.SAVE_DIAGRAM, true);
      }],
      [this.state.preferences.generate_sql, ()=>{
        this.eventBus.fireEvent(ERD_EVENTS.TRIGGER_SHOW_SQL);
      }],
      [this.state.preferences.download_image, ()=>{
        this.eventBus.fireEvent(ERD_EVENTS.DOWNLOAD_IMAGE);
      }],
      [this.state.preferences.add_table, ()=>{
        this.eventBus.fireEvent(ERD_EVENTS.ADD_NODE);
      }],
      [this.state.preferences.edit_table, ()=>{
        this.eventBus.fireEvent(ERD_EVENTS.EDIT_NODE);
      }],
      [this.state.preferences.clone_table, ()=>{
        this.eventBus.fireEvent(ERD_EVENTS.CLONE_NODE);
      }],
      [this.state.preferences.drop_table, ()=>{
        this.eventBus.fireEvent(ERD_EVENTS.DELETE_NODE);
      }],
      [this.state.preferences.add_edit_note, ()=>{
        this.eventBus.fireEvent(ERD_EVENTS.SHOW_NOTE);
      }],
      [this.state.preferences.one_to_one, ()=>{
        this.eventBus.fireEvent(ERD_EVENTS.ONE_TO_ONE);
      }],
      [this.state.preferences.one_to_many, ()=>{
        this.eventBus.fireEvent(ERD_EVENTS.ONE_TO_MANY);
      }],
      [this.state.preferences.many_to_many, ()=>{
        this.eventBus.fireEvent(ERD_EVENTS.MANY_TO_MANY);
      }],
      [this.state.preferences.auto_align, ()=>{
        this.eventBus.fireEvent(ERD_EVENTS.AUTO_DISTRIBUTE);
      }],
      [this.state.preferences.show_details, ()=>{
        this.eventBus.fireEvent(ERD_EVENTS.TOGGLE_DETAILS);
      }],
      [this.state.preferences.zoom_to_fit, ()=>{
        this.eventBus.fireEvent(ERD_EVENTS.ZOOM_FIT);
      }],
      [this.state.preferences.zoom_in, ()=>{
        this.eventBus.fireEvent(ERD_EVENTS.ZOOM_IN);
      }],
      [this.state.preferences.zoom_out, ()=>{
        this.eventBus.fireEvent(ERD_EVENTS.ZOOM_OUT);
      }],
    ]);

    this.diagram.registerKeyAction(this.keyboardActionObj);
  }

  handleAxiosCatch(err) {
    this.context.alert(gettext('Error'), parseApiError(err));
  }

  async componentDidMount() {
    this.setLoading(gettext('Preparing...'));
    this.registerEvents();
    this.diagramContainerRef.current?.focus();
    const erdPref = this.preferencesStore.getPreferencesForModule('erd');
    this.setState({
      preferences: erdPref,
      is_new_tab: (this.preferencesStore.getPreferencesForModule('browser').new_browser_tab_open || '')
        .includes('erd_tool'),
      is_close_tab_warning: this.preferencesStore.getPreferencesForModule('browser').confirm_on_refresh_close,
      cardinality_notation: erdPref.cardinality_notation,
    }, ()=>{
      this.registerKeyboardShortcuts();
      this.setTitle(this.state.current_file);
    });
    this.registerModelEvents();
    this.realignGrid({
      backgroundSize: '45px 45px',
      backgroundPosition: '0px 0px',
    });

    this.props.panelDocker.eventBus.registerListener(LAYOUT_EVENTS.CLOSING, (id)=>{
      if(this.props.panelId == id) {
        this.confirmBeforeClose();
      }
    });

    window.addEventListener('unload', ()=>{
      /* Using fetch with keepalive as the browser may
      cancel the axios request on tab close. keepalive will
      make sure the request is completed */
      callFetch(
        url_for('erd.close', {
          trans_id: this.props.params.trans_id,
          sgid: this.props.params.sgid,
          sid: this.props.params.sid,
          did: this.props.params.did
        }), {
          keepalive: true,
          method: 'DELETE',
        }
      )
        .then(()=>{/* Success */})
        .catch((err)=>console.error(err));
    });

    let done = await this.initConnection();
    if(!done) return;

    done = await this.loadPrequisiteData();
    if(!done) return;

    if(this.props.params.gen) {
      await this.loadTablesData();
    }
  }

  componentDidUpdate() {
    if(this.state.dirty) {
      this.setTitle(this.state.current_file, true);
    }
  }

  confirmBeforeClose() {
    let bodyObj = this;
    if(this.state.dirty) {
      this.closeOnSave = false;
      this.context.showModal(gettext('Save changes?'), (closeModal)=>(
        <ConfirmSaveContent
          closeModal={closeModal}
          text={gettext('The diagram has changed. Do you want to save changes?')}
          onDontSave={()=>{
            this.forceClose();
          }}
          onSave={()=>{
            bodyObj.onSaveDiagram(false, true);
          }}
        />
      ));
      return false;
    } else {
      this.forceClose();
    }
  }

  closePanel() {
    this.props.panelDocker.close(this.props.panelId, true);
  }

  getDialog(dialogName) {
    let serverInfo = {
      type: this.props.params.server_type,
      version: this.state.server_version,
    };
    if(dialogName === 'table_dialog') {
      return (title, attributes, isNew, callback)=>{
        this.erdDialogs.showTableDialog({
          title, attributes, isNew, tableNodes: this.diagram.getModel().getNodesDict(),
          colTypes: this.diagram.getCache('colTypes'), schemas: this.diagram.getCache('schemas'),
          serverInfo, callback
        });
      };
    } else if(dialogName === 'onetomany_dialog' || dialogName === 'manytomany_dialog' || dialogName === 'onetoone_dialog') {
      return (title, attributes, callback)=>{
        this.erdDialogs.showRelationDialog(dialogName, {
          title, attributes, tableNodes: this.diagram.getModel().getNodesDict(),
          serverInfo, callback
        });
      };
    }
  }

  setLoading(message) {
    this.setState({loading_msg: message});
  }

  realignGrid({backgroundSize, backgroundPosition}) {
    if(backgroundSize) {
      this.canvasEle.style.backgroundSize = backgroundSize;
    }
    if(backgroundPosition) {
      this.canvasEle.style.backgroundPosition = backgroundPosition;
    }
  }

  addEditTable(node) {
    let dialog = this.getDialog('table_dialog');
    if(node) {
      let [schema, table] = node.getSchemaTableName();
      let oldData = node.getData();
      dialog(gettext('Table: %s (%s)', _.escape(table),_.escape(schema)), oldData, false, (newData)=>{
        if(this.diagram.anyDuplicateNodeName(newData, oldData)) {
          return gettext('Table name already exists');
        }
        // If a column that is part of a foreign key is removed, the foreign key constraint should also be removed.
        _.differenceWith(oldData.columns, newData.columns, function(existing, incoming) {
          return existing.attnum == incoming.attnum;
        }).forEach(colm=>{
          newData.foreign_key?.forEach((theFkRow, index)=>{
            let fkCols = theFkRow.columns[0];
            if (fkCols.local_column === colm.name) {
              newData.foreign_key.splice(index,1);
            }
          });
        });
        node.setData(newData);
        this.diagram.syncTableLinks(node, oldData);
        this.diagram.repaint();
      });
    } else {
      dialog(gettext('New table'), {}, true, (newData)=>{
        if(this.diagram.anyDuplicateNodeName(newData)) {
          return gettext('Table name already exists');
        }
        let newNode = this.diagram.addNode(newData, [50, 50], {
          fillColor: this.state.fill_color,
          textColor: this.state.text_color,
        });
        this.diagram.syncTableLinks(newNode);
        newNode.setSelected(true);
      });
    }
  }

  onDropNode(e) {
    let nodeDropData = JSON.parse(e.dataTransfer.getData('text'));
    if(nodeDropData.objUrl && nodeDropData.nodeType === 'table') {
      let matchUrl = `/${this.props.params.sgid}/${this.props.params.sid}/${this.props.params.did}/`;
      if(nodeDropData.objUrl.indexOf(matchUrl) == -1) {
        pgAdmin.Browser.notifier.error(gettext('Cannot drop table from outside of the current database.'));
      } else {
        let dataPromise = new Promise((resolve, reject)=>{
          this.apiObj.get(nodeDropData.objUrl)
            .then((res)=>{
              resolve(this.diagram.cloneTableData(TableSchema.getErdSupportedData(res.data)));
            })
            .catch((err)=>{
              console.error(err);
              reject(err instanceof Error ? err : Error(gettext('Something went wrong')));
            });
        });
        const {x, y} = this.diagram.getEngine().getRelativeMousePoint(e);
        this.diagram.addNode(dataPromise, [x, y], {
          fillColor: this.state.fill_color,
          textColor: this.state.text_color,
        }).setSelected(true);
      }
    }
  }

  onEditTable() {
    const selected = this.diagram.getSelectedNodes();
    if(selected.length == 1) {
      this.addEditTable(selected[0]);
    }
  }

  onAddNewNode() {
    this.addEditTable();
  }

  onCloneNode() {
    const selected = this.diagram.getSelectedNodes();
    if(selected.length == 1) {
      let newData = this.diagram.cloneTableData(selected[0].getData(), this.diagram.getNextTableName());
      if(newData) {
        let {x, y} = selected[0].getPosition();
        let newNode = this.diagram.addNode(newData, [x+20, y+20]);
        newNode.setMetadata(_.pick(selected[0].getMetadata(), ['fillColor', 'textColor']));
        newNode.setSelected(true);
      }
    }
  }

  onDeleteNode() {
    pgAdmin.Browser.notifier.confirmDelete(
      gettext('Delete ?'),
      gettext('You have selected %s tables and %s links.', this.diagram.getSelectedNodes().length, this.diagram.getSelectedLinks().length)
        + '<br />' + gettext('Are you sure you want to delete ?'),
      () => {
        this.diagram.getSelectedNodes().forEach((node)=>{
          this.diagram.removeNode(node);
        });
        this.diagram.getSelectedLinks().forEach((link)=>{
          this.diagram.removeOneToManyLink(link);
        });
        if (this.diagram.getNodesData().length === 0){
          this.setState({dirty: false});
          this.eventBus.fireEvent(ERD_EVENTS.DIRTY, false);
        }
        this.diagram.repaint();
      },
      () => {/*This is intentional (SonarQube)*/},
      gettext('Delete'),
      gettext('Cancel'),
    );
  }

  async onAutoDistribute() {
    this.setLoading('Auto distributing...');
    await this.diagram.dagreDistributeNodes();
    this.setLoading();
  }

  onChangeColors(fillColor, textColor) {
    this.setState({
      fill_color: fillColor,
      text_color: textColor,
    });
    this.diagram.getSelectedNodes().forEach((node)=>{
      node.fireEvent({fillColor: fillColor, textColor: textColor}, 'changeColors');
    });
  }

  onDetailsToggle() {
    this.setState((prevState)=>({
      show_details: !prevState.show_details,
    }), ()=>{
      this.diagram.getModel().getNodes().forEach((node)=>{
        node.fireEvent({show_details: this.state.show_details}, 'toggleDetails');
      });
    });
  }

  onNotationChange(e) {
    this.setState({cardinality_notation: e.value});
  }

  onLoadDiagram() {
    const params = {
      'supported_types': ['*','pgerd'], // file types allowed
      'dialog_type': 'select_file', // open select file dialog
    };
    this.props.pgAdmin.Tools.FileManager.show(params, this.openFile.bind(this), null, this.context);
  }

  openFile(fileName) {
    this.setLoading(gettext('Loading project...'));
    this.apiObj.post(url_for('sqleditor.load_file'), {
      'file_name': decodeURI(fileName),
    }).then((res)=>{
      this.setState({
        current_file: fileName,
        dirty: false,
      });
      this.eventBus.fireEvent(ERD_EVENTS.DIRTY, false);
      this.setTitle(fileName);
      this.diagram.deserialize(res.data);
      this.diagram.clearSelection();
      this.registerModelEvents();
    }).catch((err)=>{
      this.handleAxiosCatch(err);
    }).then(()=>{
      this.setLoading(null);
    });
  }

  onSaveDiagram(isSaveAs=false, closeOnSave=false) {
    this.closeOnSave = closeOnSave;
    if(this.state.current_file && !isSaveAs) {
      this.saveFile(this.state.current_file);
    } else if (this.diagram.getNodesData().length > 0){ {
      let params = {
        'supported_types': ['*','pgerd'],
        'dialog_type': 'create_file',
        'dialog_title': 'Save File',
        'btn_primary': 'Save',
      };
      this.props.pgAdmin.Tools.FileManager.show(params, this.saveFile.bind(this), null, this.context);
    }
    }
  }

  saveFile(fileName) {
    this.setLoading(gettext('Saving...'));
    this.apiObj.post(url_for('sqleditor.save_file'), {
      'file_name': decodeURI(fileName),
      'file_content': JSON.stringify(this.diagram.serialize(this.props.pgAdmin.Browser.utils.app_version_int)),
    }).then(()=>{
      this.props.pgAdmin.Browser.notifier.success(gettext('Project saved successfully.'));
      this.setState({
        current_file: fileName,
        dirty: false,
      });
      this.eventBus.fireEvent(ERD_EVENTS.DIRTY, false);
      this.setTitle(fileName);
      this.setLoading(null);
      if(this.closeOnSave) {
        this.forceClose();
      }
    }).catch((err)=>{
      this.setLoading(null);
      this.handleAxiosCatch(err);
    });
  }

  getCurrentProjectName(path) {
    let currPath = path || this.state.current_file || 'Untitled';
    return currPath.split('\\').pop().split('/').pop();
  }

  setTitle(title, dirty=false) {
    if(title === null || title === '') {
      title = 'Untitled';
    }
    title = this.getCurrentProjectName(title) + (dirty ? '*': '');
    if (this.state.is_new_tab) {
      window.document.title = title;
    } else {
      setPanelTitle(this.props.panelDocker, this.props.panelId, title);
    }
  }

  onSQLClick(sqlWithDrop=false) {
    let scriptHeader = gettext('-- This script was generated by the ERD tool in pgAdmin 4.\n');
    scriptHeader += gettext('-- Please log an issue at https://github.com/pgadmin-org/pgadmin4/issues/new/choose if you find any bugs, including reproduction steps.\n');

    let url = url_for('erd.sql', {
      trans_id: this.props.params.trans_id,
      sgid: this.props.params.sgid,
      sid: this.props.params.sid,
      did: this.props.params.did,
    });

    if(sqlWithDrop) {
      url += '?with_drop=true';
    }

    this.setLoading(gettext('Preparing the SQL...'));
    this.apiObj.post(url, this.diagram.serializeData())
      .then((resp)=>{
        let sqlScript = resp.data.data;
        sqlScript = scriptHeader + 'BEGIN;\n' + sqlScript + '\nEND;';

        let parentData = {
          sgid: this.props.params.sgid,
          sid: this.props.params.sid,
          did: this.props.params.did,
          stype: this.props.params.server_type,
          database: this.state.database,
        };

        let sqlId = `erd${this.props.params.trans_id}`;
        localStorage.setItem(sqlId, sqlScript);
        showERDSqlTool(parentData, sqlId, this.props.params.title, this.props.pgWindow.pgAdmin.Tools.SQLEditor);
      })
      .catch((error)=>{
        this.handleAxiosCatch(error);
      })
      .then(()=>{
        this.setLoading(null);
      });
  }

  onImageClick() {
    this.setLoading(gettext('Preparing the image...'));

    /* Move the diagram temporarily to align it to top-left of the canvas so that when
     * taking the snapshot all the nodes are covered. Once the image is taken, repaint
     * the canvas back to original state.
     * Code referred from - zoomToFitNodes function.
     */
    this.diagramContainerRef.current?.classList.add('ERDTool-html2canvasReset');
    const margin = 10;
    let nodesRect = this.diagram.getEngine().getBoundingNodesRect(this.diagram.getModel().getNodes());
    let linksRect = this.diagram.getBoundingLinksRect();

    // Check what is to the most top left - links or nodes?
    let topLeftXY = {
      x: nodesRect.getTopLeft().x,
      y: nodesRect.getTopLeft().y
    };
    if(topLeftXY.x > linksRect.TL.x) {
      topLeftXY.x = linksRect.TL.x;
    }
    if(topLeftXY.y > linksRect.TL.y) {
      topLeftXY.y = linksRect.TL.y;
    }
    topLeftXY.x -= margin;
    topLeftXY.y -= margin;

    let canvasRect = this.canvasEle.getBoundingClientRect();
    let canvasTopLeftOnScreen = {
      x: canvasRect.left,
      y: canvasRect.top
    };
    let nodeLayerTopLeftPoint = {
      x: canvasTopLeftOnScreen.x + this.diagram.getModel().getOffsetX(),
      y: canvasTopLeftOnScreen.y + this.diagram.getModel().getOffsetY()
    };
    let nodesRectTopLeftPoint = {
      x: nodeLayerTopLeftPoint.x + topLeftXY.x,
      y: nodeLayerTopLeftPoint.y + topLeftXY.y
    };

    let prevTransform = this.canvasEle.querySelector('div').style.transform;
    this.canvasEle.childNodes.forEach((ele)=>{
      ele.style.transform = `translate(${nodeLayerTopLeftPoint.x - nodesRectTopLeftPoint.x}px, ${nodeLayerTopLeftPoint.y - nodesRectTopLeftPoint.y}px) scale(1.0)`;
    });

    // Capture the links beyond the nodes as well.
    const linkOutsideWidth = linksRect.BR.x - nodesRect.getBottomRight().x;
    const linkOutsideHeight = linksRect.BR.y - nodesRect.getBottomRight().y;
    this.canvasEle.style.width = this.canvasEle.scrollWidth + (linkOutsideWidth > 0 ? linkOutsideWidth : 0) + margin + 'px';
    this.canvasEle.style.height = this.canvasEle.scrollHeight + (linkOutsideHeight > 0 ? linkOutsideHeight : 0) + margin + 'px';

    setTimeout(()=>{
      let width = this.canvasEle.scrollWidth + 10;
      let height = this.canvasEle.scrollHeight + 10;
      let isCut = false;
      /* Canvas limitation - https://html2canvas.hertzen.com/faq */
      if(width >= 32767){
        width = 32766;
        isCut = true;
      }
      if(height >= 32767){
        height = 32766;
        isCut = true;
      }
      toPng(this.canvasEle, {width, height})
        .then((dataUrl)=>{
          let link = document.createElement('a');
          link.setAttribute('href', dataUrl);
          link.setAttribute('download', this.getCurrentProjectName() + '.png');
          link.click();
          link.remove();
        }).catch((err)=>{
          console.error(err);
          let msg = gettext('Unknown error. Check console logs');
          if(err.name) {
            msg = `${err.name}: ${err.message}`;
          }
          pgAdmin.Browser.notifier.alert(gettext('Error'), msg);
        }).then(()=>{
          /* Revert back to the original CSS styles */
          this.diagramContainerRef.current.classList.remove('ERDTool-html2canvasReset');
          this.canvasEle.style.width = '';
          this.canvasEle.style.height = '';
          this.canvasEle.childNodes.forEach((ele)=>{
            ele.style.transform = prevTransform;
          });
          this.setLoading(null);
          if(isCut) {
            pgAdmin.Browser.notifier.alert(gettext('Maximum image size limit'),
              gettext('The downloaded image has exceeded the maximum size of 32767 x 32767 pixels, and has been cropped to that size.'));
          }
        });
    }, 1000);
  }

  onOneToOneClick() {
    let dialog = this.getDialog('onetoone_dialog');
    let initData = {local_table_uid: this.diagram.getSelectedNodes()[0].getID()};
    dialog(gettext('One to one relation'), initData, (newData)=>{
      this.diagram.addOneToManyLink(newData);
    });
  }

  onOneToManyClick() {
    let dialog = this.getDialog('onetomany_dialog');
    let initData = {local_table_uid: this.diagram.getSelectedNodes()[0].getID()};
    dialog(gettext('One to many relation'), initData, (newData)=>{
      this.diagram.addOneToManyLink(newData);
    });
  }

  onManyToManyClick() {
    let dialog = this.getDialog('manytomany_dialog');
    let initData = {left_table_uid: this.diagram.getSelectedNodes()[0].getID()};
    dialog(gettext('Many to many relation'), initData, (newData)=>{
      this.diagram.addManyToManyLink(newData);
    });
  }

  showNote(noteNode) {
    if(noteNode) {
      this.noteRefEle = this.diagram.getEngine().getNodeElement(noteNode);
      this.setState({
        note_node: noteNode,
        note_open: true,
      });
    }
  }

  onNoteClick() {
    let noteNode = this.diagram.getSelectedNodes()[0];
    this.showNote(noteNode);
  }

  onNoteClose(updated) {
    this.setState({note_open: false});
    updated && this.diagram.fireEvent({}, 'nodesUpdated', true);
  }

  async initConnection() {
    this.setLoading(gettext('Initializing connection...'));
    this.setState({conn_status: CONNECT_STATUS.CONNECTING});

    let initUrl = url_for('erd.initialize', {
      trans_id: this.props.params.trans_id,
      sgid: this.props.params.sgid,
      sid: this.props.params.sid,
      did: this.props.params.did,
    });

    try {
      let response = await this.apiObj.post(initUrl);
      this.setState({
        conn_status: CONNECT_STATUS.CONNECTED,
        server_version: response.data.data.serverVersion,
        database: response.data.data.database,
      });
      return true;
    } catch (error) {
      this.setState({conn_status: CONNECT_STATUS.FAILED});
      this.handleAxiosCatch(error);
      return false;
    } finally {
      this.setLoading(null);
    }
  }

  /* Get all prequisite in one conn since
   * we have only one connection
   */
  async loadPrequisiteData() {
    this.setLoading(gettext('Fetching required data...'));
    let url = url_for('erd.prequisite', {
      trans_id: this.props.params.trans_id,
      sgid: this.props.params.sgid,
      sid: this.props.params.sid,
      did: this.props.params.did,
    });

    try {
      let response = await this.apiObj.get(url);
      let data = response.data.data;
      this.diagram.setCache('colTypes', data['col_types']);
      this.diagram.setCache('schemas', data['schemas']);
      return true;
    } catch (error) {
      this.handleAxiosCatch(error);
      return false;
    } finally {
      this.setLoading(null);
    }
  }

  async loadTablesData() {
    this.setLoading(gettext('Fetching schema data...'));
    let resData = [];
    let socket;
    try {
      socket = await openSocket('/erd');
      resData = await socketApiGet(socket, 'tables', {
        trans_id: parseInt(this.props.params.trans_id),
        sgid: parseInt(this.props.params.sgid),
        sid: parseInt(this.props.params.sid),
        did: parseInt(this.props.params.did),
        scid: this.props.params.scid ? parseInt(this.props.params.scid) : undefined,
        tid: this.props.params.tid ? parseInt(this.props.params.tid) : undefined,
      });
    } catch (error) {
      this.handleAxiosCatch(error);
    }
    socket?.disconnect();
    try {
      this.diagram.deserializeData(resData);
    } catch (error) {
      this.handleAxiosCatch(error);
    }
    setTimeout(()=>{
      this.onAutoDistribute();
    }, 250);
  }

  render() {
    this.erdDialogs.modal = this.context;

    return (
      <StyledBox ref={this.containerRef} height="100%" display="flex" flexDirection="column">
        <BeforeUnload
          onInit={({forceClose})=>{this.forceClose = forceClose;}}
          enabled={this.state.is_close_tab_warning}
          isNewTab={this.state.is_new_tab}
          beforeClose={this.confirmBeforeClose}
          closePanel={this.closePanel}
        />
        <ConnectionBar status={this.state.conn_status} bgcolor={this.props.params.bgcolor}
          fgcolor={this.props.params.fgcolor} title={_.unescape(this.props.params.title)}/>
        <MainToolBar preferences={this.state.preferences} eventBus={this.eventBus}
          fillColor={this.state.fill_color} textColor={this.state.text_color}
          notation={this.state.cardinality_notation} onNotationChange={this.onNotationChange}
        />
        <FloatingNote open={this.state.note_open} onClose={this.onNoteClose}
          anchorEl={this.noteRefEle} noteNode={this.state.note_node} appendTo={this.diagramContainerRef.current} rows={8}/>
        <div className='ERDTool-diagramContainer' data-test="diagram-container" ref={this.diagramContainerRef} onDrop={this.onDropNode} onDragOver={e => {e.preventDefault();}} tabIndex={0}>
          <Loader message={this.state.loading_msg} autoEllipsis={true}/>
          <ERDCanvasSettings.Provider value={{
            cardinality_notation: this.state.cardinality_notation
          }}>
            {!this.props.isTest && <CanvasWidget className='ERDTool-diagramCanvas' ref={(ele)=>{this.canvasEle = ele?.ref?.current;}} engine={this.diagram.getEngine()} />}
          </ERDCanvasSettings.Provider>
        </div>
      </StyledBox>
    );
  }
}

ERDTool.propTypes = {
  params:PropTypes.shape({
    trans_id: PropTypes.number.isRequired,
    sgid: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    sid: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    did: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    scid: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    tid: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    server_type: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    bgcolor: PropTypes.string,
    fgcolor: PropTypes.string,
    gen: PropTypes.bool.isRequired,
  }),
  pgWindow: PropTypes.object.isRequired,
  pgAdmin: PropTypes.object.isRequired,
  panelId: PropTypes.string,
  panelDocker: PropTypes.object,
  isTest: PropTypes.bool,
};

export const ERDCanvasSettings = React.createContext({});
