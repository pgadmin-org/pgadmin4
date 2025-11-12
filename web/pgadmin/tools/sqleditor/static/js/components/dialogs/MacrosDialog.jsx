import { styled } from '@mui/material/styles';
import React from 'react';
import SchemaView from '../../../../../../static/js/SchemaView';
import BaseUISchema from '../../../../../../static/js/SchemaView/base_schema.ui';
import gettext from 'sources/gettext';
import { QueryToolContext, getRandomName } from '../QueryToolComponent';
import url_for from 'sources/url_for';
import _ from 'lodash';
import PropTypes from 'prop-types';
import { Box } from '@mui/material';

const StyledBox = styled(Box)(() => ({
  height: '100%',
  '& .MacrosDialog-root': {
    padding: 0 + ' !important',
  }
}));

class MacrosCollection extends BaseUISchema {
  constructor(keyOptions) {
    super();
    this.keyOptions = keyOptions;
  }

  get idAttribute() {
    return 'id';
  }

  /* Returns the new data row for the schema based on defaults and input */
  getNewData(data={}) {
    const current_macros = this?.top?.sessData.macro;

    let newRow = {};
    this.fields.forEach((field)=>{
      newRow[field.id] = this.defaults[field.id];
    });
    newRow = {
      ...newRow,
      ...data,
    };

    if (current_macros) {
      // Extract an array of existing names from the 'macro' collection
      const existingNames = current_macros.map(macro => macro.name);
      const newName = getRandomName(existingNames);
      newRow.name = newName;
    }
    return newRow;
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'mid', label: gettext('Key'), cell: 'select', noEmpty: false,
        width: 100, options: obj.keyOptions, optionsReloadBasis: obj.keyOptions.length,
        controlProps: {
          allowClear: true,
        }
      },
      {
        id: 'name', label: gettext('Name'), cell: 'text', noEmpty: true,
        width: 100,
      },
      {
        id: 'sql', label: gettext('SQL'), cell: 'sql', noEmpty: true,
        width: 300, controlProps: {
          options: {
            foldGutter: false,
            lineNumbers: false,
            gutters: [],
            readOnly: true,
            lineWrapping: true,
          },
        }
      },
    ];
  }
}

class MacrosSchema extends BaseUISchema {
  constructor(keyOptions) {
    super();
    this.macrosCollObj = new MacrosCollection(keyOptions);
  }

  get baseFields() {
    let obj = this;
    return [
      {
        id: 'macro', label: '', type: 'collection', schema: obj.macrosCollObj,
        canAdd: true, canDelete: true, isFullTab: true, group: 'temp',
      },
    ];
  }

  validate(state, setError) {
    let allKeys = state.macro.map((m) => m.mid ? m.mid.toString() : null).filter(key => key !== null);
    let allNames = state.macro.map((m) => m.name ? m.name.toLowerCase() : null);
    if(allKeys.length !=  new Set(allKeys).size) {
      setError('macro', gettext('Key must be unique.'));
      return true;
    } else if(allNames.length !=  new Set(allNames).size) {
      setError('macro', gettext('Name must be unique.'));
      return true;
    }
    return false;
  }
}

function getChangedMacros(userMacrosData, changeData) {
  /* For backend, added, removed is changed. Convert all added, removed to changed. */
  let changed = [];

  for (const m of (changeData.macro.changed || [])) {
    let newM = {...m};
    if('id' in m) {
      let em = _.find(userMacrosData, (d)=>d.id==m.id);
      newM = {name: m.name ? (m.name) : em.name , sql: m.sql ? m.sql : em.sql, mid: m.mid ? m.mid : em.mid, ...m};
    } else {
      newM.id = m.mid;
    }
    changed.push(newM);
  }
  for (const m of (changeData.macro.deleted || [])) {
    changed.push({id: m.id, name: null, sql: null});
  }
  for (const m of (changeData.macro.added || [])) {
    if (m.id && m.id !== 0){
      m.mid = m.id;
      delete m.id;
    }
    changed.push(m);
  }
  return changed;
}

export default function MacrosDialog({onClose, onSave}) {

  const queryToolCtx = React.useContext(QueryToolContext);
  const [macrosData, setMacrosData] = React.useState([]);
  const [userMacrosData, setUserMacrosData] = React.useState([]);
  const [macrosErr, setMacrosErr] = React.useState(null);

  const fetchMacrosData = async ()=>{
    try {
      // Fetch user macros data
      let { data: userMacroRespData } = await queryToolCtx.api.get(url_for('sqleditor.get_user_macros'));

      let {data: respData} = await queryToolCtx.api.get(url_for('sqleditor.get_macros', {
        'trans_id': queryToolCtx.params.trans_id,
      }));

      setUserMacrosData(userMacroRespData);
      /* Copying id to mid to track key id changes */
      setMacrosData(respData.macro.map((m)=>({...m, mid: m.id})));

    } catch (error) {
      setMacrosErr(error);
    }
  };

  React.useEffect(()=>{
    fetchMacrosData();
  }, []);

  const onSaveClick = (_isNew, changeData)=>{
    return new Promise((resolve, reject)=>{
      const setMacros = async ()=>{
        try {
          let changed = getChangedMacros(userMacrosData, changeData);
          let {data: respData} = await queryToolCtx.api.put(url_for('sqleditor.set_macros', {
            'trans_id': queryToolCtx.params.trans_id,
          }), {changed: changed});
          resolve();
          onSave(respData.filter((m) => Boolean(m.name)));
          onClose();
        } catch (error) {
          reject(error instanceof Error ? error : Error(gettext('Something went wrong')));
        }
      };
      setMacros();
    });
  };

  const keyOptions = macrosData.map((m)=>({
    label: m.key_label,
    value: m.id,
  }));

  const schema = React.useRef(null);

  if(keyOptions.length <= 0) {
    return <></>;
  }

  if (!schema.current)
    schema.current = new MacrosSchema(keyOptions);

  return (
    <StyledBox>
      <SchemaView
        formType={'dialog'}
        getInitData={()=>{
          if(macrosErr) {
            return Promise.reject(new Error(macrosErr));
          }
          return Promise.resolve({macro: userMacrosData.filter((m)=>Boolean(m.name))});
        }}
        schema={schema.current}
        viewHelperProps={{
          mode: 'edit',
        }}
        onSave={onSaveClick}
        onClose={onClose}
        hasSQL={false}
        disableSqlHelp={true}
        disableDialogHelp={true}
        isTabView={false}
        formClassName='MacrosDialog-root'
      />
    </StyledBox>
  );
}

MacrosDialog.propTypes = {
  onClose: PropTypes.func,
  onSave: PropTypes.func,
};
