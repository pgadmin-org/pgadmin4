/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import PropTypes from 'prop-types';
import BaseUISchema from 'sources/SchemaView/base_schema.ui';

/* Common Prop types */
const CustomPropTypes = {
  ref: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.instanceOf(Element) }),
  ]),

  schemaUI: PropTypes.instanceOf(BaseUISchema),

  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node
  ]),

  className: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
  ])
};

export default CustomPropTypes;
