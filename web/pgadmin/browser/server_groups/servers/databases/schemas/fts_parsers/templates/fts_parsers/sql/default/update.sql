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
{# Schema Diff SQL for FTS PARSER #}
{% if data.prsstart or data.prstoken or data.prsend or data.prslextype or data.prsheadline %}
-- WARNING:
-- We have found the difference in either of START or GETTOKEN or END or
-- LEXTYPES or HEADLINE, so we need to drop the existing parser first
-- and re-create it.
DROP TEXT SEARCH PARSER {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(name)}};

CREATE TEXT SEARCH PARSER {{ conn|qtIdent(o_data.schema, name) }} (
    START = {% if data.prsstart is defined %}{{data.prsstart}}{% else %}{{o_data.prsstart}}{% endif %},
    GETTOKEN = {% if data.prstoken is defined %}{{data.prstoken}}{% else %}{{o_data.prstoken}}{% endif %},
    END = {% if data.prsend is defined %}{{data.prsend}}{% else %}{{o_data.prsend}}{% endif %},
    LEXTYPES = {% if data.prslextype is defined %}{{data.prslextype}}{% else %}{{o_data.prslextype}}{% endif %}{% if (data.prsheadline and data.prsheadline != '-') or (o_data.prsheadline and o_data.prsheadline != '-') %},
    HEADLINE = {% if data.prsheadline is defined %}{{data.prsheadline}}{% else %}{{o_data.prsheadline}}{% endif %}{% endif %}

);
{% endif %}
{% if "description" in data and data.description != o_data.description %}
COMMENT ON TEXT SEARCH PARSER {{conn|qtIdent(o_data.schema)}}.{{conn|qtIdent(name)}}
    IS {{ data.description|qtLiteral }};
{% endif %}
{% endif %}
