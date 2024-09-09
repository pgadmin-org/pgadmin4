/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import React from 'react';
import PropTypes from 'prop-types';

import { InputText } from 'sources/components/FormComponents';
import gettext from 'sources/gettext';


export const SEARCH_INPUT_SIZE = {
  FULL: 'full',
  HALF: 'half',
};

export const SEARCH_INPUT_ALIGNMENT = {
  LEFT: 'left',
  RIGHT: 'right'
};

export const SearchInputText = ({
  searchText, onChange, placeholder, size, alignment
}) => {
  const props = {
    placeholder: placeholder || gettext('Search'),
    style: {
      width: size == SEARCH_INPUT_SIZE.FULL ? '100%' : '50%',
      float: alignment == SEARCH_INPUT_ALIGNMENT.RIGHT ? 'right' : 'left',
    },
    value: searchText,
    onChange,
  };

  return <InputText {...props}/>;
};

SearchInputText.propTypes = {
  searchText: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  placeholder: PropTypes.string,
  size: PropTypes.oneOf(Object.values(SEARCH_INPUT_SIZE)),
  alignment: PropTypes.oneOf(Object.values(SEARCH_INPUT_ALIGNMENT)),
};
