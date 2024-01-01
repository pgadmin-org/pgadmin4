/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define(
  'pgadmin.server.supported_servers',
  ['sources/gettext'],
  function(gettext) {
    return [
      {% for st in server_types %}

      {label: '{{ st.description }}', value: '{{ st.server_type }}'},{% endfor %}

      {label: gettext('Unknown'), value: ''}
    ];
  }
);
