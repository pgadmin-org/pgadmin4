{% if data %}
CREATE COLLATION{% if add_not_exists_clause %} IF NOT EXISTS{% endif %} {{ conn|qtIdent(data.schema, data.name) }}
{# if user has provided lc_collate & lc_type #}
{% if data.lc_collate and data.lc_type %}
    (LC_COLLATE = {{ data.lc_collate|qtLiteral }}, LC_CTYPE = {{ data.lc_type|qtLiteral }});
{% endif %}
{# if user has provided locale only  #}
{% if data.locale %}
    (LOCALE = {{ data.locale|qtLiteral }});
{% endif %}
{# if user has choosed to copy from existing collation #}
{% if data.copy_collation %}
    FROM {{ data.copy_collation }};
{% endif %}
{% if data.owner %}

ALTER COLLATION {{ conn|qtIdent(data.schema, data.name) }}
    OWNER TO {{ conn|qtIdent(data.owner) }};
{% endif %}
{% if data.description %}

COMMENT ON COLLATION {{ conn|qtIdent(data.schema, data.name) }}
    IS {{ data.description|qtLiteral }};
{% endif %}
{% endif %}
