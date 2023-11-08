/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import _ from 'lodash';
import url_for from 'sources/url_for';
import React, { useEffect, useMemo } from 'react';
import { FileType } from 'react-aspen';
import { Box } from '@material-ui/core';
import PropTypes from 'prop-types';
import { makeStyles } from '@material-ui/core/styles';
import SchemaView from '../../../../static/js/SchemaView';
import getApiInstance from '../../../../static/js/api_instance';
import CloseSharpIcon from '@material-ui/icons/CloseSharp';
import HelpIcon from '@material-ui/icons/HelpRounded';
import SaveSharpIcon from '@material-ui/icons/SaveSharp';
import clsx from 'clsx';
import pgAdmin from 'sources/pgadmin';
import { DefaultButton, PgIconButton, PrimaryButton } from '../../../../static/js/components/Buttons';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { getBinaryPathSchema } from '../../../../browser/server_groups/servers/static/js/binary_path.ui';
import { getBrowserAccesskey } from '../../../../static/js/components/ShortcutTitle';
import usePreferences from '../store';

class PreferencesSchema extends BaseUISchema {
  constructor(initValues = {}, schemaFields = []) {
    super({
      ...initValues
    });
    this.schemaFields = schemaFields;
    this.category = '';
  }

  get idAttribute() {
    return 'id';
  }

  setSelectedCategory(category) {
    this.category = category;
  }

  get baseFields() {
    return this.schemaFields;
  }
}

const useStyles = makeStyles((theme) =>
  ({
    root: {
      display: 'flex',
      flexDirection: 'column',
      flexGrow: 1,
      height: '100%',
      backgroundColor: theme.palette.background.default,
      overflow: 'hidden',
      '&$disabled': {
        color: '#ddd',
      }
    },
    body: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: 0,
    },
    preferences: {
      borderColor: theme.otherVars.borderColor,
      display: 'flex',
      flexGrow: 1,
      height: '100%',
      minHeight: 0,
      overflow: 'hidden'

    },
    treeContainer: {
      flexBasis: '25%',
      alignItems: 'flex-start',
      paddingLeft: '5px',
      minHeight: 0,
      flexGrow: 1
    },
    tree: {
      height: '100%',
      flexGrow: 1
    },
    preferencesContainer: {
      flexBasis: '75%',
      padding: '5px',
      borderColor: theme.otherVars.borderColor + '!important',
      borderLeft: '1px solid',
      position: 'relative',
      height: '100%',
      paddingTop: '5px',
      overflow: 'auto'
    },
    actionBtn: {
      alignItems: 'flex-start',
    },
    buttonMargin: {
      marginLeft: '0.5em'
    },
    footer: {
      borderTop: `1px solid ${theme.otherVars.inputBorderColor} !important`,
      padding: '0.5rem',
      display: 'flex',
      width: '100%',
      background: theme.otherVars.headerBg,
    },
    customTreeClass: {
      '& .react-checkbox-tree': {
        height: '100% !important',
        border: 'none !important',
      },
    },
    preferencesTree: {
      height: 'calc(100% - 50px)',
      minHeight: 0
    }
  }),
);


function RightPanel({ schema, ...props }) {
  let initData = () => new Promise((resolve, reject) => {
    try {
      resolve(props.initValues);
    } catch (error) {
      reject(error);
    }
  });

  return (
    <SchemaView
      formType={'dialog'}
      getInitData={initData}
      viewHelperProps={{ mode: 'edit' }}
      schema={schema}
      showFooter={false}
      isTabView={false}
      onDataChange={(isChanged, changedData) => {
        props.onDataChange(changedData);
      }}
    />
  );
}

RightPanel.propTypes = {
  schema: PropTypes.object,
  initValues: PropTypes.object,
  onDataChange: PropTypes.func
};


