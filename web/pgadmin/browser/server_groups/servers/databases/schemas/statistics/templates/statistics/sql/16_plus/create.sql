{### SQL to create extended statistics object (PostgreSQL 16+) ###}
{### The name is optional from PostgreSQL 16, in which case the server ###}
{### generates one, and IF NOT EXISTS may only be used with a name ###}
CREATE STATISTICS{% if data.name %}{% if add_not_exists_clause %} IF NOT EXISTS{% endif %} {{ conn|qtIdent(data.schema, data.name) }}{% endif %}{% if data.stat_types and data.stat_types|length > 0 %}

    ({% for stype in data.stat_types %}{{ stype }}{% if not loop.last %}, {% endif %}{% endfor %}){% endif %}

    ON {% if data.columns %}{% for col in data.columns %}{{ conn|qtIdent(col) }}{% if not loop.last %}, {% endif %}{% endfor %}{% endif %}{% if data.columns and data.expression_list %}, {% endif %}{% if data.expression_list %}{{ data.expression_list }}{% endif %}

    FROM {{ conn|qtIdent(data.schema, data.table) }};
{% if data.owner and data.name %}

ALTER STATISTICS {{ conn|qtIdent(data.schema, data.name) }}
    OWNER TO {{ conn|qtIdent(data.owner) }};
{% endif %}
{% if data.name and data.stattarget is defined and data.stattarget is not none and data.stattarget != -1 %}

ALTER STATISTICS {{ conn|qtIdent(data.schema, data.name) }}
    SET STATISTICS {{ data.stattarget }};
{% endif %}
{% if data.comment and data.name %}

COMMENT ON STATISTICS {{ conn|qtIdent(data.schema, data.name) }}
    IS {{ data.comment|qtLiteral(conn) }};
{% endif %}
