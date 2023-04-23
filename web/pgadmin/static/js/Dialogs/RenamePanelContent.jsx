/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

import { Box } from '@material-ui/core';
import CloseIcon from '@material-ui/icons/CloseRounded';
import CheckRoundedIcon from '@material-ui/icons/CheckRounded';

import pgAdmin from 'sources/pgadmin';
import gettext from 'sources/gettext';

import { DefaultButton, PrimaryButton } from '../components/Buttons';
import { useModalStyles } from '../helpers/ModalProvider';
import { FormFooterMessage, InputText, MESSAGE_TYPE } from '../components/FormComponents';
import { setDebuggerTitle } from '../../../tools/debugger/static/js/debugger_utils';
import * as queryToolPanelTitleFunc from '../../../tools/sqleditor/static/js/sqleditor_title';
import * as queryToolPanelViewDataFunc from '../../../tools/sqleditor/static/js/show_view_data';

export default function RenamePanelContent({ closeModal, panel, title, preferences, setHeight, tabType, data }) {
  const classes = useModalStyles();
  const containerRef = useRef();
  const firstEleRef = useRef();
  const okBtnRef = useRef();
  const [formData, setFormData] = useState({
    title: title
  });

  const onTextChange = (e, id) => {
    let val = e;
    if (e && e.target) {
      val = e.target.value;
    }
    setFormData((prev) => ({ ...prev, [id]: val }));
  };

  const onKeyDown = (e) => {
    // If enter key is pressed then click on OK button
    if (e.key === 'Enter') {
      okBtnRef.current?.click();
    }
  };

  useEffect(() => {
    setTimeout(() => {
      firstEleRef.current && firstEleRef.current.focus();
    }, 350);
  }, [firstEleRef.current]);

  useEffect(() => {
    setHeight?.(containerRef.current?.offsetHeight);
    let focusTimeout = setTimeout(() => {
      firstEleRef.current && firstEleRef.current.focus();
    }, 150);
    
    return () => clearTimeout(focusTimeout);
  }, [containerRef.current, firstEleRef.current, formData]);

  return (
    <Box display="flex" flexDirection="column" className={classes.container} ref={containerRef}>
      <Box flexGrow="1" p={2}>

        <Box marginTop='12px'>
          <InputText inputRef={firstEleRef} type="text" value={formData['title']} controlProps={{ maxLength: null }}
            onChange={(e) => onTextChange(e, 'title')} onKeyDown={(e) => onKeyDown(e)} />
        </Box>

        <FormFooterMessage type={MESSAGE_TYPE.ERROR} message={formData['title'].length == 0 ? gettext('Title cannot be empty') : ''} closable={false} style={{
          position: 'unset', padding: '12px 0px 0px'
        }} />
      </Box>
      <Box className={classes.footer}>
        <DefaultButton data-test="close" startIcon={<CloseIcon />} onClick={() => {
          closeModal();
        }} >{gettext('Cancel')}</DefaultButton>
        <PrimaryButton ref={okBtnRef} data-test="save" className={classes.margin} disabled={formData['title'].length == 0 ? true : false} startIcon={<CheckRoundedIcon />} onClick={() => {
          if (tabType == 'debugger') {
            setDebuggerTitle(panel, preferences, data.function_name, data.schema_name, data.database_name, _.escape(formData['title']), pgAdmin.Browser);
          } else if (tabType == 'querytool') {
            let selected_item = pgAdmin.Browser.tree.selected();
            let panel_titles = '';

            if (data.is_query_tool) {
              panel_titles = queryToolPanelTitleFunc.getPanelTitle(pgAdmin.Browser, selected_item, formData['title']);
            } else {
              panel_titles = queryToolPanelViewDataFunc.generateViewDataTitle(pgAdmin.Browser, selected_item, formData['title']);
            }
            // Set title to the selected tab.
            if (data.is_dirty_editor) {
              panel_titles = panel_titles + ' *';
            }
            queryToolPanelTitleFunc.setQueryToolDockerTitle(panel, data.is_query_tool, panel_titles, data.is_file);
          } else {
            panel.title(_.escape(formData.title));
          }
          closeModal();
        }} >{gettext('OK')}</PrimaryButton>
      </Box>
    </Box>
  );
}

RenamePanelContent.propTypes = {
  closeModal: PropTypes.func,
  data: PropTypes.object,
  setHeight: PropTypes.func,
  panel: PropTypes.object,
  title: PropTypes.string,
  preferences: PropTypes.object,
  tabType: PropTypes.string,
  'panel.title': PropTypes.string,
};
