/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2025, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { useMemo } from 'react';

export const FieldControl = ({schemaId, item}) => {
  const Control = item.control;
  const {key, ...props} = item.controlProps;
  const children = item.controls;

  return useMemo(() =>
    <Control key={key} {...props}>
      {
        children?.map(
          (child, idx) => <FieldControl key={`${child.controlProps.id}-${idx}`} item={child}/>
        )
      }
    </Control>, [schemaId, Control, props, children]
  );
};
