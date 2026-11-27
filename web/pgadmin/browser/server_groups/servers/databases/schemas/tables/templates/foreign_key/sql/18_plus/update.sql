{### SQL to update foreign key object ###}
{% if data %}
{# ==== To update foreign key name ==== #}
{% if data.name != o_data.name %}
ALTER TABLE IF EXISTS {{ conn|qtIdent(data.schema, data.table) }}
    RENAME CONSTRAINT {{ conn|qtIdent(o_data.name) }} TO {{ conn|qtIdent(data.name) }};

{% endif %}
{# ==== To update foreign key enforcement ==== #}
{# ==== Making a foreign key ENFORCED also validates it ==== #}
{% if 'conenforced' in data and o_data.conenforced != data.conenforced %}
ALTER TABLE IF EXISTS {{ conn|qtIdent(data.schema, data.table) }}
    ALTER CONSTRAINT {{ conn|qtIdent(data.name) }} {% if data.conenforced %}ENFORCED{% else %}NOT ENFORCED{% endif %};

{% endif %}
{# ==== To update foreign key validate ==== #}
{# ==== A NOT ENFORCED foreign key cannot be validated ==== #}
{% if 'convalidated' in data and o_data.convalidated != data.convalidated and data.convalidated and o_data.conenforced and ('conenforced' not in data or data.conenforced) %}
ALTER TABLE IF EXISTS {{ conn|qtIdent(data.schema, data.table) }}
    VALIDATE CONSTRAINT {{ conn|qtIdent(data.name) }};

{% endif %}
{# ==== To update foreign key comments ==== #}
{% if data.comment is defined and data.comment != o_data.comment %}
COMMENT ON CONSTRAINT {{ conn|qtIdent(data.name) }} ON {{ conn|qtIdent(data.schema, data.table) }}
    IS {{ data.comment|qtLiteral(conn) }};
{% endif %}
{% endif %}
