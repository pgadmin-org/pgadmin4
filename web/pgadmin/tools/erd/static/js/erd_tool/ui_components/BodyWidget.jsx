/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import * as React from 'react';
import { CanvasWidget } from '@projectstorm/react-canvas-core';
import axios from 'axios';
import { Action, InputType } from '@projectstorm/react-canvas-core';
import PropTypes from 'prop-types';
import _ from 'lodash';
import html2canvas from 'html2canvas';

import ERDCore from '../ERDCore';
import ToolBar, {IconButton, DetailsToggleButton, ButtonGroup} from './ToolBar';
import ConnectionBar, { STATUS as CONNECT_STATUS } from './ConnectionBar';
import Loader from './Loader';
import FloatingNote from './FloatingNote';
import {setPanelTitle} from '../../erd_module';
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import {showERDSqlTool} from 'tools/datagrid/static/js/show_query_tool';
import 'wcdocker';

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

    for(let i=0; i<shortcut_handlers.length; i++){
      let [key, handler] = shortcut_handlers[i];
      if(key) {
        this.shortcuts[this.shortcutKey(key.alt, key.control, key.shift, false, key.key.key_code)] = handler;
      }
    }
  }

  shortcutKey(altKey, ctrlKey, shiftKey, metaKey, keyCode) {
    return `${altKey}:${ctrlKey}:${shiftKey}:${metaKey}:${keyCode}`;
  }

  callHandler(event) {
    let handler = this.shortcuts[this.shortcutKey(event.altKey, event.ctrlKey, event.shiftKey, event.metaKey, event.keyCode)];
    if(handler) {
      handler();
    }
  }
}

/* The main body container for the ERD */
export default class BodyWidget extends React.Component {
  constructor() {
    super();
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
      preferences: {},
    };
    this.diagram = new ERDCore();
    /* Flag for checking if user has opted for save before close */
    this.closeOnSave = React.createRef();
    this.fileInputRef = React.createRef();
    this.diagramContainerRef = React.createRef();
    this.canvasEle = null;
    this.noteRefEle = null;
    this.noteNode = null;
    this.keyboardActionObj = null;

    _.bindAll(this, ['onLoadDiagram', 'onSaveDiagram', 'onSaveAsDiagram', 'onSQLClick',
      'onImageClick', 'onAddNewNode', 'onEditNode', 'onCloneNode', 'onDeleteNode', 'onNoteClick',
      'onNoteClose', 'onOneToManyClick', 'onManyToManyClick', 'onAutoDistribute', 'onDetailsToggle',
      'onDetailsToggle', 'onHelpClick'
    ]);

