{## Changes name ##}
{% if data.name and o_data.name != data.name %}
ALTER INDEX IF EXISTS {{conn|qtIdent(data.schema, o_data.name)}}
    RENAME TO {{conn|qtIdent(data.name)}};

{% endif %}
{## Changes fillfactor ##}
{% if data.fillfactor and o_data.fillfactor != data.fillfactor %}
ALTER INDEX IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    SET (FILLFACTOR={{data.fillfactor}});

{% elif (data.fillfactor == '' or data.fillfactor == None) and o_data.fillfactor|default('', 'true') != data.fillfactor %}
ALTER INDEX IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    RESET (FILLFACTOR);

{% endif %}
{## Changes tablespace ##}
{% if data.spcname and o_data.spcname != data.spcname %}
ALTER INDEX IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    SET TABLESPACE {{conn|qtIdent(data.spcname)}};

{% endif %}
{## Alter index to use cluster type ##}
{% if data.indisclustered is defined and o_data.indisclustered != data.indisclustered %}
{% if data.indisclustered %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    CLUSTER ON {{conn|qtIdent(data.name)}};

{% else %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.schema, data.table)}}
    SET WITHOUT CLUSTER;

{% endif %}
{% endif %}
{## Changes description ##}
{% if data.description is defined and o_data.description != data.description %}
COMMENT ON INDEX {{conn|qtIdent(data.schema, data.name)}}
    IS {{data.description|qtLiteral}};{% endif %}
