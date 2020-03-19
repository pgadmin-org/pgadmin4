{# UPDATE statement for TEXT SEARCH TEMPLATE #}
{% if data %}
{% if data.name and data.name != o_data.name %}
ALTER TEXT SEARCH TEMPLATE {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(o_data.name)}}
    RENAME TO {{ conn|qtIdent(data.name) }};
{% endif %}

{#in case of rename, use new fts template name #}
{% if data.name and data.name != o_data.name %}
{% set name = data.name %}
{% else %}
{% set name = o_data.name %}
{% endif %}
{% if data.schema and data.schema != o_data.schema %}
ALTER TEXT SEARCH TEMPLATE {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(name)}}
    SET SCHEMA {{conn|qtIdent(data.schema)}};
{% endif %}
{# Schema Diff SQL for FTS PARSER #}
{% if data.tmplinit or data.tmpllexize %}
-- WARNING:
-- We have found the difference in either of INIT or LEXIZE,
-- so we need to drop the existing template first and re-create it.
DROP TEXT SEARCH TEMPLATE {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(name)}};

CREATE TEXT SEARCH TEMPLATE {{ conn|qtIdent(o_data.schema, name) }} (
{% if data.tmplinit and data.tmplinit != '-'%}
    INIT = {{data.tmplinit}},
{% endif %}
    LEXIZE = {% if data.tmpllexize is defined %}{{data.tmpllexize}}{% else %}{{o_data.tmpllexize}}{% endif %}

);
{% endif %}
{% if 'description' in data and data.description != o_data.description %}
COMMENT ON TEXT SEARCH TEMPLATE {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(name)}}
    IS {{ data.description|qtLiteral }};
{% endif %}
{% endif %}
