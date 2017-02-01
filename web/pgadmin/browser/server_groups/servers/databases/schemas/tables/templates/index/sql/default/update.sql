{## Changes name ##}
{% if data.name and o_data.name != data.name %}
ALTER INDEX {{conn|qtIdent(data.schema, o_data.name)}}
    RENAME TO {{conn|qtIdent(data.name)}};
{% endif %}
{## Changes fillfactor ##}
{% if data.fillfactor and o_data.fillfactor != data.fillfactor %}
ALTER INDEX {{conn|qtIdent(data.schema, data.name)}}
    SET (FILLFACTOR={{data.fillfactor}});
{% endif %}
{## Changes tablespace ##}
{% if data.spcname and o_data.spcname != data.spcname %}
ALTER INDEX {{conn|qtIdent(data.schema, data.name)}}
    SET TABLESPACE {{conn|qtIdent(data.spcname)}};
{% endif %}
{## Alter index to use cluster type ##}
{% if data.indisclustered is defined and o_data.indisclustered != data.indisclustered %}
ALTER TABLE {{conn|qtIdent(data.schema, data.table)}}
    CLUSTER ON {{conn|qtIdent(data.name)}};
{% endif %}
{## Changes description ##}
{% if data.description is defined and o_data.description != data.description %}
COMMENT ON INDEX {{conn|qtIdent(data.schema, data.name)}}
    IS {{data.description|qtLiteral}};{% endif %}