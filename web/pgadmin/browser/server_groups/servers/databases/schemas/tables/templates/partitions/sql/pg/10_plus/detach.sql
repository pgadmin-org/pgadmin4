ALTER TABLE {{conn|qtIdent(data.parent_schema, data.partitioned_table_name)}} DETACH PARTITION {{conn|qtIdent(data.schema, data.name)}};
