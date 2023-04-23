/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import _ from 'lodash';
import PropTypes from 'prop-types';

import React, { useState, useRef, useContext, useEffect } from 'react';

import gettext from 'sources/gettext';

import { Box } from '@material-ui/core';
import CompareArrowsRoundedIcon from '@material-ui/icons/CompareArrowsRounded';
import FeaturedPlayListRoundedIcon from '@material-ui/icons/FeaturedPlayListRounded';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import CheckRoundedIcon from '@material-ui/icons/CheckRounded';
import { makeStyles } from '@material-ui/styles';

import { DefaultButton, PgButtonGroup, PgIconButton, PrimaryButton } from '../../../../../static/js/components/Buttons';
import { FilterIcon } from '../../../../../static/js/components/ExternalIcon';
import { PgMenu, PgMenuItem, usePgMenuGroup } from '../../../../../static/js/components/Menu';
import { FILTER_NAME, MENUS, MENUS_COMPARE_CONSTANT, SCHEMA_DIFF_EVENT } from '../SchemaDiffConstants';
import { SchemaDiffContext, SchemaDiffEventsContext } from './SchemaDiffComponent';


const useStyles = makeStyles((theme) => ({
  emptyIcon: {
    width: '1.5rem'
  },
  diff_btn: {
    marginRight: '1rem'
  },
  noactionBtn: {
    cursor: 'default',
    '&:hover': {
      backgroundColor: 'inherit',
      cursor: 'default'
    }
  },
  scriptBtn: {
    display: 'flex',
    justifyContent: 'flex-end',
    paddingRight: '0.3rem',
    [theme.breakpoints.down('sm')]: {
      paddingTop: '0.3rem',
      flexGrow: 1,
    },
  },
  filterBtn: {
    [theme.breakpoints.down('sm')]: {
      paddingTop: '0.3rem',
      flexGrow: 1,
    }
  },
  compareBtn: {
    display: 'flex',
    flexGrow: 1,
    justifyContent: 'flex-start',
    paddingLeft: '1.5rem',
    [theme.breakpoints.down('sm')]: {
      paddingTop: '0.3rem',
    },
  }
}));

