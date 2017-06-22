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
