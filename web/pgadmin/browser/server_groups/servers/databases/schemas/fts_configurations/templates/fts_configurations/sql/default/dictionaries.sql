{# FETCH DICTIONARIES statement #}
SELECT
	CASE WHEN (pg_ns.nspname != 'pg_catalog') THEN
        pg_catalog.CONCAT(pg_ns.nspname, '.', pg_td.dictname)
    ELSE pg_td.dictname END AS dictname
FROM pg_catalog.pg_ts_dict pg_td
LEFT OUTER JOIN pg_catalog.pg_namespace pg_ns
ON pg_td.dictnamespace = pg_ns.oid;
