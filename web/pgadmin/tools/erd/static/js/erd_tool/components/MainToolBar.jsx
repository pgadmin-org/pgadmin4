/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, {useCallback, useEffect, useState} from 'react';
import { styled } from '@mui/material/styles';
import { Box, useTheme } from '@mui/material';
import { PgButtonGroup, PgIconButton } from '../../../../../../static/js/components/Buttons';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import SaveRoundedIcon from '@mui/icons-material/SaveRounded';
import HelpIcon from '@mui/icons-material/HelpRounded';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap';
import AddBoxIcon from '@mui/icons-material/AddBox';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import FileCopyRoundedIcon from '@mui/icons-material/FileCopyRounded';
import DeleteIcon from '@mui/icons-material/Delete';
import NoteRoundedIcon from '@mui/icons-material/NoteRounded';
import VisibilityRoundedIcon from '@mui/icons-material/VisibilityRounded';
import VisibilityOffRoundedIcon from '@mui/icons-material/VisibilityOffRounded';
import ImageRoundedIcon from '@mui/icons-material/ImageRounded';
import FormatColorFillRoundedIcon from '@mui/icons-material/FormatColorFillRounded';
import FormatColorTextRoundedIcon from '@mui/icons-material/FormatColorTextRounded';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';

import { PgMenu, PgMenuItem, usePgMenuGroup } from '../../../../../../static/js/components/Menu';
import gettext from 'sources/gettext';
import url_for from 'sources/url_for';
import PropTypes from 'prop-types';
import { ERD_EVENTS } from '../ERDConstants';
import { MagicIcon, SQLFileIcon } from '../../../../../../static/js/components/ExternalIcon';
import { useModal } from '../../../../../../static/js/helpers/ModalProvider';
import { withColorPicker } from '../../../../../../static/js/helpers/withColorPicker';

const StyledBox = styled(Box)(({theme}) => ({
  padding: '2px 4px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  backgroundColor: theme.otherVars.editorToolbarBg,
  flexWrap: 'wrap',
  ...theme.mixins.panelBorder.bottom,
}));