export default function PreferencesComponent({ ...props }) {
  const classes = useStyles();
  const [disableSave, setDisableSave] = React.useState(true);
  const prefSchema = React.useRef(new PreferencesSchema({}, []));
  const prefChangedData = React.useRef({});
  const prefTreeInit = React.useRef(false);
  const [prefTreeData, setPrefTreeData] = React.useState(null);
  const [initValues, setInitValues] = React.useState({});
  const [loadTree, setLoadTree] = React.useState(0);
  const api = getApiInstance();
  const firstTreeElement = React.useRef('');
  const preferencesStore = usePreferences();

  useEffect(() => {
    const pref_url = url_for('preferences.index');
    api({
      url: pref_url,
      method: 'GET',
    }).then((res) => {
      let preferencesData = [];
      let preferencesTreeData = [];
      let preferencesValues = {};
      res.data.forEach(node => {
        let id = crypto.getRandomValues(new Uint16Array(1));
        let tdata = {
          'id': id.toString(),
          'label': node.label,
          '_label': node.label,
          'name': node.label,
          'icon': '',
          'inode': true,
          'type': 2,
          '_type': node.label.toLowerCase(),
          '_id': id,
          '_pid': null,
          'childrenNodes': [],
          'expanded': true,
          'isExpanded': true,
        };

        if(firstTreeElement.current.length == 0) {
          firstTreeElement.current = node.label;
        }

        node.children.forEach(subNode => {
          let sid = crypto.getRandomValues(new Uint16Array(1));
          let nodeData = {
            'id': sid.toString(),
            'label': subNode.label,
            '_label': subNode.label,
            'name': subNode.name,
            'icon': '',
            'inode': false,
            '_type': subNode.label.toLowerCase(),
            '_id': sid,
            '_pid': node.id,
            'type': 1,
            'expanded': false,
          };

          addNote(node, subNode, nodeData, preferencesData);
          setPreferences(node, subNode, nodeData, preferencesValues, preferencesData);
          tdata['childrenNodes'].push(nodeData);
        });

        // set Preferences Tree data
        preferencesTreeData.push(tdata);

      });
      setPrefTreeData(preferencesTreeData);
      setInitValues(preferencesValues);
      // set Preferences schema
      prefSchema.current = new PreferencesSchema(preferencesValues, preferencesData);
    }).catch((err) => {
      pgAdmin.Browser.notifier.alert(err);
    });
  }, []);
  function setPreferences(node, subNode, nodeData, preferencesValues, preferencesData) {
    let addBinaryPathNote = false;
    subNode.preferences.forEach((element) => {
      let note = '';
      let type = getControlMappedForType(element.type);

      if (type === 'file') {
        note = gettext('Enter the directory in which the psql, pg_dump, pg_dumpall, and pg_restore utilities can be found for the corresponding database server version.  The default path will be used for server versions that do not have a  path specified.');
        element.type = 'collection';
        element.schema = getBinaryPathSchema();
        element.canAdd = false;
        element.canDelete = false;
        element.canEdit = false;
        element.editable = false;
        element.disabled = true;
        preferencesValues[element.id] = JSON.parse(element.value);
        if(addBinaryPathNote) {
          addNote(node, subNode, nodeData, preferencesData, note);
        }
        addBinaryPathNote = true;
      }
      else if (type == 'select') {
        setControlProps(element);
        element.type = type;
        preferencesValues[element.id] = element.value;

        setThemesOptions(element);
      }
      else if (type === 'keyboardShortcut') {
        getKeyboardShortcuts(element, preferencesValues, node);
      } else if (type === 'threshold') {
        element.type = 'threshold';

        let _val = element.value.split('|');
        preferencesValues[element.id] = { 'warning': _val[0], 'alert': _val[1] };
      } else if (subNode.label == gettext('Results grid') && node.label == gettext('Query Tool')) {
        setResultsOptions(element, subNode, preferencesValues, type);
      } else {
        element.type = type;
        preferencesValues[element.id] = element.value;
      }

      delete element.value;
      element.visible = false;
      element.helpMessage = element?.help_str ? element.help_str : null;
      preferencesData.push(element);
      element.parentId = nodeData['id'];
    });
  }

  function setResultsOptions(element, subNode, preferencesValues, type) {
    if (element.name== 'column_data_max_width') {
      let size_control_id = null;
      subNode.preferences.forEach((_el) => {
        if(_el.name == 'column_data_auto_resize') {
          size_control_id = _el.id;
        }

      });
      element.disabled = (state) => {
        return state[size_control_id] != 'by_data';
      };
    }
    element.type = type;
    preferencesValues[element.id] = element.value;
  }

  function setThemesOptions(element) {
    if (element.name == 'theme') {
      element.type = 'theme';

      element.options.forEach((opt) => {
        if (opt.value == element.value) {
          opt.selected = true;
        } else {
          opt.selected = false;
        }
      });
    }
  }
  function setControlProps(element) {
    if (element.control_props !== undefined) {
      element.controlProps = element.control_props;
    } else {
      element.controlProps = {};
    }

  }

  function getKeyboardShortcuts(element, preferencesValues, node) {
    element.type = 'keyboardShortcut';
    element.canAdd = false;
    element.canDelete = false;
    element.canEdit = false;
    element.editable = false;
    if (preferencesStore.getPreferences(node.label.toLowerCase(), element.name)?.value) {
      let temp = preferencesStore.getPreferences(node.label.toLowerCase(), element.name).value;
      preferencesValues[element.id] = temp;
    } else {
      preferencesValues[element.id] = element.value;
    }
  }
  function addNote(node, subNode, nodeData, preferencesData, note = '') {
    // Check and add the note for the element.
    if (subNode.label == gettext('Nodes') && node.label == gettext('Browser')) {
      note = [gettext('This settings is to Show/Hide nodes in the object explorer.')].join('');
    } if(nodeData.name == 'keyboard_shortcuts') {
      note = gettext('The Accesskey here is %s.', getBrowserAccesskey().join(' + '));
    } else {
      note = [note].join('');
    }

    if (note && note.length > 0) {
      //Add Note for Nodes
      preferencesData.push(
        {
          id: _.uniqueId('note') + subNode.id,
          type: 'note', text: note,
          visible: false,
          'parentId': nodeData['id']
        },
      );
    }

  }

  function selectChildNode(item, prefTreeInit) {
    if (item.isExpanded && item._children && item._children.length > 0 && prefTreeInit.current && event.code !== 'ArrowUp') {
      pgAdmin.Browser.ptree.tree.setActiveFile(item._children[0], true);
    }
  }

  useEffect(() => {
    let initTreeTimeout = null;
    let firstElement = null;
    // Listen selected preferences tree node event and show the appropriate components in right panel.
    pgAdmin.Browser.Events.on('preferences:tree:selected', (event, item) => {
      if (item.type == FileType.File) {
        prefSchema.current.setSelectedCategory(item._metadata.data.name);
        prefSchema.current.schemaFields.forEach((field) => {
          field.visible = field.parentId === item._metadata.data.id && !field?.hidden ;
          if(field.visible && _.isNull(firstElement)) {
            firstElement = field;
          }
        });
        setLoadTree(crypto.getRandomValues(new Uint16Array(1)));
        initTreeTimeout = setTimeout(() => {
          prefTreeInit.current = true;
          if(firstElement) {
            //set focus on first element on right side panel.
            document.getElementsByName(firstElement.id.toString())[0].focus();
            firstElement = '';
          }
        }, 10);
      }
      else {
        selectChildNode(item, prefTreeInit);
      }
    });

    // Listen open preferences tree node event to default select first child node on parent node selection.
    pgAdmin.Browser.Events.on('preferences:tree:opened', (event, item) => {
      pgAdmin.Browser.ptree.tree.setActiveFile(item._children[0], true);
    });

    // Listen added preferences tree node event to expand the newly added node on tree load.
    pgAdmin.Browser.Events.on('preferences:tree:added', addPrefTreeNode);
    /* Clear the initTreeTimeout timeout if unmounted */
    return () => {
      clearTimeout(initTreeTimeout);
    };
  }, []);

  function addPrefTreeNode(event, item) {
    if (item._parent._fileName == firstTreeElement.current && item._parent.isExpanded && !prefTreeInit.current) {
      pgAdmin.Browser.ptree.tree.setActiveFile(item._parent._children[0], true);
    }
    else if (item.type == FileType.Directory) {
      // Check the if newely added node is Directoy and call toggle to expand the node.
      pgAdmin.Browser.ptree.tree.toggleDirectory(item);
    }
  }

  function getControlMappedForType(type) {
    switch (type) {
    case 'text':
      return 'text';
    case 'input':
      return 'text';
    case 'boolean':
      return 'switch';
    case 'node':
      return 'switch';
    case 'integer':
      return 'numeric';
    case 'numeric':
      return 'numeric';
    case 'date':
      return 'datetimepicker';
    case 'datetime':
      return 'datetimepicker';
    case 'options':
      return 'select';
    case 'select':
      return 'select';
    case 'select2':
      return 'select';
    case 'multiline':
      return 'multiline';
    case 'switch':
      return 'switch';
    case 'keyboardshortcut':
      return 'keyboardShortcut';
    case 'radioModern':
      return 'toggle';
    case 'selectFile':
      return 'file';
    case 'threshold':
      return 'threshold';
    default:
      if (console && console.warn) {
        // Warning for developer only.
        console.warn(
          'Hmm.. We don\'t know how to render this type - \'\'' + type + '\' of control.'
        );
      }
      return 'input';
    }
  }

  function getCollectionValue(_metadata, value, initVals) {
    let val = value;
    if (typeof (value) == 'object') {
      if (_metadata[0].type == 'collection' && _metadata[0].schema) {
        if ('binaryPath' in value.changed[0]) {
          let pathData = [];
          let pathVersions = [];
          value.changed.forEach((chValue) => {
            pathVersions.push(chValue.version);
          });
          getPathData(initVals, pathData, _metadata, value, pathVersions);
          val = JSON.stringify(pathData);
        } else {
          let key_val = {
            'char': value.changed[0]['key'],
            'key_code': value.changed[0]['code'],
          };
          value.changed[0]['key'] = key_val;
          val = value.changed[0];
        }
      } else if ('warning' in value) {
        val = value['warning'] + '|' + value['alert'];
      } else if (value?.changed && value.changed.length > 0) {
        val = JSON.stringify(value.changed);
      }
    }
    return val;
  }

  function getPathData(initVals, pathData, _metadata, value, pathVersions) {
    initVals[_metadata[0].id].forEach((initVal) => {
      if (pathVersions.includes(initVal.version)) {
        pathData.push(value.changed[pathVersions.indexOf(initVal.version)]);
      }
      else {
        pathData.push(initVal);
      }
    });
  }

  function savePreferences(data, initVal) {
    let _data = [];
    for (const [key, value] of Object.entries(data.current)) {
      let _metadata = prefSchema.current.schemaFields.filter((el) => { return el.id == key; });
      if (_metadata.length > 0) {
        let val = getCollectionValue(_metadata, value, initVal);
        _data.push({
          'category_id': _metadata[0]['cid'],
          'id': parseInt(key),
          'mid': _metadata[0]['mid'],
          'name': _metadata[0]['name'],
          'value': val,
        });
      }
    }

    if (_data.length > 0) {
      save(_data, data);
    }

  }

  function checkRefreshRequired(pref, requires_refresh) {
    if (pref.name == 'theme') {
      requires_refresh = true;
    }

    if (pref.name == 'user_language') {
      requires_refresh = true;
    }

    return requires_refresh;
  }

  function save(save_data, data) {
    api({
      url: url_for('preferences.index'),
      method: 'PUT',
      data: save_data,
    }).then(() => {
      let requiresTreeRefresh = save_data.some((s)=>{
        return s.name=='show_system_objects'||s.name=='show_empty_coll_nodes'||s.name.startsWith('show_node_')||s.name=='hide_shared_server'||s.name=='show_user_defined_templates';
      });
      let requires_refresh = false;
      for (const [key] of Object.entries(data.current)) {
        let pref = preferencesStore.getPreferenceForId(Number(key));
        requires_refresh = checkRefreshRequired(pref, requires_refresh);
      }

      if (requiresTreeRefresh) {
        pgAdmin.Browser.notifier.confirm(
          gettext('Object explorer refresh required'),
          gettext('An object explorer refresh is required. Do you wish to refresh it now?'),
          function () {
            pgAdmin.Browser.tree.destroy({
              success: function () {
                return true;
              },
            });
          },
          function () {
            return true;
          },
          gettext('Refresh'),
          gettext('Later')
        );
      }

      if (requires_refresh) {
        pgAdmin.Browser.notifier.confirm(
          gettext('Refresh required'),
          gettext('A page refresh is required to apply the theme. Do you wish to refresh the page now?'),
          function () {
            /* If user clicks Yes */
            location.reload();
            return true;
          },
          function () { props.closeModal();},
          gettext('Refresh'),
          gettext('Later')
        );
      }
      // Refresh preferences cache
      preferencesStore.cache();
      props.closeModal();
    }).catch((err) => {
      pgAdmin.Browser.notifier.alert(err.response.data);
    });
  }

  const onDialogHelp = () => {
    window.open(url_for('help.static', { 'filename': 'preferences.html' }), 'pgadmin_help');
  };

  return (
    <Box height={'100%'}>
      <Box className={classes.root}>
        <Box className={clsx(classes.preferences)}>
          <Box className={clsx(classes.treeContainer)} >

            <Box className={clsx(classes.tree)} id={'treeContainer'} tabIndex={0}>
              {
                useMemo(() => (prefTreeData && props.renderTree(prefTreeData)), [prefTreeData])
              }
            </Box>
          </Box>
          <Box className={clsx(classes.preferencesContainer)}>
            {
              prefSchema.current && loadTree > 0 &&
                <RightPanel schema={prefSchema.current} initValues={initValues} onDataChange={(changedData) => {
                  Object.keys(changedData).length > 0 ? setDisableSave(false) : setDisableSave(true);
                  prefChangedData.current = changedData;
                }}></RightPanel>
            }
          </Box>
        </Box>
        <Box className={classes.footer}>
          <Box>
            <PgIconButton data-test="dialog-help" onClick={onDialogHelp} icon={<HelpIcon />} title={gettext('Help for this dialog.')} />
          </Box>
          <Box className={classes.actionBtn} marginLeft="auto">
            <DefaultButton className={classes.buttonMargin} onClick={() => { props.closeModal();}} startIcon={<CloseSharpIcon onClick={() => { props.closeModal();}} />}>
              {gettext('Cancel')}
            </DefaultButton>
            <PrimaryButton className={classes.buttonMargin} startIcon={<SaveSharpIcon />} disabled={disableSave} onClick={() => { savePreferences(prefChangedData, initValues); }}>
              {gettext('Save')}
            </PrimaryButton>
          </Box>
        </Box>
      </Box >
    </Box>
  );
}

PreferencesComponent.propTypes = {
  schema: PropTypes.array,
  initValues: PropTypes.object,
  closeModal: PropTypes.func,
  renderTree: PropTypes.func
};
