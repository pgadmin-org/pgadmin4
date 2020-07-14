SELECT rel.oid, rel.relname AS name,
    (SELECT count(*) FROM pg_trigger WHERE tgrelid=rel.oid AND tgisinternal = FALSE) AS triggercount,
    (SELECT count(*) FROM pg_trigger WHERE tgrelid=rel.oid AND tgisinternal = FALSE AND tgenabled = 'O') AS has_enable_triggers,
    pg_get_expr(rel.relpartbound, rel.oid) AS partition_value,
    rel.relnamespace AS schema_id,
    nsp.nspname AS schema_name,
    (CASE WHEN rel.relkind = 'p' THEN true ELSE false END) AS is_partitioned,
    (CASE WHEN rel.relkind = 'p' THEN true ELSE false END) AS is_sub_partitioned,
    (CASE WHEN rel.relkind = 'p' THEN pg_get_partkeydef(rel.oid::oid) ELSE '' END) AS partition_scheme,
    (CASE WHEN rel.relkind = 'p' THEN pg_get_partkeydef(rel.oid::oid) ELSE '' END) AS sub_partition_scheme,
    (CASE WHEN rel.relpersistence = 'u' THEN true ELSE false END) AS relpersistence,
	substring(array_to_string(rel.reloptions, ',') FROM 'fillfactor=([0-9]*)') AS fillfactor,
	(substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_enabled=([a-z|0-9]*)'))::BOOL AS autovacuum_enabled,
	substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_vacuum_threshold=([0-9]*)') AS autovacuum_vacuum_threshold,
	substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_vacuum_scale_factor=([0-9]*[.]?[0-9]*)') AS autovacuum_vacuum_scale_factor,
	substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_analyze_threshold=([0-9]*)') AS autovacuum_analyze_threshold,
	substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_analyze_scale_factor=([0-9]*[.]?[0-9]*)') AS autovacuum_analyze_scale_factor,
	substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_vacuum_cost_delay=([0-9]*)') AS autovacuum_vacuum_cost_delay,
	substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_vacuum_cost_limit=([0-9]*)') AS autovacuum_vacuum_cost_limit,
	substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_freeze_min_age=([0-9]*)') AS autovacuum_freeze_min_age,
	substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_freeze_max_age=([0-9]*)') AS autovacuum_freeze_max_age,
	substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_freeze_table_age=([0-9]*)') AS autovacuum_freeze_table_age,
	(substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_enabled=([a-z|0-9]*)'))::BOOL AS toast_autovacuum_enabled,
	substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_vacuum_threshold=([0-9]*)') AS toast_autovacuum_vacuum_threshold,
	substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_vacuum_scale_factor=([0-9]*[.]?[0-9]*)') AS toast_autovacuum_vacuum_scale_factor,
	substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_analyze_threshold=([0-9]*)') AS toast_autovacuum_analyze_threshold,
	substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_analyze_scale_factor=([0-9]*[.]?[0-9]*)') AS toast_autovacuum_analyze_scale_factor,
	substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_vacuum_cost_delay=([0-9]*)') AS toast_autovacuum_vacuum_cost_delay,
	substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_vacuum_cost_limit=([0-9]*)') AS toast_autovacuum_vacuum_cost_limit,
	substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_freeze_min_age=([0-9]*)') AS toast_autovacuum_freeze_min_age,
	substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_freeze_max_age=([0-9]*)') AS toast_autovacuum_freeze_max_age,
	substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_freeze_table_age=([0-9]*)') AS toast_autovacuum_freeze_table_age,
	rel.reloptions AS reloptions, tst.reloptions AS toast_reloptions, rel.reloftype, typ.typname,
	typ.typrelid AS typoid, des.description, pg_get_userbyid(rel.relowner) AS relowner
FROM
    (SELECT * FROM pg_inherits WHERE inhparent = {{ tid }}::oid) inh
    LEFT JOIN pg_class rel ON inh.inhrelid = rel.oid
    LEFT JOIN pg_namespace nsp ON rel.relnamespace = nsp.oid
    LEFT OUTER JOIN pg_class tst ON tst.oid = rel.reltoastrelid
    LEFT OUTER JOIN pg_description des ON (des.objoid=rel.oid AND des.objsubid=0 AND des.classoid='pg_class'::regclass)
    LEFT JOIN pg_type typ ON rel.reloftype=typ.oid
    WHERE rel.relispartition
    {% if ptid %} AND rel.oid = {{ ptid }}::OID {% endif %}
    ORDER BY rel.relname;
