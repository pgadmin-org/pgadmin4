ALTER TABLE {{conn|qtIdent(data.parent_schema, data.partitioned_table_name)}} ATTACH PARTITION {{conn|qtIdent(data.schema, data.name)}}
    {{ data.partition_value }};
