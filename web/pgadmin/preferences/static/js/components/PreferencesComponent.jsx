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
import url_for from 'sources/url_for';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box } from '@mui/material';
import PropTypes from 'prop-types';
import getApiInstance from '../../../../static/js/api_instance';
import HelpIcon from '@mui/icons-material/HelpRounded';
import SaveSharpIcon from '@mui/icons-material/SaveSharp';
import SettingsBackupRestoreIcon from '@mui/icons-material/SettingsBackupRestore';
import { PgButtonGroup, PgIconButton } from '../../../../static/js/components/Buttons';
import usePreferences from '../store';
import { usePgAdmin } from '../../../../static/js/PgAdminProvider';
import { InputText } from '../../../../static/js/components/FormComponents';
import { SearchRounded } from '@mui/icons-material';
import PreferencesSchema from './preferences.ui';
import { useFuzzySearchList } from '@nozbe/microfuzz/react';
import Loader from 'sources/components/Loader';


// Import helpers from new file
import {
  reloadPgAdmin,
  getNoteField,
  prepareSubnodeData,
  getCollectionValue,
  showResetPrefModal
} from './PreferencesHelper';
import { LAYOUT_EVENTS, LayoutDockerContext } from '../../../../static/js/helpers/Layout';
import LeftTree from './LeftTree';
import RightPreference from './RightPreference';

// --- Styled Components ---
const Root = styled(Box)(({ theme }) => ({
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  background: theme.otherVars.emptySpaceBg,
  overflow: 'hidden',

  '& .PreferencesComponent-header': {
    display: 'flex',
    alignItems: 'center',
    background: theme.palette.background.default,
    padding: theme.spacing(1),
    ...theme.mixins.panelBorder.bottom,

    '& .PreferencesComponent-actionBtn': {
      display: 'flex',
      alignItems: 'center',
      gap: theme.spacing(1),
    },

    '& .PreferencesComponent-searchInput': {
      maxWidth: '300px',
      marginLeft: 'auto',
    },
  },

  '& .PreferencesComponent-body': {
    flexGrow: 1,
    minHeight: 0,
    padding: theme.spacing(1),

    '& .PreferencesComponent-bodyWrap': {
      ...theme.mixins.panelBorder.all,
      display: 'flex',
      height: '100%',
      background: theme.palette.background.default,

      '& .PreferencesComponent-treeContainer': {
        minHeight: 0,
        flexGrow: 1,
      },
      '& .PreferencesComponent-preferencesContainer': {
        borderColor: `${theme.otherVars.borderColor} !important`,
        borderLeft: '1px solid',
        position: 'relative',
        height: '100%',
        overflow: 'auto',
        width: '100%',

        '& .PreferencesComponent-noSelection': {
          padding: theme.spacing(1),
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing(0.5),
        },

        '& .PreferencesComponent-preferencesContainerBackground': {
          backgroundColor: 'inherit',
        },
      },
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
      marginLeft: '0.5em',
    },
  },
}));

// Helper to check if a page refresh is required
function checkRefreshRequired(pref) {
  // Other preferences might also require a refresh, add them here
  return pref.name === 'user_language';
};

