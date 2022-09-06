/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2022, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, {useCallback, useEffect, useState} from 'react';
import { makeStyles } from '@material-ui/styles';
import { Box } from '@material-ui/core';
import { PgButtonGroup, PgIconButton } from '../../../../../../static/js/components/Buttons';
import FolderRoundedIcon from '@material-ui/icons/FolderRounded';
import KeyboardArrowDownIcon from '@material-ui/icons/KeyboardArrowDown';
import SaveRoundedIcon from '@material-ui/icons/SaveRounded';
import HelpIcon from '@material-ui/icons/HelpRounded';
import ZoomInIcon from '@material-ui/icons/ZoomIn';
import ZoomOutIcon from '@material-ui/icons/ZoomOut';
import ZoomOutMapIcon from '@material-ui/icons/ZoomOutMap';
import AddBoxIcon from '@material-ui/icons/AddBox';
import EditRoundedIcon from '@material-ui/icons/EditRounded';
import FileCopyRoundedIcon from '@material-ui/icons/FileCopyRounded';
import DeleteIcon from '@material-ui/icons/Delete';
import NoteRoundedIcon from '@material-ui/icons/NoteRounded';
import VisibilityRoundedIcon from '@material-ui/icons/VisibilityRounded';
import VisibilityOffRoundedIcon from '@material-ui/icons/VisibilityOffRounded';
import ImageRoundedIcon from '@material-ui/icons/ImageRounded';

import { PgMenu, PgMenuItem, usePgMenuGroup } from '../../../../../../static/js/components/Menu';
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import PropTypes from 'prop-types';
import { ERD_EVENTS } from '../ERDConstants';
import { MagicIcon, SQLFileIcon } from '../../../../../../static/js/components/ExternalIcon';
import { useModal } from '../../../../../../static/js/helpers/ModalProvider';

const useStyles = makeStyles((theme)=>({
  root: {
    padding: '2px 4px',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    backgroundColor: theme.otherVars.editorToolbarBg,
    flexWrap: 'wrap',
    ...theme.mixins.panelBorder.bottom,
  },
  connectionButton: {
    display: 'flex',
    width: '450px',
    backgroundColor: theme.palette.default.main,
    color: theme.palette.default.contrastText,
    border: '1px solid ' + theme.palette.default.borderColor,
    justifyContent: 'flex-start',
  },
}));

