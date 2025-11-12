SELECT oid, pg_catalog.quote_ident(nspname)||'.'||pg_catalog.quote_ident(relname) AS table_name FROM
(SELECT
	r.oid, r.relname, n.nspname, pg_catalog.array_agg(a.attname) attnames, pg_catalog.array_agg(a.atttypid) atttypes
FROM
	(SELECT oid, relname, relnamespace FROM pg_catalog.pg_class
	  WHERE relkind in ('r', 'p') AND NOT relispartition) r
    JOIN (SELECT oid AS nspoid, nspname FROM
          pg_catalog.pg_namespace WHERE nspname NOT LIKE 'pg\_%') n
          ON (r.relnamespace = n.nspoid)
    JOIN (SELECT attrelid, attname, atttypid FROM
          pg_catalog.pg_attribute WHERE attnum > 0 ORDER BY attrelid, attnum) a
          ON (r.oid = a.attrelid)
GROUP BY r.oid, r.relname, r.relnamespace, n.nspname) all_tables
JOIN
(SELECT
	attrelid, pg_catalog.array_agg(attname) attnames, pg_catalog.array_agg(atttypid) atttypes
FROM
	(SELECT * FROM pg_catalog.pg_attribute
	  WHERE attrelid = {{ tid }} AND attnum > 0
	  ORDER BY attrelid, attnum) attributes
GROUP BY attrelid) current_table ON current_table.attrelid != all_tables.oid
  AND current_table.attnames = all_tables.attnames
  AND current_table.atttypes = all_tables.atttypes