export function MainToolBar({preferences, eventBus, fillColor, textColor, notation, onNotationChange}) {
  const theme = useTheme();
  const [buttonsDisabled, setButtonsDisabled] = useState({
    'save': true,
    'edit-table': true,
    'clone-table': true,
    'one-to-one': true,
    'one-to-many': true,
    'many-to-many': true,
    'show-note': true,
    'drop-table': true,
  });
  const [showDetails, setShowDetails] = useState(true);

  const {openMenuName, toggleMenu, onMenuClose} = usePgMenuGroup();
  const saveAsMenuRef = React.useRef(null);
  const sqlMenuRef = React.useRef(null);
  const notationMenuRef = React.useRef(null);
  const isDirtyRef = React.useRef(null);
  const [checkedMenuItems, setCheckedMenuItems] = React.useState({});
  const modal = useModal();

  const setDisableButton = useCallback((name, disable=true)=>{
    setButtonsDisabled((prev)=>({...prev, [name]: disable}));
  }, []);

  const checkMenuClick = useCallback((e)=>{
    setCheckedMenuItems((prev)=>{
      let newVal = !prev[e.value];
      return {
        ...prev,
        [e.value]: newVal,
      };
    });
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
    if(preferences) {
      /* Get the prefs first time */
      if(_.isUndefined(checkedMenuItems.sql_with_drop)) {
        setCheckedMenuItems({
          sql_with_drop: preferences.sql_with_drop,
        });
      }
    }
  }, [preferences]);

  useEffect(()=>{
    const events = [
      [ERD_EVENTS.SINGLE_NODE_SELECTED, (selected)=>{
        setDisableButton('edit-table', !selected);
        setDisableButton('clone-table', !selected);
        setDisableButton('one-to-one', !selected);
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

  useEffect(()=>{
    const showSql = ()=>{
      eventBus.fireEvent(ERD_EVENTS.SHOW_SQL, checkedMenuItems['sql_with_drop']);
    };
    eventBus.registerListener(ERD_EVENTS.TRIGGER_SHOW_SQL, showSql);
    return ()=>{
      eventBus.deregisterListener(ERD_EVENTS.TRIGGER_SHOW_SQL, showSql);
    };
  }, [checkedMenuItems['sql_with_drop']]);

  return (
    (<>
      <StyledBox>
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
              eventBus.fireEvent(ERD_EVENTS.TRIGGER_SHOW_SQL);
            }} />
          <PgIconButton title={gettext('SQL Options')} icon={<KeyboardArrowDownIcon />} splitButton
            name="menu-sql" ref={sqlMenuRef} onClick={toggleMenu}
          />
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
              eventBus.fireEvent(ERD_EVENTS.ADD_NODE, {fillColor: fillColor, textColor: textColor});
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
          <PgIconButton title={gettext('One-to-One Relation')} icon={<span style={{letterSpacing: '-1px'}}>1 - 1</span>}
            shortcut={preferences.one_to_one} disabled={buttonsDisabled['one-to-one']}
            onClick={()=>{
              eventBus.fireEvent(ERD_EVENTS.ONE_TO_ONE);
            }} />
          <PgIconButton title={gettext('One-to-Many Relation')} icon={<span style={{letterSpacing: '-1px'}}>1 - M</span>}
            shortcut={preferences.one_to_many} disabled={buttonsDisabled['one-to-many']}
            onClick={()=>{
              eventBus.fireEvent(ERD_EVENTS.ONE_TO_MANY);
            }} />
          <PgIconButton title={gettext('Many-to-Many Relation')} icon={<span style={{letterSpacing: '-1px'}}>M - M</span>}
            shortcut={preferences.many_to_many} disabled={buttonsDisabled['many-to-many']}
            onClick={()=>{
              eventBus.fireEvent(ERD_EVENTS.MANY_TO_MANY);
            }} />
        </PgButtonGroup>
        <PgButtonGroup size="small">
          <ColorButton title={gettext('Fill Color')} icon={<FormatColorFillRoundedIcon />}
            value={fillColor ?? theme.palette.background.default} options={{
              allowSave: true,
            }}
            onSave={(val)=>{
              if(val) {
                eventBus.fireEvent(ERD_EVENTS.CHANGE_COLORS, val, textColor);
              } else {
                eventBus.fireEvent(ERD_EVENTS.CHANGE_COLORS, null, textColor);
              }
            }}/>
          <ColorButton title={gettext('Text Color')} icon={<FormatColorTextRoundedIcon />}
            value={textColor ?? theme.palette.text.primary} options={{
              allowSave: true,
            }}
            onSave={(val)=>{
              if(val) {
                eventBus.fireEvent(ERD_EVENTS.CHANGE_COLORS, fillColor, val);
              } else {
                eventBus.fireEvent(ERD_EVENTS.CHANGE_COLORS, fillColor, null);
              }
            }}/>
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
          <PgIconButton title={gettext('Cardinality Notation')} icon={
            <><AccountTreeOutlinedIcon /><KeyboardArrowDownIcon style={{marginLeft: '-10px'}} /></>}
          name="menu-notation" ref={notationMenuRef} onClick={toggleMenu} />
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
      </StyledBox>
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
      <PgMenu
        anchorRef={sqlMenuRef}
        open={openMenuName=='menu-sql'}
        onClose={onMenuClose}
        label={gettext('SQL Options')}
      >
        <PgMenuItem hasCheck value="sql_with_drop" checked={checkedMenuItems['sql_with_drop']} onClick={checkMenuClick}>{gettext('With DROP Table')}</PgMenuItem>
      </PgMenu>
      <PgMenu
        anchorRef={notationMenuRef}
        open={openMenuName=='menu-notation'}
        onClose={onMenuClose}
        label={gettext('Cardinality Notation')}

      >
        <PgMenuItem hasCheck closeOnCheck value="crows" checked={notation == 'crows'} onClick={onNotationChange}>{gettext('Crow\'s Foot Notation')}</PgMenuItem>
        <PgMenuItem hasCheck closeOnCheck value="chen" checked={notation == 'chen'} onClick={onNotationChange}>{gettext('Chen Notation')}</PgMenuItem>
      </PgMenu>
    </>)
  );
}

MainToolBar.propTypes = {
  preferences: PropTypes.object,
  eventBus: PropTypes.object,
  fillColor: PropTypes.string,
  textColor: PropTypes.string,
  notation: PropTypes.string,
  onNotationChange: PropTypes.func,
};

const ColorButton = withColorPicker(PgIconButton);
