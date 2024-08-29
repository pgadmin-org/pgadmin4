/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React, { useMemo } from 'react';

export const FieldControl = ({schemaId, item}) => {
  const Control = item.control;
  const props = item.controlProps;
  const children = item.controls;

  return useMemo(() =>
    <Control {...props}>
      {
        children &&
          children.map(
            (child, idx) => <FieldControl key={idx} item={child}/>
          )
      }
    </Control>, [schemaId, Control, props, children]
  );
};
