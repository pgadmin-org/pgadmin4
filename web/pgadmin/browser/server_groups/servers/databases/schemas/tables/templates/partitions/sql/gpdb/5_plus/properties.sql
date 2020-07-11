SELECT rel.oid, rel.relname AS name, rel.reltablespace AS spcoid,rel.relacl AS relacl_str,
  (CASE WHEN length(spc.spcname::text) > 0 THEN spc.spcname ELSE
    (SELECT sp.spcname FROM pg_database dtb
    JOIN pg_tablespace sp ON dtb.dattablespace=sp.oid
    WHERE dtb.oid = {{ did }}::oid)
  END) as spcname,
  (select nspname FROM pg_namespace WHERE oid = {{scid}}::oid ) as parent_schema,
  nsp.nspname as schema,
  pg_get_userbyid(rel.relowner) AS relowner, rel.relhasoids,
  (CASE WHEN partitions.number_of_partitions > 0 THEN true ELSE false END) AS relispartition,
  rel.relhassubclass, rel.reltuples::bigint, des.description, con.conname, con.conkey,
	EXISTS(select 1 FROM pg_trigger
			JOIN pg_proc pt ON pt.oid=tgfoid AND pt.proname='logtrigger'
			JOIN pg_proc pc ON pc.pronamespace=pt.pronamespace AND pc.proname='slonyversion'
			WHERE tgrelid=rel.oid) AS isrepl,
	(SELECT count(*)
   FROM pg_trigger
   WHERE tgrelid = rel.oid AND tgisconstraint = FALSE) AS triggercount,
	(SELECT ARRAY(SELECT CASE WHEN (nspname NOT LIKE 'pg\_%') THEN
            quote_ident(nspname)||'.'||quote_ident(c.relname)
            ELSE quote_ident(c.relname) END AS inherited_tables
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhparent
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE i.inhrelid = rel.oid ORDER BY inhseqno)) AS coll_inherits,
  (SELECT count(*)
		FROM pg_inherits i
      JOIN pg_class c ON c.oid = i.inhparent
      JOIN pg_namespace n ON n.oid=c.relnamespace
		WHERE i.inhrelid = rel.oid) AS inherited_tables_cnt,
  false AS relpersistence,
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
	array_to_string(rel.reloptions, ',') AS table_vacuum_settings_str,
	array_to_string(tst.reloptions, ',') AS toast_table_vacuum_settings_str,
	rel.reloptions AS reloptions, tst.reloptions AS toast_reloptions, rel.reltype, typ.typname,
	typ.typrelid AS typoid,
	(CASE WHEN rel.reltoastrelid = 0 THEN false ELSE true END) AS hastoasttable,
    -- Added for pgAdmin4
	NULL AS seclabels,
	(CASE WHEN rel.oid <= {{ datlastsysoid}}::oid THEN true ElSE false END) AS is_sys_table,
	-- Added for partition table
	(CASE WHEN partitions.number_of_partitions > 0 THEN true ELSE false END) AS is_partitioned,
	'' AS partition_scheme,
	{% if ptid %}
	  (CASE WHEN partitions.number_of_partitions > 0 THEN partitions.expression ELSE '' END) AS partition_value,
	  (SELECT relname FROM pg_class WHERE oid = {{ tid }}::oid) AS partitioned_table_name
	{% else %}
	  partitions.expression AS partition_value
	{% endif %}

FROM pg_class rel
  LEFT OUTER JOIN pg_tablespace spc on spc.oid=rel.reltablespace
  LEFT OUTER JOIN pg_description des ON (des.objoid=rel.oid AND des.objsubid=0 AND des.classoid='pg_class'::regclass)
  LEFT OUTER JOIN pg_constraint con ON con.conrelid=rel.oid AND con.contype='p'
  LEFT OUTER JOIN pg_class tst ON tst.oid = rel.reltoastrelid
  LEFT JOIN pg_type typ ON rel.reltype=typ.oid
  LEFT JOIN pg_inherits inh ON inh.inhrelid = rel.oid
  LEFT JOIN pg_namespace nsp ON rel.relnamespace = nsp.oid
  LEFT JOIN (SELECT tablename, partitionboundary as expression, count(*) number_of_partitions FROM pg_partitions GROUP BY tablename, expression) partitions ON rel.relname = tablename
WHERE inh.inhparent = {{ tid }}::oid
{% if ptid %}  AND rel.oid = {{ ptid }}::oid {% endif %}
ORDER BY rel.relname;
