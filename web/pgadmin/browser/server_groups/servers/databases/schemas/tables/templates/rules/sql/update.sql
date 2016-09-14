{# ===== Update Rule ===== #}
{% if data.name is defined %}
{% set rule_name = data.name %}
{% else %}
{% set rule_name = o_data.name %}
{% endif %}
{% if data.name and data.name != o_data.name %}
ALTER RULE {{ conn|qtIdent(o_data.name) }} ON {{ conn|qtIdent(o_data.schema, o_data.view) }} RENAME TO {{ conn|qtIdent(data.name) }};{{ '\r\r' }}
{% endif %}
{% if data.event or data.do_instead is defined or data.condition or data.statements %}
CREATE OR REPLACE RULE {{ conn|qtIdent(rule_name) }} AS
    ON {% if data.event and data.event != o_data.event %}{{ data.event|upper }}{% else %}{{ o_data.event|upper }}{% endif %}
 TO {{ conn|qtIdent(o_data.schema, o_data.view) }}
{% if data.condition and o_data.condition != data.condition %}
    WHERE {{ data.condition }}
{% elif data.condition is not defined and o_data.condition %}
    WHERE {{ o_data.condition }}
{% endif %}
    DO {% if (('do_instead' not in data and o_data.do_instead in ['true', True]) or (data.do_instead in ['true', True])) %}{{ 'INSTEAD' }}{% endif %}
{% if data.statements and data.statements != o_data.statements %}

{{ data.statements.rstrip(';') }};
{% elif data.statements is not defined and o_data.statements %}

{{ o_data.statements.rstrip(';') }};
{% else %}
 NOTHING;
{% endif %}

{% endif %}
{% set old_comment = o_data.comment|default('', true) %}
{% if (data.comment is defined and (data.comment != old_comment)) %}
COMMENT ON RULE {{ conn|qtIdent(rule_name) }} ON {{ conn|qtIdent(o_data.schema, o_data.view) }} IS {{ data.comment|qtLiteral }};{% endif %}
