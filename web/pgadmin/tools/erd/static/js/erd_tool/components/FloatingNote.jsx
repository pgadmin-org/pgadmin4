/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useEffect, useState, useMemo } from 'react';
import gettext from 'sources/gettext';
import PropTypes from 'prop-types';
import CustomPropTypes from 'sources/custom_prop_types';
import { Box, makeStyles, Popper } from '@material-ui/core';
import { DefaultButton } from '../../../../../../static/js/components/Buttons';
import CheckIcon from '@material-ui/icons/Check';


const useStyles = makeStyles((theme)=>({
  root: {
    width: '250px',
    marginLeft: '8px',
    ...theme.mixins.panelBorder.all,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
  },
  note: {
    padding: '4px',
    backgroundColor: theme.palette.primary.main,
    color: theme.palette.primary.contrastText,
    borderTopLeftRadius: 'inherit',
    borderTopRightRadius: 'inherit',
  },
  header: {
    padding: '4px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    ...theme.mixins.panelBorder.bottom,
  },
  textarea: {
    width: '100%',
    border: 0,
    display: 'block',
  },
  buttons: {
    padding: '4px',
    ...theme.mixins.panelBorder.top,
    textAlign: 'right',
  },
}));

export default function FloatingNote({open, onClose, anchorEl, rows, noteNode}) {
  const [text, setText] = useState('');
  const classes = useStyles();
  useEffect(()=>{
    if(noteNode) {
      setText(noteNode.getNote());
    }
  }, [noteNode]);

  const header = useMemo(()=>{
    if(noteNode) {
      let [schema, name] = noteNode.getSchemaTableName();
      return `${name} (${schema})`;
    }
    return '';
  }, [open]);

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      placement="right-start"
    >
      <Box className={classes.root}>
        <Box className={classes.note}>{gettext('Note')}:</Box>
        <Box className={classes.header}>{header}</Box>
        <textarea className={classes.textarea} autoFocus value={text} rows={rows} onChange={(e)=>setText(e.target.value)}/>
        <Box className={classes.buttons}>
          <DefaultButton startIcon={<CheckIcon />} onClick={()=>{
            let updated = (noteNode.getNote() != text);
            noteNode.setNote(text);
            if(onClose) onClose(updated);
          }}>{gettext('OK')}</DefaultButton>
        </Box>
      </Box>
    </Popper>
  );
}

FloatingNote.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  anchorEl: CustomPropTypes.ref,
  rows: PropTypes.number,
  noteNode: PropTypes.object,
};
