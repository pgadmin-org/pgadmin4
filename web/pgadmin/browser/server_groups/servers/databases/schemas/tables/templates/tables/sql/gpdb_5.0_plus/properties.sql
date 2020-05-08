SELECT *,
	(CASE when pre_coll_inherits is NULL then ARRAY[]::varchar[] else pre_coll_inherits END) as coll_inherits
  {% if tid %}, (CASE WHEN is_partitioned THEN (SELECT substring(pg_get_partition_def({{ tid }}::oid, true) from 14)) ELSE '' END) AS partition_scheme {% endif %}
FROM (
	SELECT rel.oid, rel.relname AS name, rel.reltablespace AS spcoid,rel.relacl AS relacl_str,
		(CASE WHEN length(spc.spcname::text) > 0 THEN spc.spcname ELSE
			(SELECT sp.spcname FROM pg_database dtb
			JOIN pg_tablespace sp ON dtb.dattablespace=sp.oid
			WHERE dtb.oid = {{ did }}::oid)
		END) as spcname,
		(select nspname FROM pg_namespace WHERE oid = {{scid}}::oid ) as schema,
		pg_get_userbyid(rel.relowner) AS relowner, rel.relhasoids,
		rel.relhassubclass, rel.reltuples::bigint, des.description, con.conname, con.conkey,
		EXISTS(select 1 FROM pg_trigger
				JOIN pg_proc pt ON pt.oid=tgfoid AND pt.proname='logtrigger'
				JOIN pg_proc pc ON pc.pronamespace=pt.pronamespace AND pc.proname='slonyversion'
				WHERE tgrelid=rel.oid) AS isrepl,
		(SELECT count(*) FROM pg_trigger WHERE tgrelid=rel.oid) AS triggercount,
		(SELECT ARRAY(SELECT CASE WHEN (nspname NOT LIKE 'pg\_%') THEN
							quote_ident(nspname)||'.'||quote_ident(c.relname)
							ELSE quote_ident(c.relname) END AS inherited_tables
			FROM pg_inherits i
			JOIN pg_class c ON c.oid = i.inhparent
			JOIN pg_namespace n ON n.oid=c.relnamespace
			WHERE i.inhrelid = rel.oid ORDER BY inhseqno)) AS pre_coll_inherits,
		(SELECT count(*)
			FROM pg_inherits i
				JOIN pg_class c ON c.oid = i.inhparent
				JOIN pg_namespace n ON n.oid=c.relnamespace
			WHERE i.inhrelid = rel.oid) AS inherited_tables_cnt,
		false AS relpersistence,
		substring(array_to_string(rel.reloptions, ',') FROM 'fillfactor=([0-9]*)') AS fillfactor,
		substring(array_to_string(rel.reloptions, ',') FROM 'compresslevel=([0-9]*)') AS compresslevel,
		substring(array_to_string(rel.reloptions, ',') FROM 'blocksize=([0-9]*)') AS blocksize,
		substring(array_to_string(rel.reloptions, ',') FROM 'orientation=(row|column)') AS orientation,
		substring(array_to_string(rel.reloptions, ',') FROM 'appendonly=(true|false)')::boolean AS appendonly,
		substring(array_to_string(rel.reloptions, ',') FROM 'compresstype=(zlib|quicklz|rle_type|none)') AS compresstype,
		(CASE WHEN (substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_enabled=([a-z|0-9]*)') = 'true')
			THEN true ELSE false END) AS autovacuum_enabled,
		substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_vacuum_threshold=([0-9]*)') AS autovacuum_vacuum_threshold,
		substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_vacuum_scale_factor=([0-9]*[.]?[0-9]*)') AS autovacuum_vacuum_scale_factor,
		substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_analyze_threshold=([0-9]*)') AS autovacuum_analyze_threshold,
		substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_analyze_scale_factor=([0-9]*[.]?[0-9]*)') AS autovacuum_analyze_scale_factor,
		substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_vacuum_cost_delay=([0-9]*)') AS autovacuum_vacuum_cost_delay,
		substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_vacuum_cost_limit=([0-9]*)') AS autovacuum_vacuum_cost_limit,
		substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_freeze_min_age=([0-9]*)') AS autovacuum_freeze_min_age,
		substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_freeze_max_age=([0-9]*)') AS autovacuum_freeze_max_age,
		substring(array_to_string(rel.reloptions, ',') FROM 'autovacuum_freeze_table_age=([0-9]*)') AS autovacuum_freeze_table_age,
		(CASE WHEN (substring(array_to_string(tst.reloptions, ',') FROM 'autovacuum_enabled=([a-z|0-9]*)') =  'true')
			THEN true ELSE false END) AS toast_autovacuum_enabled,
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
		rel.reloptions AS reloptions, tst.reloptions AS toast_reloptions, NULL AS reloftype, typ.typname AS typname,
		typ.typrelid AS typoid,
		(CASE WHEN rel.reltoastrelid = 0 THEN false ELSE true END) AS hastoasttable,
		ARRAY[]::varchar[] AS seclabels,
		(CASE WHEN rel.oid <= {{ datlastsysoid}}::oid THEN true ElSE false END) AS is_sys_table,

		gdp.attrnums AS distribution,
    (CASE WHEN (SELECT count(*) from pg_partition where parrelid = rel.oid) > 0 THEN true ELSE false END) AS is_partitioned


	FROM pg_class rel
		LEFT OUTER JOIN pg_tablespace spc on spc.oid=rel.reltablespace
		LEFT OUTER JOIN pg_description des ON (des.objoid=rel.oid AND des.objsubid=0 AND des.classoid='pg_class'::regclass)
		LEFT OUTER JOIN pg_constraint con ON con.conrelid=rel.oid AND con.contype='p'
		LEFT OUTER JOIN pg_class tst ON tst.oid = rel.reltoastrelid
		LEFT OUTER JOIN gp_distribution_policy gdp ON gdp.localoid = rel.oid
		LEFT OUTER JOIN pg_type typ ON typ.oid = rel.reltype

	 WHERE rel.relkind IN ('r','s','t') AND rel.relnamespace = {{ scid }}
	{% if tid %}  AND rel.oid = {{ tid }}::oid {% endif %}
) AS TableInformation
 ORDER BY name
