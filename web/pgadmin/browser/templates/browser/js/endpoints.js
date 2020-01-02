/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

define(
  'pgadmin.browser.endpoints', [],
  function() {
    return {
      {% for endpoint, url in current_app.exposed_endpoint_url_map %}{% if loop.index != 1 %},

{% endif %}
      '{{ endpoint|safe }}': '{{ url|safe }}'{% endfor %}

    };
  });
