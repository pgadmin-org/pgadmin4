/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useContext, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

import FieldSet from 'sources/components/FieldSet';
import CustomPropTypes from 'sources/custom_prop_types';

import { FieldControl } from './FieldControl';
import { SchemaStateContext } from './SchemaState';
import {
  useFieldSchema, useFieldValue, useSchemaStateSubscriber,
} from './hooks';
import { registerView } from './registry';
import { createFieldControls, listenDepChanges  } from './utils';


export default function FieldSetView({
  field, accessPath, dataDispatch, viewHelperProps, controlClassName,
}) {
  const [, setKey] = useState(0);
  const subscriberManager = useSchemaStateSubscriber(setKey);
  const schema = field.schema;
  const schemaState = useContext(SchemaStateContext);
  const value = useFieldValue(accessPath, schemaState);
  const options = useFieldSchema(
    field, accessPath, value, viewHelperProps, schemaState, subscriberManager
  );

  const label = field.label;

  listenDepChanges(
    accessPath, field, schemaState, () => subscriberManager.current?.signal()
  );

  const fieldGroups = useMemo(
    () => createFieldControls({
      schema, schemaState, accessPath, viewHelperProps, dataDispatch
    }),
    [schema, schemaState, accessPath, viewHelperProps, dataDispatch]
  );

  // We won't show empty feldset too.
  if(!options.visible || !fieldGroups.length) {
    return <></>;
  }

  return (
    <FieldSet title={label} className={controlClassName}>
      {fieldGroups.map(
        (fieldGroup, gidx) => (
          <React.Fragment key={gidx}>
            {fieldGroup.controls.map(
              (item, idx) => <FieldControl
                item={item} key={idx} schemaId={schema._id} />
            )}
          </React.Fragment>
        )
      )}
    </FieldSet>
  );
}

FieldSetView.propTypes = {
  viewHelperProps: PropTypes.object,
  accessPath: PropTypes.array.isRequired,
  dataDispatch: PropTypes.func,
  controlClassName: CustomPropTypes.className,
  field: PropTypes.object,
};

registerView(FieldSetView, 'FieldSetView');
