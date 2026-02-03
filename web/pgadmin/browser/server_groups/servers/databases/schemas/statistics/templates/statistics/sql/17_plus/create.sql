{### SQL to create extended statistics object (PostgreSQL 17+) ###}
{### Supports expression-based statistics and optional name ###}
CREATE STATISTICS{% if data.name %}{% if add_not_exists_clause %} IF NOT EXISTS{% endif %} {{ conn|qtIdent(data.schema, data.name) }}{% endif %}{% if data.stat_types and data.stat_types|length > 0 %}

    ({% for stype in data.stat_types %}{{ stype }}{% if not loop.last %}, {% endif %}{% endfor %}){% endif %}

    ON {% if data.expressions and data.expressions|length > 0 %}{% for expr in data.expressions %}({{ expr.expression if expr.expression is defined else expr }}){% if not loop.last %}, {% endif %}{% endfor %}{% elif data.columns %}{% for col in data.columns %}{{ conn|qtIdent(col) }}{% if not loop.last %}, {% endif %}{% endfor %}{% endif %}

    FROM {{ conn|qtIdent(data.schema, data.table) }};
{% if data.comment and data.name %}

COMMENT ON STATISTICS {{ conn|qtIdent(data.schema, data.name) }}
    IS {{ data.comment|qtLiteral(conn) }};
{% endif %}
