/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import _ from 'lodash';
import clsx from 'clsx';
import PropTypes from 'prop-types';

import React, { useCallback, useState } from 'react';

import { makeStyles } from '@material-ui/styles';
import Paper from '@material-ui/core/Paper';
import TableContainer from '@material-ui/core/TableContainer';

import gettext from 'sources/gettext';

import { DebuggerEventsContext } from './DebuggerComponent';
import { DEBUGGER_EVENTS } from '../DebuggerConstants';
import { commonTableStyles } from '../../../../../static/js/Theme';
import { InputText, InputDateTimePicker } from '../../../../../static/js/components/FormComponents';


const useStyles = makeStyles(() => ({
  table: {
    minWidth: 650,
  },
  summaryContainer: {
    flexGrow: 1,
    minHeight: 0,
    overflow: 'auto',
    maxHeight: '100%'
  },
  container: {
    maxHeight: '100%'
  },
  cell: {
    textAlign: 'center'
  }

}));

export function LocalVariablesAndParams({ type }) {
  const classes = useStyles();
  const tableClasses = commonTableStyles();
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
    <Paper variant="outlined" elevation={0} className={classes.summaryContainer}>
      <TableContainer className={classes.container}>
        <table className={clsx(tableClasses.table)} aria-label="sticky table">
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
              <tr key={_.uniqueId('c')} className={classes.cell}>
                <td colSpan={3} >{gettext('No data found')}</td>
              </tr>
            }

          </tbody>
        </table>
      </TableContainer>
    </Paper>
  );
}

LocalVariablesAndParams.propTypes = {
  type: PropTypes.number
};