export function SchemaDiffButtonComponent({ sourceData, targetData, selectedRowIds, rows, compareParams, filterParams = [FILTER_NAME.DIFFERENT, FILTER_NAME.SOURCE_ONLY, FILTER_NAME.TARGET_ONLY] }) {
  const classes = useStyles();

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
      isDisableComp = false;
    }
    setIsDisableCompare(isDisableComp);
  }, [sourceData, targetData]);

  useEffect(() => {
    let prefCompareOptions = [];

    if (!_.isUndefined(compareParams)) {
      compareParams.ignoreOwner && prefCompareOptions.push(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_OWNER);
      compareParams.ignoreWhitespaces && prefCompareOptions.push(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_WHITESPACE);
      setSelectedCompare(prefCompareOptions);
    } else {
      schemaDiffCtx?.preferences_schema_diff?.ignore_owner && prefCompareOptions.push(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_OWNER);
      schemaDiffCtx?.preferences_schema_diff?.ignore_whitespaces && prefCompareOptions.push(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_WHITESPACE);
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
    };
    let filterParam = selectedFilters;
    eventBus.fireEvent(SCHEMA_DIFF_EVENT.TRIGGER_COMPARE_DIFF, { sourceData, targetData, compareParams: compareParam, filterParams: filterParam });
    eventBus.fireEvent(SCHEMA_DIFF_EVENT.TRIGGER_CHANGE_RESULT_SQL, {
      sourceSQL: null,
      targetSQL: null,
      SQLdiff: null,
    });
  };

  const generateScript = () => {
    eventBus.fireEvent(SCHEMA_DIFF_EVENT.TRIGGER_GENERATE_SCRIPT, { sid: targetData.sid, did: targetData.did, selectedIds: selectedRowIds, rows: rows });
  };

  return (
    <>
      <Box className={classes.compareBtn}>
        <PgButtonGroup size="small" disabled={isDisableCompare}>
          <PrimaryButton startIcon={<CompareArrowsRoundedIcon />}
            onClick={compareDiff}>{gettext('Compare')}</PrimaryButton>
          <PgIconButton title={gettext('Compare')} icon={<KeyboardArrowDownIcon />} color={'primary'} splitButton
            name={MENUS.COMPARE} ref={compareRef} onClick={toggleMenu} ></PgIconButton>
        </PgButtonGroup>
      </Box>
      <Box className={classes.scriptBtn}>
        <PgButtonGroup size="small" disabled={selectedRowIds?.length > 0 ? false : true}>
          <DefaultButton startIcon={<FeaturedPlayListRoundedIcon />} onClick={generateScript}>{gettext('Generate Script')}</DefaultButton>
        </PgButtonGroup>
      </Box>
      <Box className={classes.filterBtn}>
        <PgButtonGroup size="small" disabled={isDisableCompare} style={{ paddingRight: '0.3rem' }}>
          <DefaultButton startIcon={<FilterIcon />} className={classes.noactionBtn}
          >{gettext('Filter')}</DefaultButton>
          <PgIconButton title={gettext('File')} icon={<KeyboardArrowDownIcon />} splitButton
            name={MENUS.FILTER} ref={filterRef} onClick={toggleMenu} ></PgIconButton>
        </PgButtonGroup>
      </Box>
      <PgMenu
        anchorRef={compareRef}
        open={openMenuName == MENUS.COMPARE}
        onClose={onMenuClose}
        label={gettext('Compare')}
      >
        <PgMenuItem onClick={() => { selectCompareOption(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_OWNER); }}>
          {selectedCompare.includes(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_OWNER) ? <CheckRoundedIcon /> : <span className={classes.emptyIcon}></span>}{gettext('Ignore owner')}
        </PgMenuItem>
        <PgMenuItem onClick={() => { selectCompareOption(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_WHITESPACE); }}>
          {selectedCompare.includes(MENUS_COMPARE_CONSTANT.COMPARE_IGNORE_WHITESPACE) ? <CheckRoundedIcon /> : <span className={classes.emptyIcon}></span>}{gettext('Ignore whitespace')}
        </PgMenuItem>
      </PgMenu>
      <PgMenu
        anchorRef={filterRef}
        open={openMenuName == MENUS.FILTER}
        onClose={onMenuClose}
        label={gettext('Filter')}
      >
        <PgMenuItem onClick={() => { selectFilterOption(FILTER_NAME.IDENTICAL); }}>
          {selectedFilters.includes(FILTER_NAME.IDENTICAL) ? <CheckRoundedIcon /> : <span className={classes.emptyIcon}></span>} {gettext(FILTER_NAME.IDENTICAL)}
        </PgMenuItem>
        <PgMenuItem onClick={() => { selectFilterOption(FILTER_NAME.DIFFERENT); }}>
          {selectedFilters.includes(FILTER_NAME.DIFFERENT) ? <CheckRoundedIcon /> : <span className={classes.emptyIcon}></span>} {gettext(FILTER_NAME.DIFFERENT)}
        </PgMenuItem>
        <PgMenuItem onClick={() => { selectFilterOption(FILTER_NAME.SOURCE_ONLY); }}>
          {selectedFilters.includes(FILTER_NAME.SOURCE_ONLY) ? <CheckRoundedIcon /> : <span className={classes.emptyIcon}></span>} {gettext(FILTER_NAME.SOURCE_ONLY)}
        </PgMenuItem>
        <PgMenuItem onClick={() => { selectFilterOption(FILTER_NAME.TARGET_ONLY); }}>
          {selectedFilters.includes(FILTER_NAME.TARGET_ONLY) ? <CheckRoundedIcon /> : <span className={classes.emptyIcon}></span>} {gettext(FILTER_NAME.TARGET_ONLY)}
        </PgMenuItem>
      </PgMenu>
    </>
  );
}

SchemaDiffButtonComponent.propTypes = {
  sourceData: PropTypes.object,
  targetData: PropTypes.object,
  selectedRowIds: PropTypes.array,
  rows: PropTypes.array,
  compareParams: PropTypes.object,
  filterParams: PropTypes.array
};