export function MainToolBar({preferences, eventBus}) {
  const classes = useStyles();
  const [buttonsDisabled, setButtonsDisabled] = useState({
    'save': true,
    'edit-table': true,
    'clone-table': true,
    'one-to-many': true,
    'many-to-many': true,
    'show-note': true,
    'drop-table': true,
  });
  const [showDetails, setShowDetails] = useState(true);

  const {openMenuName, toggleMenu, onMenuClose} = usePgMenuGroup();
  const saveAsMenuRef = React.useRef(null);
  const isDirtyRef = React.useRef(null);
  const modal = useModal();

  const setDisableButton = useCallback((name, disable=true)=>{
    setButtonsDisabled((prev)=>({...prev, [name]: disable}));
  }, []);

  const onHelpClick=()=>{
    let url = url_for('help.static', {'filename': 'erd_tool.html'});
    window.open(url, 'pgadmin_help');
  };
  const confirmDiscard=(callback, checkSaved=false)=>{
    if(checkSaved && buttonsDisabled['save']) {
      /* No need to check  */
      callback();
      return;
    }
    modal.confirm(
      gettext('Unsaved changes'),
      gettext('Are you sure you wish to discard the current changes?'),
      function() {
        callback();
      },
      function() {
        return true;
      }
    );
  };

  useEffect(()=>{
    const events = [
      [ERD_EVENTS.SINGLE_NODE_SELECTED, (selected)=>{
        setDisableButton('edit-table', !selected);
        setDisableButton('clone-table', !selected);
        setDisableButton('one-to-many', !selected);
        setDisableButton('many-to-many', !selected);
        setDisableButton('show-note', !selected);
      }],
      [ERD_EVENTS.ANY_ITEM_SELECTED, (selected)=>{
        setDisableButton('drop-table', !selected);
      }],
      [ERD_EVENTS.DIRTY, (isDirty)=>{
        isDirtyRef.current = isDirty;
        setDisableButton('save', !isDirty);
      }],
    ];
    events.forEach((e)=>{
      eventBus.registerListener(e[0], e[1]);
    });
    return ()=>{
      events.forEach((e)=>{
        eventBus.deregisterListener(e[0], e[1]);
      });
    };
  }, []);

  return (
    <>
      <Box className={classes.root}>
        <PgButtonGroup size="small">
          <PgIconButton title={gettext('Load Project')} icon={<FolderRoundedIcon />}
            shortcut={preferences.open_project} onClick={()=>{
              confirmDiscard(()=>{
                eventBus.fireEvent(ERD_EVENTS.LOAD_DIAGRAM);
              }, true);
            }} />
          <PgIconButton title={gettext('Save Project')} icon={<SaveRoundedIcon />}
            shortcut={preferences.save_project} disabled={buttonsDisabled['save']}
            onClick={()=>{
              eventBus.fireEvent(ERD_EVENTS.SAVE_DIAGRAM);
            }} />
          <PgIconButton title={gettext('File')} icon={<KeyboardArrowDownIcon />} splitButton
            name="menu-saveas" ref={saveAsMenuRef} onClick={toggleMenu}
          />
        </PgButtonGroup>
        <PgButtonGroup size="small">
          <PgIconButton title={gettext('Generate SQL')} icon={<SQLFileIcon />}
            shortcut={preferences.generate_sql}
            onClick={()=>{
              eventBus.fireEvent(ERD_EVENTS.SHOW_SQL);
            }} />
          <PgIconButton title={gettext('Download image')} icon={<ImageRoundedIcon />}
            shortcut={preferences.download_image}
            onClick={()=>{
              eventBus.fireEvent(ERD_EVENTS.DOWNLOAD_IMAGE);
            }} />
        </PgButtonGroup>
        <PgButtonGroup size="small">
          <PgIconButton title={gettext('Add Table')} icon={<AddBoxIcon />}
            shortcut={preferences.add_table}
            onClick={()=>{
              eventBus.fireEvent(ERD_EVENTS.ADD_NODE);
            }} />
          <PgIconButton title={gettext('Edit Table')} icon={<EditRoundedIcon />}
            shortcut={preferences.edit_table} disabled={buttonsDisabled['edit-table']}
            onClick={()=>{
              eventBus.fireEvent(ERD_EVENTS.EDIT_NODE);
            }} />
          <PgIconButton title={gettext('Clone Table')} icon={<FileCopyRoundedIcon />}
            shortcut={preferences.clone_table} disabled={buttonsDisabled['clone-table']}
            onClick={()=>{
              eventBus.fireEvent(ERD_EVENTS.CLONE_NODE);
            }} />
          <PgIconButton title={gettext('Drop Table/Relation')} icon={<DeleteIcon />}
            shortcut={preferences.drop_table} disabled={buttonsDisabled['drop-table']}
            onClick={()=>{
              eventBus.fireEvent(ERD_EVENTS.DELETE_NODE);
            }} />
        </PgButtonGroup>
        <PgButtonGroup size="small">
          <PgIconButton title={gettext('One-to-Many Relation')} icon={<span style={{letterSpacing: '-1px'}}>1M</span>}
            shortcut={preferences.one_to_many} disabled={buttonsDisabled['one-to-many']}
            onClick={()=>{
              eventBus.fireEvent(ERD_EVENTS.ONE_TO_MANY);
            }} />
          <PgIconButton title={gettext('Many-to-Many Relation')} icon={<span style={{letterSpacing: '-1px'}}>MM</span>}
            shortcut={preferences.many_to_many} disabled={buttonsDisabled['many-to-many']}
            onClick={()=>{
              eventBus.fireEvent(ERD_EVENTS.MANY_TO_MANY);
            }} />
        </PgButtonGroup>
        <PgButtonGroup size="small">
          <PgIconButton title={gettext('Add/Edit Note')} icon={<NoteRoundedIcon />}
            shortcut={preferences.add_edit_note} disabled={buttonsDisabled['show-note']}
            onClick={()=>{
              eventBus.fireEvent(ERD_EVENTS.SHOW_NOTE);
            }} />
          <PgIconButton title={gettext('Auto Align')} icon={<MagicIcon />}
            shortcut={preferences.auto_align}
            onClick={()=>{
              eventBus.fireEvent(ERD_EVENTS.AUTO_DISTRIBUTE);
            }} />
          <PgIconButton title={gettext('Show Details')} icon={showDetails ? <VisibilityRoundedIcon /> : <VisibilityOffRoundedIcon />}
            shortcut={preferences.show_details}
            onClick={()=>{
              eventBus.fireEvent(ERD_EVENTS.TOGGLE_DETAILS);
              setShowDetails((prev)=>!prev);
            }} />
        </PgButtonGroup>
        <PgButtonGroup size="small">
          <PgIconButton title={gettext('Zoom In')} icon={<ZoomInIcon />}
            shortcut={preferences.zoom_in}
            onClick={()=>{
              eventBus.fireEvent(ERD_EVENTS.ZOOM_IN);
            }} />
          <PgIconButton title={gettext('Zoom to Fit')} icon={<ZoomOutMapIcon />}
            shortcut={preferences.zoom_to_fit}
            onClick={()=>{
              eventBus.fireEvent(ERD_EVENTS.ZOOM_FIT);
            }} />
          <PgIconButton title={gettext('Zoom Out')} icon={<ZoomOutIcon />}
            shortcut={preferences.zoom_out}
            onClick={()=>{
              eventBus.fireEvent(ERD_EVENTS.ZOOM_OUT);
            }}/>
        </PgButtonGroup>
        <PgButtonGroup size="small">
          <PgIconButton title={gettext('Help')} icon={<HelpIcon />} onClick={onHelpClick} />
        </PgButtonGroup>
      </Box>
      <PgMenu
        anchorRef={saveAsMenuRef}
        open={openMenuName=='menu-saveas'}
        onClose={onMenuClose}
        label={gettext('File Menu')}
      >
        <PgMenuItem onClick={()=>{
          eventBus.fireEvent(ERD_EVENTS.SAVE_DIAGRAM, true);
        }}>{gettext('Save as')}</PgMenuItem>
      </PgMenu>
    </>
  );
}

MainToolBar.propTypes = {
  preferences: PropTypes.object,
  eventBus: PropTypes.object,
};
