{% if data.mode is defined and data.mode == 'concurrently' %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.parent_schema, data.partitioned_table_name)}} DETACH PARTITION {{conn|qtIdent(data.schema, data.name)}} CONCURRENTLY;
{% elif data.mode is defined and data.mode == 'finalize' %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.parent_schema, data.partitioned_table_name)}} DETACH PARTITION {{conn|qtIdent(data.schema, data.name)}} FINALIZE;
{% else %}
ALTER TABLE IF EXISTS {{conn|qtIdent(data.parent_schema, data.partitioned_table_name)}} DETACH PARTITION {{conn|qtIdent(data.schema, data.name)}};
{% endif %}
