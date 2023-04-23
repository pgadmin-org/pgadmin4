/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { makeStyles } from '@material-ui/core';
import _ from 'lodash';
import React from 'react';
import { InputCheckbox, InputText } from './FormComponents';
import clsx from 'clsx';
import PropTypes from 'prop-types';

const useStyles = makeStyles(()=>({
  /* Display the privs table only when focussed */
  root: {
    '&:not(:focus-within) .priv-table': {
      display: 'none',
    }
  },
  table: {
    borderSpacing: 0,
    width: '100%',
    fontSize: '0.8em',
  },
  tableCell: {
    textAlign: 'left',
  }
}));

export default function Privilege({value, onChange, controlProps}) {
  // All available privileges in the PostgreSQL database server for
  // generating the label for the specific Control
  const LABELS = {
    'C': 'CREATE',
    'T': 'TEMPORARY',
    'c': 'CONNECT',
    'a': 'INSERT',
    'r': 'SELECT',
    'w': 'UPDATE',
    'd': 'DELETE',
    'D': 'TRUNCATE',
    'x': 'REFERENCES',
    't': 'TRIGGER',
    'U': 'USAGE',
    'X': 'EXECUTE',
  };
  let all = false;
  let allWithGrant = false;
  const classes = useStyles();
  let textValue = '';
  for(const v of value||[]) {
    if(v.privilege) {
      textValue += v.privilege_type;
      if(v.with_grant) {
        textValue += '*';
      }
    }
  }

  const checkboxId = _.uniqueId();
  /* Calculate the real display value by merging all supported privs with incoming value */
  const realVal = (controlProps?.supportedPrivs || []).map((priv)=>{
    let inValue = _.find(value, (v)=>v.privilege_type===priv) || {
      privilege: false, with_grant: false,
    };
    return {
      privilege_type: priv,
      privilege: Boolean(inValue.privilege),
      with_grant: Boolean(inValue.with_grant),
    };
  });

  const onCheckAll = (e, forWithGrant)=>{
    let newValue = [];
    /* Push all the privs or ignore if unchecked and return empty */
    realVal.forEach((v)=>{
      if(forWithGrant) {
        newValue.push({
          ...v,
          privilege: true,
          with_grant: e.target.checked,
        });
      } else if(e.target.checked) {
        newValue.push({
          ...v,
          privilege: e.target.checked,
        });
      }
    });
    onChange(newValue);
  };

  const onCheck = (e, forWithGrant)=>{
    let exists = false;
    let newValue = [];

    /* Calculate the newValue by pushing all selected and ignore if unchecked */
    (value||[]).forEach((v)=>{
      if(v.privilege_type === e.target.name) {
        exists = true;
        if(forWithGrant) {
          newValue.push({
            ...v,
            with_grant: e.target.checked,
          });
        }
      } else {
        newValue.push(v);
      }
    });

    if(!exists && e.target.checked) {
      newValue.push({
        privilege_type: e.target.name,
        privilege: e.target.checked,
        with_grant: false,
      });
    }

    onChange(newValue);
  };

  /* If all supported privs and incoming value length matches, clearly all are selected */
  all = (realVal.length === (value || []).length);
  allWithGrant = (realVal.length === (value || []).length) && (value || []).every((d)=>d.with_grant);

  return (
    <div className={classes.root}>
      <InputText value={textValue} readOnly/>
      <table className={clsx(classes.table, 'priv-table')} tabIndex="0">
        {(realVal.length > 1) && <thead>
          <tr>
            <td className={classes.tableCell}>
              <InputCheckbox name="all" controlProps={{label: 'ALL'}} id={checkboxId} size="small"
                onChange={(e)=>onCheckAll(e, false)} value={all}/>
            </td>
            <td className={classes.tableCell}>
              <InputCheckbox name="all" controlProps={{label: 'WITH GRANT OPTION'}} id={checkboxId} size="small"
                disabled={!all} onChange={(e)=>onCheckAll(e, true)} value={allWithGrant}/>
            </td>
          </tr>
        </thead>}
        <tbody>
          {
            realVal.map((d)=>{
              return (
                <tr key={d.privilege_type}>
                  <td className={classes.tableCell}>
                    <InputCheckbox name={d.privilege_type} controlProps={{label: LABELS[d.privilege_type]}}
                      id={checkboxId} value={Boolean(d.privilege)} size="small"
                      onChange={(e)=>onCheck(e, false)}/>
                  </td>
                  <td className={classes.tableCell}>
                    <InputCheckbox name={d.privilege_type} controlProps={{label: 'WITH GRANT OPTION'}}
                      id={checkboxId} value={Boolean(d.with_grant)} size="small" disabled={!d.privilege}
                      onChange={(e)=>onCheck(e, true)}/>
                  </td>
                </tr>
              );
            })
          }
        </tbody>
      </table>
    </div>
  );
}

Privilege.propTypes = {
  value: PropTypes.array,
  onChange: PropTypes.func,
  controlProps: PropTypes.object,
};
