{### To fetch trigger function information ###}
SELECT t.oid, t.xmin, t.*, relname, CASE WHEN relkind = 'r' THEN TRUE ELSE FALSE END AS parentistable,   nspname, des.description, l.lanname, p.prosrc,
  COALESCE(pg_catalog.substring(pg_catalog.pg_get_triggerdef(t.oid), 'WHEN (.*) EXECUTE PROCEDURE'), pg_catalog.substring(pg_catalog.pg_get_triggerdef(t.oid), 'WHEN (.*)  \$trigger')) AS whenclause
  FROM pg_catalog.pg_trigger t
  JOIN pg_catalog.pg_class cl ON cl.oid=tgrelid
  JOIN pg_catalog.pg_namespace na ON na.oid=relnamespace
  LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=t.oid AND des.classoid='pg_trigger'::regclass)
  LEFT OUTER JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid
  LEFT OUTER JOIN pg_catalog.pg_language l ON l.oid=p.prolang
 WHERE NOT tgisinternal
  AND tgrelid = {{table_id}}::oid AND t.oid = {{trigger_id}}::oid
 ORDER BY tgname
