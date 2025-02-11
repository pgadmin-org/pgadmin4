/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import { styled } from '@mui/material/styles';
import _ from 'lodash';
import url_for from 'sources/url_for';
import React, { useEffect, useMemo } from 'react';
import { FileType } from 'react-aspen';
import { Box } from '@mui/material';
import PropTypes from 'prop-types';
import CloseIcon from '@mui/icons-material/CloseRounded';
import HTMLReactParser from 'html-react-parser/lib/index';
import SchemaView from '../../../../static/js/SchemaView';
import getApiInstance from '../../../../static/js/api_instance';
import CloseSharpIcon from '@mui/icons-material/CloseSharp';
import HelpIcon from '@mui/icons-material/HelpRounded';
import SaveSharpIcon from '@mui/icons-material/SaveSharp';
import SettingsBackupRestoreIcon from'@mui/icons-material/SettingsBackupRestore';
import pgAdmin from 'sources/pgadmin';
import { DefaultButton, PgIconButton, PrimaryButton } from '../../../../static/js/components/Buttons';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';
import { getBinaryPathSchema } from '../../../../browser/server_groups/servers/static/js/binary_path.ui';
import usePreferences from '../store';
import { getBrowser } from '../../../../static/js/utils';


const StyledBox = styled(Box)(({theme}) => ({
  '& .PreferencesComponent-root': {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    height: '100%',
    backgroundColor: theme.palette.background.default,
    overflow: 'hidden',
    '&$disabled': {
      color: '#ddd',
    },
    '& .PreferencesComponent-body': {
      borderColor: theme.otherVars.borderColor,
      display: 'flex',
      flexGrow: 1,
      height: '100%',
      minHeight: 0,
      overflow: 'hidden',
      '& .PreferencesComponent-treeContainer': {
        flexBasis: '25%',
        alignItems: 'flex-start',
        paddingLeft: '5px',
        minHeight: 0,
        flexGrow: 1,
        '& .PreferencesComponent-tree': {
          height: '100%',
          flexGrow: 1
        },
      },
      '& .PreferencesComponent-preferencesContainer': {
        flexBasis: '75%',
        padding: '5px',
        borderColor: theme.otherVars.borderColor + '!important',
        borderLeft: '1px solid',
        position: 'relative',
        height: '100%',
        paddingTop: '5px',
        overflow: 'auto',
        '& .PreferencesComponent-preferencesContainerBackground': {
          backgroundColor: theme.palette.background.default,
        }
      },
    },
    '& .PreferencesComponent-footer': {
      borderTop: `1px solid ${theme.otherVars.inputBorderColor} !important`,
      padding: '0.5rem',
      display: 'flex',
      width: '100%',
      background: theme.otherVars.headerBg,
      '& .PreferencesComponent-actionBtn': {
        alignItems: 'flex-start',
      },
      '& .PreferencesComponent-buttonMargin': {
        marginLeft: '0.5em'
      },
    },

  },
  '& .Alert-footer': {
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '0.5rem',
    ...theme.mixins.panelBorder.top,
  },
  '& .Alert-margin': {
    marginLeft: '0.25rem',
  },
}));


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

  categoryUpdated() {
    this.state?.validate(this.sessData);
  }

  get baseFields() {
    return this.schemaFields;
  }
}

async function reloadPgAdmin() {
  let {name: browser} = getBrowser();
  if(browser == 'Electron') {
    await window.electronUI.log('test');
    await window.electronUI.reloadApp();
  } else {
    location.reload();
  }
}


