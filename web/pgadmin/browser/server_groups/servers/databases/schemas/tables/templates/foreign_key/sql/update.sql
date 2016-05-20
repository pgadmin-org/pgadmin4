{### SQL to update foreign key object ###}
{% if data %}
{# ==== To update foreign key name ==== #}
{% if data.name != o_data.name %}
ALTER TABLE {{ conn|qtIdent(data.schema, data.table) }}
    RENAME CONSTRAINT {{ conn|qtIdent(o_data.name) }} TO {{ conn|qtIdent(data.name) }};
{% endif %}
{# ==== To update foreign key validate ==== #}
{% if 'convalidated' in data and o_data.convalidated != data.convalidated and not data.convalidated %}
ALTER TABLE {{ conn|qtIdent(data.schema, data.table) }}
    VALIDATE CONSTRAINT {{ conn|qtIdent(data.name) }};
{% endif %}
{# ==== To update foreign key comments ==== #}
{% if data.comment is defined and data.comment != o_data.comment %}
COMMENT ON CONSTRAINT {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(data.schema, data.table) }}
    IS {{ data.comment|qtLiteral }};
{% endif %}
{% endif %}