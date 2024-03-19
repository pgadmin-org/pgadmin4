{% if data %}
CREATE COLLATION{% if add_not_exists_clause %} IF NOT EXISTS{% endif %} {{ conn|qtIdent(data.schema, data.name) }}
{% if not data.copy_collation %}
{# if user has provided lc_collate & lc_type #}
{% if data.lc_collate and data.lc_type and data.provider and data.is_deterministic%}
{% if data.version %}
    (LC_COLLATE = {{ data.lc_collate|qtLiteral(conn) }}, LC_CTYPE = {{ data.lc_type|qtLiteral(conn) }}, PROVIDER = {{ data.provider|qtLiteral(conn) }}, DETERMINISTIC = {{ data.is_deterministic|qtLiteral(conn) }}, VERSION = {{ data.version|qtLiteral(conn) }});
{% else %}
    (LC_COLLATE = {{ data.lc_collate|qtLiteral(conn) }}, LC_CTYPE = {{ data.lc_type|qtLiteral(conn) }}, PROVIDER = {{ data.provider|qtLiteral(conn) }}, DETERMINISTIC = {{ data.is_deterministic|qtLiteral(conn) }});
{% endif %}
{% endif %}
{% if data.lc_collate and data.lc_type and data.provider and not data.is_deterministic and data.rules %}
{% if data.version %}
    (LC_COLLATE = {{ data.lc_collate|qtLiteral(conn) }}, LC_CTYPE = {{ data.lc_type|qtLiteral(conn) }}, PROVIDER = {{ data.provider|qtLiteral(conn) }}, RULES = {{ data.rules|qtLiteral(conn) }}, VERSION = {{ data.version|qtLiteral(conn) }}, DETERMINISTIC = FALSE);
{% else %}
    (LC_COLLATE = {{ data.lc_collate|qtLiteral(conn) }}, LC_CTYPE = {{ data.lc_type|qtLiteral(conn) }}, PROVIDER = {{ data.provider|qtLiteral(conn) }}, RULES = {{ data.rules|qtLiteral(conn) }}, DETERMINISTIC = FALSE);
{% endif %}
{% endif %}
{# if user has provided locale only  #}
{% if data.locale and data.provider and data.is_deterministic%}
{% if data.version %}
    (LOCALE = {{ data.locale|qtLiteral(conn) }}, PROVIDER = {{ data.provider|qtLiteral(conn) }}, DETERMINISTIC = {{ data.is_deterministic|qtLiteral(conn) }}, VERSION = {{ data.version|qtLiteral(conn) }});
{% else %}
    (LOCALE = {{ data.locale|qtLiteral(conn) }}, PROVIDER = {{ data.provider|qtLiteral(conn) }}, DETERMINISTIC = {{ data.is_deterministic|qtLiteral(conn) }});
{% endif %}
{% endif %}
{% if data.locale and data.provider and data.version and not data.is_deterministic and data.rules %}
{% if data.version %}
    (LOCALE = {{ data.locale|qtLiteral(conn) }}, PROVIDER = {{ data.provider|qtLiteral(conn) }}, RULES = {{ data.rules|qtLiteral(conn) }}, VERSION = {{ data.version|qtLiteral(conn) }}, DETERMINISTIC = FALSE);
{% else %}
    (LOCALE = {{ data.locale|qtLiteral(conn) }}, PROVIDER = {{ data.provider|qtLiteral(conn) }}, RULES = {{ data.rules|qtLiteral(conn) }}, DETERMINISTIC = FALSE);
{% endif %}
{% endif %}
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
    IS {{ data.description|qtLiteral(conn) }};
{% endif %}
{% endif %}
