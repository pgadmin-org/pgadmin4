{# CREATE TEXT SEARCH TEMPLATE Statement #}
{% if data and data.schema and data.name and data.tmpllexize %}
CREATE TEXT SEARCH TEMPLATE {{ conn|qtIdent(data.schema, data.name) }} (
{% if data.tmplinit and data.tmplinit != '-'%}    INIT = {{data.tmplinit}},{% endif %}
    LEXIZE = {{data.tmpllexize}}
);
{# Description for TEXT SEARCH TEMPLATE #}
{% if data.description %}
COMMENT ON TEXT SEARCH TEMPLATE {{ conn|qtIdent(data.schema, data.name) }}
      IS {{ data.description|qtLiteral }};
{% endif %}{% endif %}