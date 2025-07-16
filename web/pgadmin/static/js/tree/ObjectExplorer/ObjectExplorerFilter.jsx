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
import { FormInputSelect } from '../../components/FormComponents';
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
      pgAdmin.Browser.tree.destroy();
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
      <FormInputSelect inputRef={firstEleRef} label={gettext('Server tags')} controlProps={{
        multiple: true,
        allowClear: true,
        creatable: true,
        noDropdown: true,
      }} value={currFilter.tags} onChange={onChange} />
      <Box sx={{display: 'flex', justifyContent: 'flex-end', marginTop: '8px'}}>
        <DefaultButton size="small" onClick={()=>onClose()}>Close</DefaultButton>
        <PrimaryButton size="small" onClick={applyFilter} sx={{marginLeft: '8px'}}>Apply</PrimaryButton>
      </Box>
    </ObjectExplorerFilterRoot>
  );
}
