/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import _ from 'lodash';
import { styled } from '@mui/material/styles';
import PropTypes from 'prop-types';

import React, { useState, useRef, useContext, useEffect } from 'react';

import gettext from 'sources/gettext';

import { Box } from '@mui/material';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import FeaturedPlayListRoundedIcon from '@mui/icons-material/FeaturedPlayListRounded';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

import { DefaultButton, PgButtonGroup, PgIconButton, PrimaryButton } from '../../../../../static/js/components/Buttons';
import { FilterIcon } from '../../../../../static/js/components/ExternalIcon';
import { PgMenu, PgMenuItem, usePgMenuGroup } from '../../../../../static/js/components/Menu';
import { FILTER_NAME, MENUS, MENUS_COMPARE_CONSTANT, SCHEMA_DIFF_EVENT, IGNORE_OPTION } from '../SchemaDiffConstants';
import { SchemaDiffContext, SchemaDiffEventsContext } from './SchemaDiffComponent';


const Root = styled('div')(({theme}) => ({
  display: 'flex',
  justifyContent: 'flex-end',
  '& .SchemaDiffButtons-compareBtn': {
    display: 'flex',
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingLeft: '1.5rem',
    [theme.breakpoints.down('sm')]: {
      paddingTop: '0.3rem',
    },
  },
  '& .SchemaDiffButtons-scriptBtn': {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingRight: '0.3rem',
    [theme.breakpoints.down('sm')]: {
      paddingTop: '0.3rem',
      flexGrow: 1,
    },
  },
  '&.SchemaDiffButtons-filterBtn': {
    [theme.breakpoints.down('sm')]: {
      paddingTop: '0.3rem',
      flexGrow: 1,
    },
    '& .SchemaDiffButtons-noactionBtn': {
      cursor: 'default',
      '&:hover': {
        backgroundColor: 'inherit',
        cursor: 'default'
      }
    },
  },
}));

