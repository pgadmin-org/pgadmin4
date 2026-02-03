{### SQL to update extended statistics object ###}
{### Rename statistics ###}
{% if data.name and data.name != o_data.name %}
ALTER STATISTICS {{ conn|qtIdent(o_data.schema, o_data.name) }}
    RENAME TO {{ conn|qtIdent(data.name) }};

{% endif %}
{### Change schema ###}
{% if data.schema and data.schema != o_data.schema %}
ALTER STATISTICS {{ conn|qtIdent(o_data.schema, data.name if data.name else o_data.name) }}
    SET SCHEMA {{ conn|qtIdent(data.schema) }};

{% endif %}
{### Change owner ###}
{% if data.owner and data.owner != o_data.owner %}
ALTER STATISTICS {{ conn|qtIdent(data.schema if data.schema else o_data.schema, data.name if data.name else o_data.name) }}
    OWNER TO {{ conn|qtIdent(data.owner) }};

{% endif %}
{### Update comment ###}
{% if data.comment is defined and data.comment != o_data.comment %}
COMMENT ON STATISTICS {{ conn|qtIdent(data.schema if data.schema else o_data.schema, data.name if data.name else o_data.name) }}
    IS {% if data.comment %}{{ data.comment|qtLiteral(conn) }}{% else %}NULL{% endif %};
{% endif %}
