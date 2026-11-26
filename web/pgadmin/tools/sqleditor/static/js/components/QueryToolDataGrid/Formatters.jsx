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
import { DataGridExtrasContext } from './index';

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

// Work out the text shown in a cell. This only affects the display: the row
// data that is copied, edited and saved is never changed.
export function getTextCellDisplayValue(value, maxColumnDataDisplayLength) {
  if(_.isNull(value) || _.isUndefined(value)) {
    return value;
  }
  value = value.toString();
  // If the length of the value is very large then we do not render the entire value and truncate it.
  if (value.length > maxColumnDataDisplayLength) {
    return `${value.substring(0, maxColumnDataDisplayLength).replace(/\n/g,' ')}...`;
  }
  // The cell is one line high, so anything after a line break would be
  // hidden without any sign that it is there. Show the first line followed
  // by an ellipsis instead, as is done for text that is too wide.
  const lineBreak = value.search(/[\r\n]/);
  if (lineBreak !== -1) {
    return `${value.substring(0, lineBreak)}\u2026`;
  }
  return value;
}

export function TextFormatter({row, column}) {
  const maxColumnDataDisplayLength = usePreferences().getPreferences('sqleditor', 'max_column_data_display_length').value;
  const value = getTextCellDisplayValue(row[column.key], maxColumnDataDisplayLength);
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

// The backend sends this in place of a bytea value unless the "Show binary
// data as hex?" preference was on when the query ran, in which case it sends
// PostgreSQL's text form, which can never equal it.
const BINARY_PLACEHOLDER = 'binary data';

export function BinaryFormatter({row, column, ...props}) {
  let value = row[column.key];
  const eventBus = useContext(QueryToolEventsContext);
  const dataGridExtras = useContext(DataGridExtrasContext);
  const preferences = usePreferences();
  const downloadBinaryData = preferences.getPreferences('misc', 'enable_binary_data_download').value;
  const maxColumnDataDisplayLength = preferences.getPreferences('sqleditor', 'max_column_data_display_length').value;

  const absoluteRowPos = (dataGridExtras?.startRowNum ?? 1) - 1 + props.rowIdx;

  return (
    <StyledNullAndDefaultFormatter value={value} column={column}>
      {value === BINARY_PLACEHOLDER ?
        <span className='Formatters-disabledCell'>[{value}]</span> :
        <>{getTextCellDisplayValue(value, maxColumnDataDisplayLength)}</>}&nbsp;&nbsp;
      {downloadBinaryData &&
        <PgIconButton size="xs" title={gettext('Download binary data')} icon={<GetAppRoundedIcon />}
          onClick={()=>eventBus.fireEvent(QUERY_TOOL_EVENTS.TRIGGER_SAVE_BINARY_DATA, absoluteRowPos, column.pos)}/>}
    </StyledNullAndDefaultFormatter>
  );
}
BinaryFormatter.propTypes = FormatterPropTypes;
