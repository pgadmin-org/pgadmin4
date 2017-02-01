{## Alter index to use cluster type ##}
{% if data.indisclustered %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    CLUSTER ON {{conn|qtIdent(data.name)}};
{% endif %}
{## Changes description ##}
{% if data.description %}
COMMENT ON INDEX {{conn|qtIdent(data.name)}}
    IS {{data.description|qtLiteral}};{% endif %}