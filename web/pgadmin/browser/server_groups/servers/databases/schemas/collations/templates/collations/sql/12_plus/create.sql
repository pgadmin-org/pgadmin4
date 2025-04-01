{% if data %}
CREATE COLLATION{% if add_not_exists_clause %} IF NOT EXISTS{% endif %} {{ conn|qtIdent(data.schema, data.name) }}
{% if not data.copy_collation %}
{% set options = [] %}
{# if user has provided lc_collate & lc_type #}
{% if data.lc_collate and data.lc_type %}
{% if data.lc_collate and data.lc_type %}
    {% set options = options + ['LC_COLLATE = ' ~ data.lc_collate|qtLiteral(conn), 'LC_CTYPE = ' ~ data.lc_type|qtLiteral(conn)] %}
{% endif %}
{% if data.provider %}
{% set options = options + ['PROVIDER = ' ~ data.provider|qtLiteral(conn)] %}
{% endif %}
{% if data.is_deterministic is defined %}
{% set options = options + ['DETERMINISTIC = ' ~ data.is_deterministic|qtLiteral(conn)] %}
{% endif %}
{% if data.rules %}
{% set options = options + ['RULES = ' ~ data.rules|qtLiteral(conn)] %}
{% endif %}
{% if data.version %}
{% set options = options + ['VERSION = ' ~ data.version|qtLiteral(conn)] %}
{% endif %}
{% endif %}
{# if user has provided locale only  #}
{% if data.locale %}
{% if data.locale %}
    {% set options = options + ['LOCALE = ' ~ data.locale|qtLiteral(conn)] %}
{% endif %}
{% if data.provider %}
{% set options = options + ['PROVIDER = ' ~ data.provider|qtLiteral(conn)] %}
{% endif %}
{% if data.is_deterministic is defined %}
{% set options = options + ['DETERMINISTIC = ' ~ data.is_deterministic|qtLiteral(conn)] %}
{% endif %}
{% if data.rules %}
{% set options = options + ['RULES = ' ~ data.rules|qtLiteral(conn)] %}
{% endif %}
{% if data.version %}
{% set options = options + ['VERSION = ' ~ data.version|qtLiteral(conn)] %}
{% endif %}
{% endif %}
{% if options %}
({{ options|join(', ') }});
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
