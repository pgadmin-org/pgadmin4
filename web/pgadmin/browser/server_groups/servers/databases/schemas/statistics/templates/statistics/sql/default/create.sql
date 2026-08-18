{### SQL to create extended statistics object (PostgreSQL 14+) ###}
{### Supports column based, expression based and mixed statistics ###}
CREATE STATISTICS{% if add_not_exists_clause %} IF NOT EXISTS{% endif %} {{ conn|qtIdent(data.schema, data.name) }}{% if data.stat_types and data.stat_types|length > 0 %}

    ({% for stype in data.stat_types %}{{ stype }}{% if not loop.last %}, {% endif %}{% endfor %}){% endif %}

    ON {% if data.columns %}{% for col in data.columns %}{{ conn|qtIdent(col) }}{% if not loop.last %}, {% endif %}{% endfor %}{% endif %}{% if data.columns and data.expression_list %}, {% endif %}{% if data.expression_list %}{{ data.expression_list }}{% endif %}

    FROM {{ conn|qtIdent(data.schema, data.table) }};
{% if data.owner %}

ALTER STATISTICS {{ conn|qtIdent(data.schema, data.name) }}
    OWNER TO {{ conn|qtIdent(data.owner) }};
{% endif %}
{% if data.stattarget is defined and data.stattarget is not none and data.stattarget != -1 %}

ALTER STATISTICS {{ conn|qtIdent(data.schema, data.name) }}
    SET STATISTICS {{ data.stattarget }};
{% endif %}
{% if data.comment %}

COMMENT ON STATISTICS {{ conn|qtIdent(data.schema, data.name) }}
    IS {{ data.comment|qtLiteral(conn) }};
{% endif %}
