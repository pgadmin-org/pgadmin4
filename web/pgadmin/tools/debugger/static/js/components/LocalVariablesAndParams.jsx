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

import React, { useCallback, useState } from 'react';

import Paper from '@mui/material/Paper';
import TableContainer from '@mui/material/TableContainer';

import gettext from 'sources/gettext';

import { DebuggerEventsContext } from './DebuggerComponent';
import { DEBUGGER_EVENTS } from '../DebuggerConstants';
import { InputText, InputDateTimePicker } from '../../../../../static/js/components/FormComponents';
import Table from '../../../../../static/js/components/Table';

const StyledPaper = styled(Paper)(() => ({
  flexGrow: 1,
  minHeight: 0,
  overflow: 'auto',
  maxHeight: '100%',
  '& .LocalVariablesAndParams-container': {
    maxHeight: '100%',
    '& .LocalVariablesAndParams-cell': {
      textAlign: 'center'
    }
  },
}));

export function LocalVariablesAndParams({ type }) {

  const eventBus = React.useContext(DebuggerEventsContext);
  const [variablesData, setVariablesData] = useState([]);
  const preValue = React.useRef({});
  const [disableVarChange, setDisableVarChange] = useState(false);


  React.useEffect(() => {
    /* For Parameters and Local variables use the component.
        type = 1 means 'Parameters'
        type = 2 means 'LocalVariables'
    */
    if (type == 1) {
      eventBus.registerListener(DEBUGGER_EVENTS.SET_PARAMETERS, (val) => {
        setVariablesData(val);
      });
    } else if (type == 2) {
      eventBus.registerListener(DEBUGGER_EVENTS.SET_LOCAL_VARIABLES, (val) => {
        setVariablesData(val);
      });
    }
    eventBus.registerListener(DEBUGGER_EVENTS.GET_TOOL_BAR_BUTTON_STATUS, (status) => {
      setDisableVarChange(status.disabled);
    });
  }, []);

  const changeLocalVarVal = useCallback((data) => {
    if (type == 1) {
      eventBus.fireEvent(DEBUGGER_EVENTS.SET_PARAMETERS_VALUE_CHANGE, data);
    } else if (type == 2) {
      eventBus.fireEvent(DEBUGGER_EVENTS.SET_LOCAL_VARIABLE_VALUE_CHANGE, data);
    }

  });

  const onValueChange = (name, value) => {
    setVariablesData((prev) => {
      let retVal = [...prev];
      let nameIndex = _.findIndex(retVal, (r) => (r.name == name));
      retVal[nameIndex].value = value;
      return retVal;
    });
  };

  const handelBlurEvent = (row) => {
    let data = [{
      name: row.name,
      value: row.value,
      type: row.type
    }];
    if (preValue.current[row.name] != row.value && !disableVarChange) {
      preValue.current[row.name] = row.value;
      changeLocalVarVal(data);
    }

  };

  return (
    <StyledPaper variant="outlined" elevation={0}>
      <TableContainer className='LocalVariablesAndParams-container'>
        <Table aria-label="sticky table">
          <thead>
            <tr>
              <th>{gettext('Name')}</th>
              <th>{gettext('Type')}</th>
              <th>{gettext('Value')}</th>
            </tr>
          </thead>
          <tbody>
            {variablesData.map((row) => (
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.dtype}</td>
                <td>
                  {row.dtype == 'date' ?
                    <InputDateTimePicker
                      value={row.value}
                      controlProps={{
                        placeholder: gettext('YYYY-MM-DD'),
                        autoOk: true, pickerType: 'Date', ampm: false,
                      }}
                      onChange={(val) => {
                        onValueChange(row.name, val);
                      }}
                      onFocus={() => {
                        preValue.current[row.name] = row.value;
                      }}
                      onBlur={()=> {handelBlurEvent(row);}}
                    ></InputDateTimePicker>
                    :

                    <InputText value={row.value} type={row.dtype}
                      disabled={disableVarChange}
                      onChange={(val) => {
                        onValueChange(row.name, val);
                      }}
                      onFocus={() => {
                        preValue.current[row.name] = row.value;
                      }}
                      onBlur={()=> {handelBlurEvent(row);}}
                    ></InputText>}</td>
              </tr>
            ))}
            {
              variablesData.length == 0 &&
              <tr key={_.uniqueId('c')} className='LocalVariablesAndParams-cell'>
                <td colSpan={3} >{gettext('No data found')}</td>
              </tr>
            }

          </tbody>
        </Table>
      </TableContainer>
    </StyledPaper>
  );
}

LocalVariablesAndParams.propTypes = {
  type: PropTypes.number
};