// --- Main PreferencesComponent ---
export default function PreferencesComponent({panelId}) {
  const [disableSave, setDisableSave] = useState(true);
  const prefSchema = useRef(new PreferencesSchema({}, []));
  const prefChangedData = useRef({});
  const [prefTreeData, setPrefTreeData] = useState([]);
  const [initValues, setInitValues] = useState({});
  const api = getApiInstance();
  const firstTreeElement = useRef('');
  const preferencesStore = usePreferences();
  const pgAdmin = usePgAdmin();
  const [searchVal, setSearchVal] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [loaderText, setLoaderText] = useState(gettext('Loading preferences...'));
  const layoutDocker = React.useContext(LayoutDockerContext);
  const valuesVersionRef = useRef();

  const fetchPreferences = async () => {
    setLoaderText(gettext('Loading preferences...'));
    try {
      const res = await api({
        url: url_for('preferences.index'),
        method: 'GET',
      });

      const schemaFields = [];
      const treeNodesData = [];
      let values = {};

      res.data.forEach((node) => {
        const categoryNode = {
          id: node.id.toString(),
          name: node.label,
          key: node.name,
          children: [],
        };

        if (firstTreeElement.current.length === 0) {
          firstTreeElement.current = node.label;
        }

        node.children.forEach((subNode) => {
          const nodeData = {
            id: `${categoryNode.id}_${subNode.id}`,
            name: subNode.label,
            key: subNode.name,
          };

          categoryNode.children.push(nodeData);
          schemaFields.push(...getNoteField(node, subNode, nodeData));

          const {fieldItems, fieldValues} = prepareSubnodeData(node, subNode, nodeData, preferencesStore);
          schemaFields.push(...fieldItems);
          values = {...values, ...fieldValues};
        });
        treeNodesData.push(categoryNode);
      });

      valuesVersionRef.current = new Date().getTime();
      setInitValues(values);
      setPrefTreeData(treeNodesData);
      setSelectedItem(selectedItem || treeNodesData[0]?.children[0]);
      prefSchema.current = new PreferencesSchema(values, schemaFields);
      setLoaderText(null);
    } catch (err) {
      pgAdmin.Browser.notifier.alert(err.response?.data || err.message || gettext('Failed to load preferences.'));
    }
  };

  // Effect to fetch preferences data on component mount
  useEffect(() => {
    fetchPreferences();
  }, []); // Added dependencies

  useEffect(()=>{
    /* Bind the close event and check if user should be warned */
    const deregister = layoutDocker.eventBus.registerListener(LAYOUT_EVENTS.CLOSING, (id)=>{
      if(panelId != id) return;

      if(Object.keys(prefChangedData.current).length > 0) {
        pgAdmin.Browser.notifier.confirm(
          gettext('Warning'),
          gettext('Changes will be lost. Are you sure you want to close the preferences?'),
          function() {
            layoutDocker.close(panelId, true);
            return true;
          },
          null
        );
        return false; // Prevent closing
      }
      layoutDocker.close(panelId, true);
    });
    return ()=>{
      deregister();
    };
  }, []);


  const savePreferences = async () => {
    const _data = [];
    setLoaderText(gettext('Saving preferences...'));
    for (const [key, value] of Object.entries(prefChangedData.current)) {
      const _metadata = prefSchema.current.schemaFields.find((el) => el.id == key); // Find directly
      if (_metadata) {
        const val = getCollectionValue([_metadata], value, initValues); // Pass _metadata as array for consistency
        _data.push({
          category_id: _metadata.cid,
          id: parseInt(key),
          mid: _metadata.mid,
          name: _metadata.name,
          value: val,
        });
      }
    }

    if (_data.length === 0) {
      // No changes to save, just close modal
      setLoaderText(null);
      return;
    }

    const layoutPref = _data.find((x) => x.name === 'layout');

    const saveData = async (shouldReloadOnLayoutChange = false) => {
      try {
        await api({
          url: url_for('preferences.index'),
          method: 'PUT',
          data: _data,
        });

        if (shouldReloadOnLayoutChange) {
          await api({
            url: url_for('workspace.layout_changed'),
            method: 'DELETE', // DELETE seems unusual for layout_changed, but maintaining original logic
            data: _data,
          });
          pgAdmin.Browser.tree.destroy().then(() => {
            pgAdmin.Browser.Events.trigger('pgadmin-browser:tree:destroyed', undefined, undefined);
            reloadPgAdmin(); // Reload after destroying tree
          });
        } else {
          const requiresTreeRefresh = _data.some((s) =>
            ['show_system_objects', 'show_empty_coll_nodes', 'hide_shared_server', 'show_user_defined_templates'].includes(s.name) || s.name.startsWith('show_node_')
          );

          let requiresFullPageRefresh = false;
          for (const key of Object.keys(prefChangedData.current)) {
            const pref = preferencesStore.getPreferenceForId(Number(key));
            if (pref && checkRefreshRequired(pref)) {
              requiresFullPageRefresh = true;
              break;
            }
          }

          if (requiresTreeRefresh) {
            pgAdmin.Browser.notifier.confirm(
              gettext('Object explorer refresh required'),
              gettext('An object explorer refresh is required. Do you wish to refresh it now?'),
              () => {
                pgAdmin.Browser.tree.destroy().then(() => {
                  pgAdmin.Browser.Events.trigger('pgadmin-browser:tree:destroyed', undefined, undefined);
                });
                return true;
              },
              () => true,
              gettext('Refresh'),
              gettext('Later')
            );
          }

          if (requiresFullPageRefresh) {
            pgAdmin.Browser.notifier.confirm(
              gettext('Refresh required'),
              gettext('A page refresh is required. Do you wish to refresh the page now?'),
              () => {
                reloadPgAdmin();
                return true;
              },
              () => { }, // Close modal if user opts for "Later"
              gettext('Refresh'),
              gettext('Later')
            );
          }
        }
        preferencesStore.cache(); // Refresh preferences cache
        await fetchPreferences();
      } catch (err) {
        pgAdmin.Browser.notifier.alert(err.response?.data || err.message || gettext('Failed to save preferences.'));
      }
    };

    if (layoutPref && layoutPref.value === 'classic') {
      pgAdmin.Browser.notifier.confirm(
        gettext('Layout changed'),
        `${gettext('Switching from Workspace to Classic layout will disconnect all server connections and refresh the entire page.')}
         ${gettext('To avoid losing unsaved data, click Cancel to manually review and close your connections.')}
         ${gettext('Note that if you choose Cancel, any changes to your preferences will not be saved.')}<br><br>
         ${gettext('Do you want to continue?')}`,
        () => saveData(true), // User confirms, proceed with reload
        () => false, // User cancels, do nothing
        gettext('Continue'),
        gettext('Cancel')
      );
    } else {
      await saveData();
    }
  };

  const resetAllPreferences = () => {
    showResetPrefModal(api, pgAdmin, preferencesStore, ()=>{
      fetchPreferences();
    });
  };

  const filteredList = useFuzzySearchList({
    strategy: 'off',
    queryText: searchVal,
    getText: (item) => [item.label, item.helpMessage],
    list: prefSchema.current.schemaFields,
    mapResultItem: ({ item }) => item
  });

  const filteredItemIds = useMemo(()=>filteredList.map((item) => item.id), [filteredList]);

  return (
    <Root height={'100%'}>
      <Box className='PreferencesComponent-header'>
        <Box className='PreferencesComponent-actionBtn'>
          <PgButtonGroup>
            <PgIconButton
              icon={<SaveSharpIcon style={{height: '1.4rem'}}/>}
              aria-label="Save"
              title={gettext('Save')}
              onClick={savePreferences}
              disabled={disableSave || Boolean(loaderText)}
            />
          </PgButtonGroup>
          <PgButtonGroup>
            <PgIconButton
              onClick={resetAllPreferences}
              icon={<SettingsBackupRestoreIcon />}
              aria-label="Reset all preferences"
              title={gettext('Reset all preferences')}
            />
            <PgIconButton
              data-test="dialog-help" onClick={()=>{
                window.open(url_for('help.static', { filename: 'preferences.html' }), 'pgadmin_help');
              }}
              icon={<HelpIcon />} title={gettext('Help')}
            />
          </PgButtonGroup>
        </Box>
        <InputText
          className='PreferencesComponent-searchInput'
          placeholder={gettext('Search')}
          controlProps={{ title: gettext('Search') }}
          value={searchVal}
          onChange={setSearchVal} // Direct setter for state
          startAdornment={<SearchRounded />}
        />
      </Box>
      <Box className='PreferencesComponent-body'>
        <Loader message={loaderText} />
        <div className='PreferencesComponent-bodyWrap'>
          <LeftTree
            prefTreeData={prefTreeData}
            selectedItem={selectedItem}
            setSelectedItem={setSelectedItem}
            filteredList={filteredList}
          />
          {
            prefSchema.current &&
            <RightPreference
              key={valuesVersionRef.current}
              schema={prefSchema.current}
              initValues={initValues}
              filteredItemIds={filteredItemIds}
              selectedItem={selectedItem}
              setSelectedItem={setSelectedItem}
              onDataChange={(changedData) => {
                setDisableSave(Object.keys(changedData).length === 0);
                prefChangedData.current = changedData;
              }}
            />
          }
        </div>
      </Box >
    </Root>
  );
}

PreferencesComponent.propTypes = {
  panelId: PropTypes.string.isRequired,
};
