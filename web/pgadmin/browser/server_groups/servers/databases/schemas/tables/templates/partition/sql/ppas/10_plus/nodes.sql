SELECT rel.oid, rel.relname AS name,
    (SELECT count(*) FROM pg_trigger WHERE tgrelid=rel.oid AND tgisinternal = FALSE) AS triggercount,
    (SELECT count(*) FROM pg_trigger WHERE tgrelid=rel.oid AND tgisinternal = FALSE AND tgenabled = 'O') AS has_enable_triggers,
    pg_get_expr(rel.relpartbound, rel.oid) AS partition_value,
    rel.relnamespace AS schema_id,
    nsp.nspname AS schema_name,
    (CASE WHEN rel.relkind = 'p' THEN true ELSE false END) AS is_partitioned,
    (CASE WHEN rel.relkind = 'p' THEN pg_get_partkeydef(rel.oid::oid) ELSE '' END) AS partition_scheme
FROM
    (SELECT * FROM pg_inherits WHERE inhparent = {{ tid }}::oid) inh
    LEFT JOIN pg_class rel ON inh.inhrelid = rel.oid
    LEFT JOIN pg_namespace nsp ON rel.relnamespace = nsp.oid
    WHERE rel.relispartition
    {% if ptid %} AND rel.oid = {{ ptid }}::OID {% endif %}
    ORDER BY rel.relname;
