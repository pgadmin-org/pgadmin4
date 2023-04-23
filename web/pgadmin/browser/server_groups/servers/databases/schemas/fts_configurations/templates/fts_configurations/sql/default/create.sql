{# CREATE FTS CONFIGURATION Statement #}
{% if data and data.schema and data.name %}
CREATE TEXT SEARCH CONFIGURATION {{ conn|qtIdent(data.schema, data.name) }} (
{% if 'copy_config' in data and data.copy_config != '' %}
    COPY={{ data.copy_config }}
{% elif 'prsname' in data and data.prsname != '' %}
    PARSER = {{ data.prsname }}
{% endif %}
);

{% if 'owner' in data and data.owner != '' %}
ALTER TEXT SEARCH CONFIGURATION {{ conn|qtIdent(data.schema, data.name) }} OWNER TO {{ conn|qtIdent(data.owner) }};
{% endif %}

{# Description for FTS_CONFIGURATION #}
{% if data.description %}
COMMENT ON TEXT SEARCH CONFIGURATION {{ conn|qtIdent(data.schema, data.name) }}
    IS {{ data.description|qtLiteral(conn) }};
{% endif %}{% endif %}
