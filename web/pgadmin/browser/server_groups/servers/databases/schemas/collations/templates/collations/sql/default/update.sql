{% if data %}
{# Change object's owner #}
{% if (data.lc_collate and data.lc_type) or data.locale or data.copy_collation %}
-- WARNING:
-- We have found the difference in either of LC_COLLATE or LC_CTYPE or LOCALE,
-- so we need to drop the existing collation first and re-create it.
DROP COLLATION {{ conn|qtIdent(o_data.schema, o_data.name) }};

CREATE COLLATION {{ conn|qtIdent(o_data.schema, o_data.name) }}
{% if data.lc_collate and data.lc_type %}
    (LC_COLLATE = {{ data.lc_collate|qtLiteral }}, LC_CTYPE = {{ data.lc_type|qtLiteral }});
{% endif %}
{% if data.locale %}
    (LOCALE = {{ data.locale|qtLiteral }});
{% endif %}
{% if data.copy_collation %}
    FROM {{ data.copy_collation }};
{% endif %}

ALTER COLLATION {{ conn|qtIdent(o_data.schema, o_data.name) }}
    OWNER TO {{ conn|qtIdent(o_data.owner) }};
{% endif %}
{% if data.owner and data.owner != o_data.owner %}
ALTER COLLATION {{ conn|qtIdent(o_data.schema, o_data.name) }}
    OWNER TO {{ conn|qtIdent(data.owner) }};

{% endif %}
{# Change object's comment  #}
{% if data.description is defined and data.description != o_data.description %}
COMMENT ON COLLATION {{ conn|qtIdent(o_data.schema, o_data.name) }}
    IS {{ data.description|qtLiteral }};

{% endif %}
{# Change object name #}
{% if data.name and data.name != o_data.name %}
ALTER COLLATION {{ conn|qtIdent(o_data.schema, o_data.name) }}
    RENAME TO {{ conn|qtIdent(data.name) }};

{% endif %}
{# Change object schema #}
{% if data.schema  and data.schema != o_data.schema %}
ALTER COLLATION {% if data.name and data.name != o_data.name %}{{ conn|qtIdent(o_data.schema, data.name) }}{% else %}{{ conn|qtIdent(o_data.schema, o_data.name) }}{% endif %}

    SET SCHEMA {{ conn|qtIdent(data.schema) }};
{% endif %}
{% endif %}