function RightPanel({ schema, refreshKey, ...props }) {
  const schemaViewRef = React.useRef(null);
  let initData = () => new Promise((resolve, reject) => {
    try {
      resolve(props.initValues);
    } catch (error) {
      reject(error instanceof Error ? error : Error(gettext('Something went wrong')));
    }
  });
  useEffect(() => {
    const timeID = setTimeout(() => {
      const focusableElement = schemaViewRef.current?.querySelector(
        'button, a, input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElement) focusableElement.focus();
    }, 50);
    return () => clearTimeout(timeID);
  }, [refreshKey]);

  return (
    <div ref={schemaViewRef}>
      <SchemaView
        formType={'dialog'}
        getInitData={initData}
        viewHelperProps={{ mode: 'edit' }}
        schema={schema}
        showFooter={false}
        isTabView={false}
        formClassName='PreferencesComponent-preferencesContainerBackground'
        onDataChange={(isChanged, changedData) => {
          props.onDataChange(changedData);
        }}
      />
    </div>
  );
}

RightPanel.propTypes = {
  schema: PropTypes.object,
  refreshKey: PropTypes.number,
  initValues: PropTypes.object,
  onDataChange: PropTypes.func
};


export default function PreferencesComponent({ ...props }) {

  const [refreshKey, setRefreshKey] = React.useState(0);
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
          'name': node.name,
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
      prefSchema.current = new PreferencesSchema(
        preferencesValues, preferencesData,
      );
    }).catch((err) => {
      pgAdmin.Browser.notifier.alert(err);
    });
  }, []);

  function setPreferences(
    node, subNode, nodeData, preferencesValues, preferencesData
  ) {
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
      } else if (subNode.label == gettext('User Interface') && node.label == gettext('Miscellaneous')) {
        setWorkspaceOptions(element, subNode, preferencesValues, type);
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

  function setWorkspaceOptions(element, subNode, preferencesValues, type) {
    if (element.name== 'open_in_res_workspace') {
      let layout_control_id = null;
      subNode.preferences.forEach((_el) => {
        if(_el.name == 'layout') {
          layout_control_id = _el.id;
        }

      });
      element.disabled = (state) => {
        return state[layout_control_id] != 'workspace';
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
        opt.preview_src = opt.preview_src && url_for('static', { filename: opt.preview_src });
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
    } else {
      note = [note].join('');
    }

    if (note && note.length > 0) {
      //Add Note for Nodes
      preferencesData.push(
        {
          id: _.uniqueId('note') + subNode.id,
          type: 'note',
          text: note,
          'parentId': nodeData['id'],
          visible: false,
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
    let firstElement = null;
    // Listen selected preferences tree node event and show the appropriate components in right panel.
    pgAdmin.Browser.Events.on('preferences:tree:selected', (event, item) => {
      if (item.type == FileType.File) {
        prefSchema.current.schemaFields.forEach((field) => {
          field.visible = field.parentId === item._metadata.data.id &&
            !field?.hidden ;

          if(field.visible && _.isNull(firstElement)) {
            firstElement = field;
          }

          field.labelTooltip =
            item._parent._metadata.data.name.toLowerCase() + ':' +
            item._metadata.data.name + ':' + field.name;
        });
        prefSchema.current.categoryUpdated(item._metadata.data.id);
        setLoadTree(Date.now());
        setRefreshKey(Date.now());
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
      if (console?.warn) {
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
      let _metadata = prefSchema.current.schemaFields.filter(
        (el) => { return el.id == key; }
      );
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
      // Check whether layout is changed from Workspace to Classic.
      let layoutPref = _data.find(x => x.name === 'layout');
      // If layout is changed then raise the warning to close all the connections.
      if (!_.isUndefined(layoutPref) && layoutPref.value == 'classic') {
        pgAdmin.Browser.notifier.confirm(
          gettext('Layout changed'),
          `${gettext('Switching from Workspace to Classic layout will disconnect all server connections and refresh the entire page.')}
           ${gettext('To avoid losing unsaved data, click Cancel to manually review and close your connections.')}
           ${gettext('Note that if you choose Cancel, any changes to your preferences will not be saved.')}<br><br>
           ${gettext('Do you want to continue?')}`,
          function () {
            save(_data, data, true);
          },
          function () {
            return true;
          },
          gettext('Continue'),
          gettext('Cancel')
        );
      } else {
        save(_data, data);
      }
    }

  }

  function checkRefreshRequired(pref, requires_refresh) {
    if (pref.name == 'user_language') {
      requires_refresh = true;
    }

    return requires_refresh;
  }

  function save(save_data, data, layout_changed=false) {
    api({
      url: url_for('preferences.index'),
      method: 'PUT',
      data: save_data,
    }).then(() => {
      // If layout is changed then only refresh the object explorer.
      if (layout_changed) {
        api({
          url: url_for('workspace.layout_changed'),
          method: 'DELETE',
          data: save_data,
        }).then(() => {
          pgAdmin.Browser.tree.destroy().then(
            () => {
              pgAdmin.Browser.Events.trigger(
                'pgadmin-browser:tree:destroyed', undefined, undefined
              );
              return true;
            }
          );
        });
      } else {
        let requiresTreeRefresh = save_data.some((s)=>{
          return (
            s.name=='show_system_objects' || s.name=='show_empty_coll_nodes' ||
            s.name.startsWith('show_node_') || s.name=='hide_shared_server' ||
            s.name=='show_user_defined_templates'
          );
        });
        let requires_refresh = false;
        for (const [key] of Object.entries(data.current)) {
          let pref = preferencesStore.getPreferenceForId(Number(key));
          requires_refresh = checkRefreshRequired(pref, requires_refresh);
        }

        if (requiresTreeRefresh) {
          pgAdmin.Browser.notifier.confirm(
            gettext('Object explorer refresh required'),
            gettext(
              'An object explorer refresh is required. Do you wish to refresh it now?'
            ),
            function () {
              pgAdmin.Browser.tree.destroy().then(
                () => {
                  pgAdmin.Browser.Events.trigger(
                    'pgadmin-browser:tree:destroyed', undefined, undefined
                  );
                  return true;
                }
              );
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
            gettext('A page refresh is required. Do you wish to refresh the page now?'),
            function () {
              /* If user clicks Yes */
              reloadPgAdmin();
              return true;
            },
            function () { props.closeModal();},
            gettext('Refresh'),
            gettext('Later')
          );
        }
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

  const reset = () => {
    const text = `${gettext('All preferences will be reset to their default values.')}<br><br>${gettext('Do you want to proceed?')}<br><br>
${gettext('Note:')}<br> <ul style="padding-left:20px"><li style="list-style-type:disc">${gettext('The object explorer tree will be refreshed automatically to reflect the changes.')}</li>
<li style="list-style-type:disc">${gettext('If the application language changes, a reload of the application will be required. You can choose to reload later at your convenience.')}</li></ul>`;

    pgAdmin.Browser.notifier.showModal(
      gettext('Reset all preferences'),
      (closeModal)=>{
        const onClick = (reset) => {
          resetPrefsToDefault(reset);
          closeModal();
        };
        return(
          <StyledBox display="flex" flexDirection="column" height="100%">
            <Box flexGrow="1" p={2}>
              {HTMLReactParser(text)}
            </Box>
            <Box className='Alert-footer'>
              <DefaultButton className='Alert-margin' startIcon={<CloseIcon />} onClick={()=> closeModal()}>{'Cancel'}</DefaultButton>
              <DefaultButton className='Alert-margin' startIcon={<SaveSharpIcon />} onClick={() => onClick(true)} >{gettext('Save & Reload')}</DefaultButton>
              <PrimaryButton className='Alert-margin' startIcon={ <SaveSharpIcon />} onClick={()=>onClick(false)}>{gettext('Save & Reload Later')}</PrimaryButton>
            </Box>
          </StyledBox>
        );
      },
      { isFullScreen: false, isResizeable: false, showFullScreen: false, isFullWidth: false, showTitle: true},
    );
  };

  const resetPrefsToDefault = (refresh = false) => {
    api({
      url: url_for('preferences.index'),
      method: 'DELETE'
    }).then(()=>{
      if (refresh){
        reloadPgAdmin();
        return true;
      }
      preferencesStore.cache();
      pgAdmin.Browser.tree.destroy().then(
        () => {
          pgAdmin.Browser.Events.trigger(
            'pgadmin-browser:tree:destroyed', undefined, undefined
          );
          return true;
        }
      );
      props.closeModal();
    }).catch((err) => {
      pgAdmin.Browser.notifier.alert(err.response.data);
    });
  };

  return (
    <StyledBox height={'100%'}>
      <Box className='PreferencesComponent-root'>
        <Box className='PreferencesComponent-body'>
          <Box className='PreferencesComponent-treeContainer' >
            <Box className='PreferencesComponent-tree' id={'treeContainer'} tabIndex={0}>
              {
                useMemo(
                  () => (prefTreeData && props.renderTree(prefTreeData)),
                  [prefTreeData]
                )
              }
            </Box>
          </Box>
          <Box className='PreferencesComponent-preferencesContainer'>
            {
              prefSchema.current && loadTree > 0 &&
                <RightPanel
                  schema={prefSchema.current} initValues={initValues}
                  refreshKey={refreshKey}
                  onDataChange={(changedData) => {
                    Object.keys(changedData).length > 0 ?
                      setDisableSave(false) : setDisableSave(true);
                    prefChangedData.current = changedData;
                  }}
                ></RightPanel>
            }
          </Box>
        </Box>
        <Box className='PreferencesComponent-footer'>
          <Box>
            <PgIconButton
              data-test="dialog-help" onClick={onDialogHelp}
              icon={<HelpIcon />} title={gettext('Help for this dialog.')}
            />
          </Box>
          <Box className='PreferencesComponent-actionBtn' marginLeft="auto">
            <DefaultButton className='PreferencesComponent-buttonMargin'
              onClick={reset} startIcon={<SettingsBackupRestoreIcon />}>
              {gettext('Reset all preferences')}
            </DefaultButton>
            <DefaultButton className='PreferencesComponent-buttonMargin'
              onClick={() => { props.closeModal();}}
              startIcon={
                <CloseSharpIcon onClick={() => { props.closeModal();}} />
              }>
              {gettext('Cancel')}
            </DefaultButton>
            <PrimaryButton
              className='PreferencesComponent-buttonMargin'
              startIcon={<SaveSharpIcon />}
              disabled={disableSave}
              onClick={() => {
                savePreferences(prefChangedData, initValues);
              }}>
              {gettext('Save')}
            </PrimaryButton>
          </Box>
        </Box>
      </Box >
    </StyledBox>
  );
}

PreferencesComponent.propTypes = {
  schema: PropTypes.array,
  initValues: PropTypes.object,
  closeModal: PropTypes.func,
  renderTree: PropTypes.func
};
