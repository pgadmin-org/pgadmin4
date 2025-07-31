/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { usePgAdmin } from '../../PgAdminProvider';
import { Box, styled } from '@mui/material';
import { DefaultButton, PrimaryButton } from '../../components/Buttons';
import gettext from 'sources/gettext';
import { FormInputSelect, FormNote } from '../../components/FormComponents';
import getApiInstance, { parseApiError } from '../../api_instance';
import url_for from 'sources/url_for';
import Loader from '../../components/Loader';

const ObjectExplorerFilterRoot = styled('div')(({ theme }) => ({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  display: 'flex',
  backgroundColor: theme.palette.background.paper,
  padding: '8px',
  flexDirection: 'column',
  gap: '8px',
  ...theme.mixins.panelBorder?.bottom,
}));


export default function ObjectExplorerFilter() {
  const [open, setOpen] = useState(false);
  const appliedFiltersRef = useRef(null);
  const [currFilter, setCurrFilter] = useState({
    tags: [],
  });
  const [loadingText, setLoadingText] = useState('');
  const api = useMemo(()=>getApiInstance(), []);
  const pgAdmin = usePgAdmin();
  const firstEleRef = useRef(null);
  const openServersRef = useRef({});

  const onClose = ()=>{
    setOpen(false);
  };

  const updateAppliedFilters = (filters) => {
    appliedFiltersRef.current = filters;
    const hasFilters = filters?.tags?.length > 0;
    pgAdmin.Browser.Events.trigger('pgadmin:object-explorer:filter:apply', hasFilters);
  };

  const fetchFilter = async () => {
    try {
      setLoadingText(gettext('Loading...'));
      const {data: resp} = await api.get(url_for('settings.object_explorer_filter'));
      setCurrFilter(resp.data.result);
      updateAppliedFilters(resp.data.result);
    } catch(error) {
      console.error('Error fetching object explorer filter:', error);
    }
    setLoadingText('');
  };

  const applyFilter = async () => {
    try {
      setLoadingText(gettext('Applying filter...'));
      await api.put(url_for('settings.object_explorer_filter'), currFilter);
      updateAppliedFilters(currFilter);

      // Save the state of the browser tree
      await pgAdmin.Browser.browserTreeState.save_state();

      // register to add event to open the server
      const deregister = pgAdmin.Browser.Events.on('pgadmin-browser:tree:added', async (item, d)=>{
        if(d._type == 'server' && openServersRef.current[d._id]) {
          delete openServersRef.current[d._id];
          await pgAdmin.Browser.tree.ensureLoaded(item);
          await pgAdmin.Browser.tree.open(item);
        }
        if(Object.keys(openServersRef.current).length === 0) {
          // all servers are opened, deregister the event to avoid unnecessary calls
          deregister();
        };
      });

      // lets do one server group at a time
      (pgAdmin.Browser.tree.children()||[]).forEach(async (serverGroup)=>{
        // restore tree state works after a server is opened
        // We will note server open state here before refreshing
        pgAdmin.Browser.tree.children(serverGroup).forEach((server)=>{
          const serverData = server._metadata.data;
          if(pgAdmin.Browser.tree.isOpen(server)) {
            openServersRef.current[serverData._id] = serverData._id;
          } else {
            delete openServersRef.current[serverData._id];
          }
        });

        // refresh the server group to apply the filter
        await pgAdmin.Browser.tree.refresh(serverGroup);
      });
      setLoadingText('');
      onClose();
    } catch(error) {
      console.error('Error applying object explorer filter:', error);
      pgAdmin.Browser.notifier.error(parseApiError(error));
      setLoadingText('');
    }
  };

  const onChange = (v) => {
    setCurrFilter((prev)=>({...prev, tags: v}));
  };

  useEffect(()=>{
    fetchFilter();
    const deregister = pgAdmin.Browser.Events.on('pgadmin:object-explorer:filter:show', ()=>{
      setOpen(true);
    });
    return ()=>{
      deregister();
    };
  }, []);

  useEffect(()=>{
    if(!open) return;
    setCurrFilter(appliedFiltersRef.current);
  }, [open]);

  useLayoutEffect(()=>{
    if(!open) return;
    // Focus on the first element when the filter is opened
    firstEleRef.current?.focus();
  }, [open]);

  if(!open) {
    return <></>;
  }

  return (
    <ObjectExplorerFilterRoot sx={{ display: open ? 'flex' : 'none' }}>
      <Loader message={loadingText} />
      <FormInputSelect inputRef={firstEleRef} label={gettext('Tags')} controlProps={{
        multiple: true,
        allowClear: true,
        creatable: true,
        noDropdown: true,
      }} value={currFilter.tags} onChange={onChange} placeholder={gettext('Specify the tags...')} />
      <FormNote text={gettext('Applying the filter will only hide the servers from view, it won\'t close any active connections.')} />
      <Box sx={{display: 'flex', justifyContent: 'flex-end'}}>
        <DefaultButton size="small" onClick={()=>onClose()}>Close</DefaultButton>
        <PrimaryButton size="small" onClick={applyFilter} sx={{marginLeft: '8px'}}>Apply</PrimaryButton>
      </Box>
    </ObjectExplorerFilterRoot>
  );
}
