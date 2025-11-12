{## Alter index to use cluster type ##}
{% if data.indisclustered %}

ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    CLUSTER ON {{conn|qtIdent(data.name)}};
{% endif %}
{## Changes description ##}
{% if data.description is defined and data.description %}

COMMENT ON INDEX {{conn|qtIdent(data.schema, data.name)}}
    IS {{data.description|qtLiteral(conn)}};{% endif %}