export function SchemaDiffButtonComponent({ sourceData, targetData, selectedRowIds, onServerSchemaChange, rows, compareParams, filterParams = [FILTER_NAME.DIFFERENT, FILTER_NAME.SOURCE_ONLY, FILTER_NAME.TARGET_ONLY] }) {
  const filterRef = useRef(null);
  const compareRef = useRef(null);

  const eventBus = useContext(SchemaDiffEventsContext);
  const schemaDiffCtx = useContext(SchemaDiffContext);

  const [selectedFilters, setSelectedFilters] = useState(filterParams);
  const [selectedCompare, setSelectedCompare] = useState([]);
  const [isDisableCompare, setIsDisableCompare] = useState(true);

  const { openMenuName, toggleMenu, onMenuClose } = usePgMenuGroup();

  useEffect(() => {
    let isDisableComp = true;
    if (sourceData.sid != null && sourceData.did != null && targetData.sid != null && targetData.did != null) {
      if (!((sourceData.scid != null && targetData.scid == null) || (sourceData.scid == null && targetData.scid != null))) {
        isDisableComp = false;
      }
    }
    setIsDisableCompare(isDisableComp);
  }, [sourceData, targetData]);

  useEffect(() => {
    let prefCompareOptions = [];

    if (!_.isUndefined(compareParams)) {
      compareParams.ignoreOwner && prefCompareOptions.push(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_OWNER);
      compareParams.ignoreWhitespaces && prefCompareOptions.push(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_WHITESPACE);
      compareParams.ignoreTablespace && prefCompareOptions.push(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_TABLESPACE);
      compareParams.ignoreGrants && prefCompareOptions.push(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_GRANTS);
      setSelectedCompare(prefCompareOptions);
    } else {
      schemaDiffCtx?.preferences_schema_diff?.ignore_owner && prefCompareOptions.push(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_OWNER);
      schemaDiffCtx?.preferences_schema_diff?.ignore_whitespaces && prefCompareOptions.push(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_WHITESPACE);
      schemaDiffCtx?.preferences_schema_diff?.ignore_tablespace && prefCompareOptions.push(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_TABLESPACE);
      schemaDiffCtx?.preferences_schema_diff?.ignore_grants && prefCompareOptions.push(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_GRANTS);
      setSelectedCompare(prefCompareOptions);
    }
  }, [schemaDiffCtx.preferences_schema_diff]);


  const selectFilterOption = (option) => {
    let newOptions = [];
    setSelectedFilters((prev) => {
      let newSelectdOptions = [...prev];
      let removeIndex = newSelectdOptions.indexOf(option);
      if (prev.includes(option)) {
        newSelectdOptions.splice(removeIndex, 1);
      } else {
        newSelectdOptions.push(option);
      }
      newOptions = [...newSelectdOptions];
      return newSelectdOptions;
    });

    let filterParam = newOptions;
    eventBus.fireEvent(SCHEMA_DIFF_EVENT.TRIGGER_CHANGE_FILTER, { filterParams: filterParam });
  };

  const selectCompareOption = (option) => {
    setSelectedCompare((prev) => {
      let newSelectdOptions = [...prev];
      let removeIndex = newSelectdOptions.indexOf(option);
      if (prev.includes(option)) {
        newSelectdOptions.splice(removeIndex, 1);
      } else {
        newSelectdOptions.push(option);
      }
      return newSelectdOptions;
    });
  };

  const compareDiff = () => {
    let compareParam = {
      'ignoreOwner': selectedCompare.includes(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_OWNER) ? 1 : 0,
      'ignoreWhitespaces': selectedCompare.includes(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_WHITESPACE) ? 1 : 0,
      'ignoreTablespace': selectedCompare.includes(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_TABLESPACE) ? 1 : 0,
      'ignoreGrants': selectedCompare.includes(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_GRANTS) ? 1 : 0,
    };
    let filterParam = selectedFilters;
    eventBus.fireEvent(SCHEMA_DIFF_EVENT.TRIGGER_COMPARE_DIFF, { sourceData, targetData, compareParams: compareParam, filterParams: filterParam });
    eventBus.fireEvent(SCHEMA_DIFF_EVENT.TRIGGER_CHANGE_RESULT_SQL, {
      sourceSQL: null,
      targetSQL: null,
      SQLdiff: null,
    });
    onServerSchemaChange();
  };

  const generateScript = () => {
    eventBus.fireEvent(SCHEMA_DIFF_EVENT.TRIGGER_GENERATE_SCRIPT, { sid: targetData.sid, did: targetData.did, selectedIds: selectedRowIds, rows: rows, selectedFilters: selectedFilters });
  };

  return (
    (<Root>
      <Box className='SchemaDiffButtons-compareBtn'>
        <PgButtonGroup size="small" disabled={isDisableCompare}>
          <PrimaryButton startIcon={<CompareArrowsRoundedIcon />}
            onClick={compareDiff}>{gettext('Compare')}</PrimaryButton>
          <PgIconButton title={gettext('Compare')} disabled={isDisableCompare} icon={<KeyboardArrowDownIcon />} color={'primary'} splitButton
            name={MENUS.COMPARE} ref={compareRef} onClick={toggleMenu} ></PgIconButton>
        </PgButtonGroup>
      </Box>
      <Box className='SchemaDiffButtons-scriptBtn'>
        <PgButtonGroup size="small" disabled={selectedRowIds?.length <= 0}>
          <DefaultButton startIcon={<FeaturedPlayListRoundedIcon />} onClick={generateScript}>{gettext('Generate Script')}</DefaultButton>
        </PgButtonGroup>
      </Box>
      <Box className='SchemaDiffButtons-filterBtn'>
        <PgButtonGroup size="small" disabled={isDisableCompare} style={{ paddingRight: '0.3rem' }}>
          <DefaultButton startIcon={<FilterIcon />} className='SchemaDiffButtons-noactionBtn'
          >{gettext('Filter')}</DefaultButton>
          <PgIconButton title={gettext('Filter')} disabled={isDisableCompare} icon={<KeyboardArrowDownIcon />} splitButton
            name={MENUS.FILTER} ref={filterRef} onClick={toggleMenu} ></PgIconButton>
        </PgButtonGroup>
      </Box>
      <PgMenu
        anchorRef={compareRef}
        open={openMenuName == MENUS.COMPARE}
        onClose={onMenuClose}
        label={gettext('Compare')}
        align="end"
      >
        <PgMenuItem hasCheck checked={selectedCompare.includes(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_OWNER)}
          onClick={() => { selectCompareOption(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_OWNER); }}>{IGNORE_OPTION.OWNER}</PgMenuItem>
        <PgMenuItem hasCheck checked={selectedCompare.includes(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_WHITESPACE)}
          onClick={() => { selectCompareOption(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_WHITESPACE); }}>{IGNORE_OPTION.WHITESPACE}</PgMenuItem>
        <PgMenuItem hasCheck checked={selectedCompare.includes(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_TABLESPACE)}
          onClick={() => { selectCompareOption(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_TABLESPACE); }}>{IGNORE_OPTION.TABLESPACE}</PgMenuItem>
        <PgMenuItem hasCheck checked={selectedCompare.includes(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_GRANTS)}
          onClick={() => { selectCompareOption(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_GRANTS); }}>{IGNORE_OPTION.GRANTS}</PgMenuItem>
      </PgMenu>
      <PgMenu
        anchorRef={filterRef}
        open={openMenuName == MENUS.FILTER}
        onClose={onMenuClose}
        label={gettext('Filter')}
        align="end"
      >
        <PgMenuItem hasCheck checked={selectedFilters.includes(FILTER_NAME.IDENTICAL)}
          onClick={() => { selectFilterOption(FILTER_NAME.IDENTICAL); }}>{FILTER_NAME.IDENTICAL}</PgMenuItem>
        <PgMenuItem hasCheck checked={selectedFilters.includes(FILTER_NAME.DIFFERENT)}
          onClick={() => { selectFilterOption(FILTER_NAME.DIFFERENT); }}>{FILTER_NAME.DIFFERENT}</PgMenuItem>
        <PgMenuItem hasCheck checked={selectedFilters.includes(FILTER_NAME.SOURCE_ONLY)}
          onClick={() => { selectFilterOption(FILTER_NAME.SOURCE_ONLY); }}>{FILTER_NAME.SOURCE_ONLY}</PgMenuItem>
        <PgMenuItem hasCheck checked={selectedFilters.includes(FILTER_NAME.TARGET_ONLY)}
          onClick={() => { selectFilterOption(FILTER_NAME.TARGET_ONLY); }}>{FILTER_NAME.TARGET_ONLY}</PgMenuItem>
      </PgMenu>
    </Root>)
  );
}

SchemaDiffButtonComponent.propTypes = {
  sourceData: PropTypes.object,
  targetData: PropTypes.object,
  selectedRowIds: PropTypes.array,
  onServerSchemaChange:PropTypes.func,
  rows: PropTypes.array,
  compareParams: PropTypes.object,
  filterParams: PropTypes.array
};
