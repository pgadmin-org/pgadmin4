{# UPDATE statement for FTS PARSER #}
{% if data %}
{% if data.name and data.name != o_data.name %}
ALTER TEXT SEARCH PARSER {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(o_data.name)}}
    RENAME TO {{conn|qtIdent(data.name)}};
{% endif %}

{#in case of rename, use new fts template name #}
{% if data.name and data.name != o_data.name %}
{% set name = data.name %}
{% else %}
{% set name = o_data.name %}
{% endif %}
{% if data.schema and data.schema != o_data.schema %}
ALTER TEXT SEARCH PARSER {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(name)}}
    SET SCHEMA {{data.schema}};
{% endif %}
{% if "description" in data and data.description != o_data.description %}
COMMENT ON TEXT SEARCH PARSER {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(name)}}
    IS {{ data.description|qtLiteral }};
{% endif %}
{% endif %}
