{## Changes name ##}
{% if data.name and o_data.name != data.name %}
ALTER INDEX IF EXISTS {{conn|qtIdent(data.schema, o_data.name)}}
    RENAME TO {{conn|qtIdent(data.name)}};

{% endif %}
{## Changes fillfactor ##}
{% if data.fillfactor and o_data.fillfactor != data.fillfactor %}
ALTER INDEX IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    SET (fillfactor={{data.fillfactor}});

{% elif (data.fillfactor == '' or data.fillfactor == None) and o_data.fillfactor|default('', 'true') != data.fillfactor %}
ALTER INDEX IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    RESET (fillfactor);

{% endif %}
{## Changes gin_pending_list_limit ##}
{% if data.gin_pending_list_limit and o_data.gin_pending_list_limit != data.gin_pending_list_limit %}
ALTER INDEX IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    SET (gin_pending_list_limit={{data.gin_pending_list_limit}});

{% elif (data.gin_pending_list_limit == '' or data.gin_pending_list_limit == None) and o_data.gin_pending_list_limit|default('', 'true') != data.gin_pending_list_limit %}
ALTER INDEX IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    RESET (gin_pending_list_limit);

{% endif %}
{## Changes deduplicate_items ##}
{% if data.deduplicate_items in [True, False] and o_data.deduplicate_items != data.deduplicate_items %}
ALTER INDEX IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    SET (deduplicate_items={{data.deduplicate_items}});

{% endif %}

{## Changes pages_per_range ##}
{% if data.pages_per_range and o_data.pages_per_range != data.pages_per_range %}
ALTER INDEX IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    SET (pages_per_range={{data.pages_per_range}});

{% elif (data.pages_per_range == '' or data.pages_per_range == None) and o_data.pages_per_range|default('', 'true') != data.pages_per_range %}
ALTER INDEX IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    RESET (pages_per_range);

{% endif %}
{## Changes buffering ##}
{% if data.buffering and o_data.buffering != data.buffering %}
ALTER INDEX IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    SET (buffering={{data.buffering}});

{% elif (data.buffering == '' or data.buffering == None) and o_data.buffering|default('', 'true') != data.buffering %}
ALTER INDEX IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    RESET (buffering);

{% endif %}
{## Changes fastupdate ##}
{% if data.fastupdate in [True, False] and o_data.fastupdate != data.fastupdate %}
ALTER INDEX IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    SET (fastupdate={{data.fastupdate}});

{% endif %}
{## Changes autosummarize ##}
{% if data.autosummarize in [True, False] and o_data.autosummarize != data.autosummarize %}
ALTER INDEX IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    SET (autosummarize={{data.autosummarize}});

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
    IS {{data.description|qtLiteral(conn)}};{% endif %}

{## Alter column statistics##}
{% if update_column %}
{% for col in update_column_data %}
ALTER INDEX IF EXISTS {{conn|qtIdent(data.schema, data.name)}}
    ALTER COLUMN {{col.col_num}} SET STATISTICS {{col.statistics}};

{% endfor %}
{% endif %}
