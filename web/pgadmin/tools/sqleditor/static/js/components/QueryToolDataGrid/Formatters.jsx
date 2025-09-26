/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { useContext } from 'react';
import { styled } from '@mui/material/styles';
import _ from 'lodash';
import PropTypes from 'prop-types';
import gettext from 'sources/gettext';
import CustomPropTypes from '../../../../../../static/js/custom_prop_types';
import usePreferences from '../../../../../../preferences/static/js/store';
import GetAppRoundedIcon from '@mui/icons-material/GetAppRounded';
import { PgIconButton } from '../../../../../../static/js/components/Buttons';
import { QUERY_TOOL_EVENTS } from '../QueryToolConstants';
import { QueryToolEventsContext } from '../QueryToolComponent';

const StyledNullAndDefaultFormatter = styled(NullAndDefaultFormatter)(({theme}) => ({
  '& .Formatters-disabledCell': {
    opacity: theme.palette.action.disabledOpacity,
  }
}));

function NullAndDefaultFormatter({value, column, children, style}) {

  if (_.isUndefined(value) && column.has_default_val) {
    return <div className='Formatters-disabledCell' style={style}>[default]</div>;
  } else if ((_.isUndefined(value) && column.not_null) ||
      (_.isUndefined(value) || _.isNull(value))) {
    return <div className='Formatters-disabledCell' style={style}>[null]</div>;
  }
  return children;
}
NullAndDefaultFormatter.propTypes = {
  value: PropTypes.any,
  column: PropTypes.object,
  children: CustomPropTypes.children,
  style: PropTypes.object,
};

const FormatterPropTypes = {
  row: PropTypes.object,
  column: PropTypes.object,
};
export function TextFormatter({row, column}) {
  const maxColumnDataDisplayLength = usePreferences().getPreferences('sqleditor', 'max_column_data_display_length').value;
  let value = row[column.key];
  if(!_.isNull(value) && !_.isUndefined(value)) {
    value = value.toString();
    // If the length of the value is very large then we do not render the entire value and truncate it.
    if (value.length > maxColumnDataDisplayLength) {
      value = `${value.substring(0, maxColumnDataDisplayLength).replace(/\n/g,' ')}...`;
    }
  }
  return (
    <NullAndDefaultFormatter value={value} column={column}>
      <>{value}</>
    </NullAndDefaultFormatter>
  );
}
TextFormatter.propTypes = FormatterPropTypes;

export function NumberFormatter({row, column}) {
  let value = row[column.key];
  return (
    <NullAndDefaultFormatter value={value} column={column} style={{textAlign: 'right'}}>
      <div style={{textAlign: 'right'}}>{value}</div>
    </NullAndDefaultFormatter>
  );
}
NumberFormatter.propTypes = FormatterPropTypes;

export function BinaryFormatter({row, column}) {
  let value = row[column.key];
  const eventBus = useContext(QueryToolEventsContext);
  const downloadBinaryData = usePreferences().getPreferences('misc', 'enable_binary_data_download').value;
  return (
    <StyledNullAndDefaultFormatter value={value} column={column}>
      <span className='Formatters-disabledCell'>[{value}]</span>&nbsp;&nbsp;
      {downloadBinaryData && 
        <PgIconButton size="xs" title={gettext('Download binary data')} icon={<GetAppRoundedIcon />}
          onClick={()=>eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_SAVE_BINARY_DATA, row.__temp_PK, column.pos)}/>}
    </StyledNullAndDefaultFormatter>
  );
}
BinaryFormatter.propTypes = FormatterPropTypes;