    this.diagram.zoomToFit = this.diagram.zoomToFit.bind(this.diagram);
    this.diagram.zoomIn = this.diagram.zoomIn.bind(this.diagram);
    this.diagram.zoomOut = this.diagram.zoomOut.bind(this.diagram);
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
        this.setState({
          single_node_selected: this.diagram.getSelectedNodes().length == 1,
          any_item_selected: this.diagram.getSelectedNodes().length > 0 || this.diagram.getSelectedLinks().length > 0,
        });
      },
      'linksSelectionChanged': ()=>{
        this.setState({
          single_link_selected: this.diagram.getSelectedLinks().length == 1,
          any_item_selected: this.diagram.getSelectedNodes().length > 0 || this.diagram.getSelectedLinks().length > 0,
        });
      },
      'linksUpdated': () => {
        this.setState({dirty: true});
      },
      'nodesUpdated': ()=>{
        this.setState({dirty: true});
      },
      'showNote': (event)=>{
        this.showNote(event.node);
      },
      'editNode': (event) => {
        this.addEditNode(event.node);
      },
    };
    Object.keys(diagramEvents).forEach(eventName => {
      this.diagram.registerModelEvent(eventName, diagramEvents[eventName]);
    });
  }

  registerKeyboardShortcuts() {
    /* First deregister to avoid double events */
    this.keyboardActionObj && this.diagram.deregisterKeyAction(this.keyboardActionObj);

    this.keyboardActionObj = new KeyboardShortcutAction([
      [this.state.preferences.open_project, this.onLoadDiagram],
      [this.state.preferences.save_project, this.onSaveDiagram],
      [this.state.preferences.save_project_as, this.onSaveAsDiagram],
      [this.state.preferences.generate_sql, this.onSQLClick],
      [this.state.preferences.download_image, this.onImageClick],
      [this.state.preferences.add_table, this.onAddNewNode],
      [this.state.preferences.edit_table, this.onEditNode],
      [this.state.preferences.clone_table, this.onCloneNode],
      [this.state.preferences.drop_table, this.onDeleteNode],
      [this.state.preferences.add_edit_note, this.onNoteClick],
      [this.state.preferences.one_to_many, this.onOneToManyClick],
      [this.state.preferences.many_to_many, this.onManyToManyClick],
      [this.state.preferences.auto_align, this.onAutoDistribute],
      [this.state.preferences.show_details, this.onDetailsToggle],
      [this.state.preferences.zoom_to_fit, this.diagram.zoomToFit],
      [this.state.preferences.zoom_in, this.diagram.zoomIn],
      [this.state.preferences.zoom_out, this.diagram.zoomOut],
    ]);

    this.diagram.registerKeyAction(this.keyboardActionObj);
  }

  handleAxiosCatch(err) {
    let alert = this.props.alertify.alert().set('title', gettext('Error'));
    if (err.response) {
      // client received an error response (5xx, 4xx)
      alert.set('message', `${err.response.statusText} - ${err.response.data.errormsg}`).show();
      console.error('response error', err.response);
    } else if (err.request) {
      // client never received a response, or request never left
      alert.set('message', gettext('Client error') + ':' + err).show();
      console.error('client eror', err);
    } else {
      alert.set('message', err.message).show();
      console.error('other error', err);
    }
  }

  async componentDidMount() {
    this.setLoading(gettext('Preparing...'));

    this.setState({
      preferences: this.props.pgWindow.pgAdmin.Browser.get_preferences_for_module('erd'),
      is_new_tab: (this.props.pgWindow.pgAdmin.Browser.get_preferences_for_module('browser').new_browser_tab_open || '')
        .includes('erd_tool'),
    }, ()=>{
      this.registerKeyboardShortcuts();
      this.setTitle(this.state.current_file);
    });
    this.registerModelEvents();
    this.realignGrid({
      backgroundSize: '45px 45px',
      backgroundPosition: '0px 0px',
    });

    this.props.pgAdmin.Browser.Events.on('pgadmin-storage:finish_btn:select_file', this.openFile, this);
    this.props.pgAdmin.Browser.Events.on('pgadmin-storage:finish_btn:create_file', this.saveFile, this);
    this.props.pgAdmin.Browser.onPreferencesChange('erd', () => {
      this.setState({
        preferences: this.props.pgWindow.pgAdmin.Browser.get_preferences_for_module('erd'),
      }, ()=>this.registerKeyboardShortcuts());
    });

    this.props.panel?.on(window.wcDocker?.EVENT.CLOSING, () => {
      if(this.state.dirty) {
        this.closeOnSave = false;
        this.confirmBeforeClose();
        return false;
      }
      return true;
    });

    let done = await this.initConnection();
    if(!done) return;

    done = await this.loadPrequisiteData();
    if(!done) return;

    if(this.props.params.gen) {
      await this.loadTablesData();
    }

    window.addEventListener('beforeunload', this.onBeforeUnload.bind(this));
  }

  componentWillUnmount() {
    window.removeEventListener('beforeunload', this.onBeforeUnload.bind(this));
  }

  componentDidUpdate() {
    if(this.state.dirty) {
      this.setTitle(this.state.current_file, true);
    }
  }

  confirmBeforeClose() {
    let bodyObj = this;
    this.props.alertify.confirmSave || this.props.alertify.dialog('confirmSave', function() {
      return {
        main: function(title, message) {
          this.setHeader(title);
          this.setContent(message);
        },
        setup: function() {
          return {
            buttons: [{
              text: gettext('Cancel'),
              key: 27, // ESC
              invokeOnClose: true,
              className: 'btn btn-secondary fa fa-lg fa-times pg-alertify-button',
            }, {
              text: gettext('Don\'t save'),
              className: 'btn btn-secondary fa fa-lg fa-trash-alt pg-alertify-button',
            }, {
              text: gettext('Save'),
              className: 'btn btn-primary fa fa-lg fa-save pg-alertify-button',
            }],
            focus: {
              element: 0,
              select: false,
            },
            options: {
              maximizable: false,
              resizable: false,
            },
          };
        },
        callback: function(closeEvent) {
          switch (closeEvent.index) {
          case 0: // Cancel
            //Do nothing.
            break;
          case 1: // Don't Save
            bodyObj.closePanel();
            break;
          case 2: //Save
            bodyObj.onSaveDiagram(false, true);
            break;
          }
        },
      };
    });
    this.props.alertify.confirmSave(gettext('Save changes?'), gettext('The diagram has changed. Do you want to save changes?'));
    return false;
  }

  closePanel() {
    window.onbeforeunload = null;
    this.props.panel.off(window.wcDocker.EVENT.CLOSING);
    this.props.pgWindow.pgAdmin.Browser.docker.removePanel(this.props.panel);
  }

  getDialog(dialogName) {
    if(dialogName === 'entity_dialog') {
      let allTables = this.diagram.getModel().getNodes().map((node)=>{
        return node.getSchemaTableName();
      });
      return (title, attributes, isNew, callback)=>{
        this.props.getDialog(dialogName).show(
          title, attributes, isNew, allTables, this.diagram.getCache('colTypes'), this.diagram.getCache('schemas'), this.state.server_version, callback
        );
      };
    } else if(dialogName === 'onetomany_dialog' || dialogName === 'manytomany_dialog') {
      return (title, attributes, callback)=>{
        this.props.getDialog(dialogName).show(
          title, attributes, this.diagram.getModel().getNodesDict(), this.state.server_version, callback
        );
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

  addEditNode(node) {
    let dialog = this.getDialog('entity_dialog');
    if(node) {
      let [schema, table] = node.getSchemaTableName();
      dialog(_.escape(`Table: ${table} (${schema})`), node.getData(), false, (newData)=>{
        node.setData(newData);
        this.diagram.repaint();
      });
    } else {
      dialog('New table', {name: this.diagram.getNextTableName()}, true, (newData)=>{
        let newNode = this.diagram.addNode(newData);
        newNode.setSelected(true);
      });
    }
  }

  onBeforeUnload(e) {
    if(this.state.dirty) {
      e.preventDefault();
      e.returnValue = 'prevent';
    } else {
      delete e['returnValue'];
    }
  }

  onEditNode() {
    const selected = this.diagram.getSelectedNodes();
    if(selected.length == 1) {
      this.addEditNode(selected[0]);
    }
  }

  onAddNewNode() {
    this.addEditNode();
  }

  onCloneNode() {
    const selected = this.diagram.getSelectedNodes();
    if(selected.length == 1) {
      let newData = selected[0].cloneData(this.diagram.getNextTableName());
      let {x, y} = selected[0].getPosition();
      let newNode = this.diagram.addNode(newData, [x+20, y+20]);
      newNode.setSelected(true);
    }
  }

  onDeleteNode() {
    this.props.alertify.confirm(
      gettext('Delete ?'),
      gettext('You have selected %s tables and %s links.', this.diagram.getSelectedNodes().length, this.diagram.getSelectedLinks().length)
        + '<br />' + gettext('Are you sure you want to delete ?'),
      () => {
        this.diagram.getSelectedNodes().forEach((node)=>{
          node.setSelected(false);
          node.remove();
        });
        this.diagram.getSelectedLinks().forEach((link)=>{
          link.getTargetPort().remove();
          link.getSourcePort().remove();
          link.setSelected(false);
          link.remove();
        });
        this.diagram.repaint();
      },
      () => {}
    );
  }

  onAutoDistribute() {
    this.diagram.dagreDistributeNodes();
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

  onHelpClick() {
    let url = url_for('help.static', {'filename': 'erd_tool.html'});
    if (this.props.pgWindow) {
      this.props.pgWindow.open(url, 'pgadmin_help');
    }
    else {
      window.open(url, 'pgadmin_help');
    }
  }

  onLoadDiagram() {
    var params = {
      'supported_types': ['pgerd'], // file types allowed
      'dialog_type': 'select_file', // open select file dialog
    };
    this.props.pgAdmin.FileManager.init();
    this.props.pgAdmin.FileManager.show_dialog(params);
  }

  openFile(fileName) {
    this.setLoading(gettext('Loading project...'));
    axios.post(url_for('sqleditor.load_file'), {
      'file_name': decodeURI(fileName),
    }).then((res)=>{
      this.setState({
        current_file: fileName,
        dirty: false,
      });
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
    } else {
      var params = {
        'supported_types': ['pgerd'],
        'dialog_type': 'create_file',
        'dialog_title': 'Save File',
        'btn_primary': 'Save',
      };
      this.props.pgAdmin.FileManager.init();
      this.props.pgAdmin.FileManager.show_dialog(params);
    }
  }

  onSaveAsDiagram() {
    this.onSaveDiagram(true);
  }

  saveFile(fileName) {
    this.setLoading(gettext('Saving...'));
    axios.post(url_for('sqleditor.save_file'), {
      'file_name': decodeURI(fileName),
      'file_content': JSON.stringify(this.diagram.serialize(this.props.pgAdmin.Browser.utils.app_version_int)),
    }).then(()=>{
      this.props.alertify.success(gettext('Project saved successfully.'));
      this.setState({
        current_file: fileName,
        dirty: false,
      });
      this.setTitle(fileName);
      this.setLoading(null);
      if(this.closeOnSave) {
        this.closePanel.call(this);
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
      setPanelTitle(this.props.panel, title);
    }
  }

  onSQLClick() {
    let scriptHeader = gettext('-- This script was generated by a beta version of the ERD tool in pgAdmin 4.\n');
    scriptHeader += gettext('-- Please log an issue at https://redmine.postgresql.org/projects/pgadmin4/issues/new if you find any bugs, including reproduction steps.\n');

    let url = url_for('erd.sql', {
      trans_id: this.props.params.trans_id,
      sgid: this.props.params.sgid,
      sid: this.props.params.sid,
      did: this.props.params.did,
    });

    this.setLoading(gettext('Preparing the SQL...'));
    axios.post(url, this.diagram.serializeData())
      .then((resp)=>{
        let sqlScript = resp.data.data;
        sqlScript = scriptHeader + 'BEGIN;\n' + sqlScript + '\nEND;';

        let parentData = {
          sgid: this.props.params.sgid,
          sid: this.props.params.sid,
          did: this.props.params.did,
          stype: this.props.params.server_type,
        };

        let sqlId = `erd${this.props.params.trans_id}`;
        localStorage.setItem(sqlId, sqlScript);
        showERDSqlTool(parentData, sqlId, this.props.params.title, this.props.pgWindow.pgAdmin.DataGrid, this.props.alertify);
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
    let nodesRect = this.diagram.getEngine().getBoundingNodesRect(this.diagram.getModel().getNodes(), 10);
    let canvasRect = this.canvasEle.getBoundingClientRect();
    let canvasTopLeftPoint = {
      x: canvasRect.left,
      y: canvasRect.top
    };
    let nodeLayerTopLeftPoint = {
      x: canvasTopLeftPoint.x + this.diagram.getModel().getOffsetX(),
      y: canvasTopLeftPoint.y + this.diagram.getModel().getOffsetY()
    };
    let nodesRectTopLeftPoint = {
      x: nodeLayerTopLeftPoint.x + nodesRect.getTopLeft().x,
      y: nodeLayerTopLeftPoint.y + nodesRect.getTopLeft().y
    };
    let prevTransform = this.canvasEle.querySelector('div').style.transform;
    this.canvasEle.childNodes.forEach((ele)=>{
      ele.style.transform = `translate(${nodeLayerTopLeftPoint.x - nodesRectTopLeftPoint.x}px, ${nodeLayerTopLeftPoint.y - nodesRectTopLeftPoint.y}px) scale(1.0)`;
    });

    /* Change the styles for suiting html2canvas */
    this.canvasEle.classList.add('html2canvas-reset');
    this.canvasEle.style.width = this.canvasEle.scrollWidth + 'px';
    this.canvasEle.style.height = this.canvasEle.scrollHeight + 'px';

    /* html2canvas ignores CSS styles, set the CSS styles to inline */
    const setSvgInlineStyles = (targetElem) => {
      const transformProperties = [
        'fill',
        'color',
        'font-size',
        'stroke',
        'font'
      ];
      let svgElems = Array.from(targetElem.getElementsByTagName('svg'));
      for (let svgEle of svgElems) {
        svgEle.setAttribute('width', svgEle.clientWidth);
        svgEle.setAttribute('height', svgEle.clientHeight);
        /* Wrap the SVG in a div tag so that transforms are consistent with html */
        let wrap = document.createElement('div');
        wrap.setAttribute('style', svgEle.getAttribute('style'));
        svgEle.setAttribute('style', null);
        svgEle.parentNode.appendChild(wrap);
        wrap.appendChild(svgEle);
        recurseElementChildren(svgEle);
      }
      function recurseElementChildren(node) {
        if (!node.style)
          return;

        let styles = getComputedStyle(node);
        for (let transformProperty of transformProperties) {
          node.style[transformProperty] = styles[transformProperty];
        }
        for (let child of Array.from(node.childNodes)) {
          recurseElementChildren(child);
        }
      }
    };

    setTimeout(()=>{
      html2canvas(this.canvasEle, {
        width: this.canvasEle.scrollWidth + 10,
        height: this.canvasEle.scrollHeight + 10,
        scrollX: 0,
        scrollY: 0,
        useCORS: true,
        allowTaint: true,
        backgroundColor: window.getComputedStyle(this.canvasEle).backgroundColor,
        onclone: (clonedEle)=>{
          setSvgInlineStyles(clonedEle);
          return clonedEle;
        },
      }).then((canvas)=>{
        let link = document.createElement('a');
        link.setAttribute('href', canvas.toDataURL('image/png'));
        link.setAttribute('download', this.getCurrentProjectName() + '.png');
        link.click();
        link.remove();
      }).catch((err)=>{
        console.error(err);
        let msg = gettext('Unknown error. Check console logs');
        if(err.name) {
          msg = `${err.name}: ${err.message}`;
        }
        this.props.alertify.alert()
          .set('title', gettext('Error'))
          .set('message', msg).show();
      }).then(()=>{
        /* Revert back to the original CSS styles */
        this.canvasEle.classList.remove('html2canvas-reset');
        this.canvasEle.style.width = '';
        this.canvasEle.style.height = '';
        this.canvasEle.childNodes.forEach((ele)=>{
          ele.style.transform = prevTransform;
        });
        this.setLoading(null);
      });
    }, 1000);
  }

  onOneToManyClick() {
    let dialog = this.getDialog('onetomany_dialog');
    let initData = {local_table_uid: this.diagram.getSelectedNodes()[0].getID()};
    dialog('One to many relation', initData, (newData)=>{
      let newLink = this.diagram.addLink(newData, 'onetomany');
      this.diagram.clearSelection();
      newLink.setSelected(true);
      this.diagram.repaint();
    });
  }

  onManyToManyClick() {
    let dialog = this.getDialog('manytomany_dialog');
    let initData = {left_table_uid: this.diagram.getSelectedNodes()[0].getID()};
    dialog('Many to many relation', initData, (newData)=>{
      let nodes = this.diagram.getModel().getNodesDict();
      let left_table = nodes[newData.left_table_uid];
      let right_table = nodes[newData.right_table_uid];
      let tableData = {
        name: `${left_table.getData().name}_${right_table.getData().name}`,
        schema: left_table.getData().schema,
        columns: [{
          ...left_table.getColumnAt(newData.left_table_column_attnum),
          'name': `${left_table.getData().name}_${left_table.getColumnAt(newData.left_table_column_attnum).name}`,
          'is_primary_key': false,
          'attnum': 0,
        },{
          ...right_table.getColumnAt(newData.right_table_column_attnum),
          'name': `${right_table.getData().name}_${right_table.getColumnAt(newData.right_table_column_attnum).name}`,
          'is_primary_key': false,
          'attnum': 1,
        }],
      };
      let newNode = this.diagram.addNode(tableData);
      this.diagram.clearSelection();
      newNode.setSelected(true);

      let linkData = {
        local_table_uid: newNode.getID(),
        local_column_attnum: newNode.getColumns()[0].attnum,
        referenced_table_uid: newData.left_table_uid,
        referenced_column_attnum : newData.left_table_column_attnum,
      };
      this.diagram.addLink(linkData, 'onetomany');

      linkData = {
        local_table_uid: newNode.getID(),
        local_column_attnum: newNode.getColumns()[1].attnum,
        referenced_table_uid: newData.right_table_uid,
        referenced_column_attnum : newData.right_table_column_attnum,
      };

      this.diagram.addLink(linkData, 'onetomany');

      this.diagram.repaint();
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
      let response = await axios.post(initUrl);
      this.setState({
        conn_status: CONNECT_STATUS.CONNECTED,
        server_version: response.data.data.serverVersion,
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
      let response = await axios.get(url);
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
    let url = url_for('erd.tables', {
      trans_id: this.props.params.trans_id,
      sgid: this.props.params.sgid,
      sid: this.props.params.sid,
      did: this.props.params.did,
    });

    try {
      let response = await axios.get(url);
      let tables = response.data.data.map((table)=>{
        return this.props.transformToSupported('table', table);
      });
      this.diagram.deserializeData(tables);
      return true;
    } catch (error) {
      this.handleAxiosCatch(error);
      return false;
    } finally {
      this.setLoading(null);
    }
  }

  render() {
    return (
      <>
        <ToolBar id="btn-toolbar">
          <ButtonGroup>
            <IconButton id="open-file" icon="fa fa-folder-open" onClick={this.onLoadDiagram} title={gettext('Load from file')}
              shortcut={this.state.preferences.open_project}/>
            <IconButton id="save-erd" icon="fa fa-save" onClick={()=>{this.onSaveDiagram();}} title={gettext('Save project')}
              shortcut={this.state.preferences.save_project} disabled={!this.state.dirty}/>
            <IconButton id="save-as-erd" icon="fa fa-share-square" onClick={this.onSaveAsDiagram} title={gettext('Save as')}
              shortcut={this.state.preferences.save_project_as}/>
          </ButtonGroup>
          <ButtonGroup>
            <IconButton id="save-sql" icon="fa fa-file-code" onClick={this.onSQLClick} title={gettext('Generate SQL')}
              shortcut={this.state.preferences.generate_sql}/>
            <IconButton id="save-image" icon="fa fa-file-image" onClick={this.onImageClick} title={gettext('Download image')}
              shortcut={this.state.preferences.download_image}/>
          </ButtonGroup>
          <ButtonGroup>
            <IconButton id="add-node" icon="fa fa-plus-square" onClick={this.onAddNewNode} title={gettext('Add table')}
              shortcut={this.state.preferences.add_table}/>
            <IconButton id="edit-node" icon="fa fa-pencil-alt" onClick={this.onEditNode} title={gettext('Edit table')}
              shortcut={this.state.preferences.edit_table} disabled={!this.state.single_node_selected || this.state.single_link_selected}/>
            <IconButton id="clone-node" icon="fa fa-clone" onClick={this.onCloneNode} title={gettext('Clone table')}
              shortcut={this.state.preferences.clone_table} disabled={!this.state.single_node_selected || this.state.single_link_selected}/>
            <IconButton id="delete-node" icon="fa fa-trash-alt" onClick={this.onDeleteNode} title={gettext('Drop table/link')}
              shortcut={this.state.preferences.drop_table} disabled={!this.state.any_item_selected}/>
          </ButtonGroup>
          <ButtonGroup>
            <IconButton id="add-onetomany" text="1M" onClick={this.onOneToManyClick} title={gettext('One-to-Many link')}
              shortcut={this.state.preferences.one_to_many} disabled={!this.state.single_node_selected || this.state.single_link_selected}/>
            <IconButton id="add-manytomany" text="MM" onClick={this.onManyToManyClick} title={gettext('Many-to-Many link')}
              shortcut={this.state.preferences.many_to_many} disabled={!this.state.single_node_selected || this.state.single_link_selected}/>
          </ButtonGroup>
          <ButtonGroup>
            <IconButton id="add-note" icon="fa fa-sticky-note" onClick={this.onNoteClick} title={gettext('Add/Edit note')}
              shortcut={this.state.preferences.add_edit_note} disabled={!this.state.single_node_selected || this.state.single_link_selected}/>
            <IconButton id="auto-align" icon="fa fa-magic" onClick={this.onAutoDistribute} title={gettext('Auto align')}
              shortcut={this.state.preferences.auto_align} />
            <DetailsToggleButton id="more-details" onClick={this.onDetailsToggle} showDetails={this.state.show_details}
              shortcut={this.state.preferences.show_details} />
          </ButtonGroup>
          <ButtonGroup>
            <IconButton id="zoom-to-fit" icon="fa fa-compress" onClick={this.diagram.zoomToFit} title={gettext('Zoom to fit')}
              shortcut={this.state.preferences.zoom_to_fit}/>
            <IconButton id="zoom-in" icon="fa fa-search-plus" onClick={this.diagram.zoomIn} title={gettext('Zoom in')}
              shortcut={this.state.preferences.zoom_in}/>
            <IconButton id="zoom-out" icon="fa fa-search-minus" onClick={this.diagram.zoomOut} title={gettext('Zoom out')}
              shortcut={this.state.preferences.zoom_out}/>
          </ButtonGroup>
          <ButtonGroup>
            <IconButton id="help" icon="fa fa-question" onClick={this.onHelpClick} title={gettext('Help')} />
          </ButtonGroup>
        </ToolBar>
        <ConnectionBar statusId="btn-conn-status" status={this.state.conn_status} bgcolor={this.props.params.bgcolor}
          fgcolor={this.props.params.fgcolor} title={this.props.params.title}/>
        <FloatingNote open={this.state.note_open} onClose={this.onNoteClose}
          reference={this.noteRefEle} noteNode={this.state.note_node} appendTo={this.diagramContainerRef.current} rows={8}/>
        <div className="diagram-container" ref={this.diagramContainerRef}>
          <Loader message={this.state.loading_msg} autoEllipsis={true}/>
          <CanvasWidget className="diagram-canvas flex-grow-1" ref={(ele)=>{this.canvasEle = ele?.ref?.current;}} engine={this.diagram.getEngine()} />
        </div>
      </>
    );
  }
}


BodyWidget.propTypes = {
  params:PropTypes.shape({
    trans_id: PropTypes.number.isRequired,
    sgid: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    sid: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    did: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
    server_type: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    bgcolor: PropTypes.string,
    fgcolor: PropTypes.string,
    gen: PropTypes.bool.isRequired,
  }),
  getDialog: PropTypes.func.isRequired,
  transformToSupported: PropTypes.func.isRequired,
  pgWindow: PropTypes.object.isRequired,
  pgAdmin: PropTypes.object.isRequired,
  alertify: PropTypes.object.isRequired,
  panel: PropTypes.object,
};
