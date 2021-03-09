SELECT
    i.indexrelid,
    CASE i.indoption[i.attnum - 1]
    WHEN 0 THEN ARRAY['ASC', 'NULLS LAST']
    WHEN 1 THEN ARRAY['DESC', 'NULLS LAST']
    WHEN 2 THEN ARRAY['ASC', 'NULLS FIRST']
    WHEN 3 THEN ARRAY['DESC', 'NULLS FIRST']
    ELSE ARRAY['UNKNOWN OPTION' || i.indoption[i.attnum - 1]::text, '']
    END::text[] AS options,
    i.attnum,
    pg_catalog.pg_get_indexdef(i.indexrelid, i.attnum, true) as attdef,
    CASE WHEN (o.opcdefault = FALSE) THEN o.opcname ELSE null END AS opcname,
    op.oprname AS oprname,
	CASE WHEN length(nspc.nspname::text) > 0 AND length(coll.collname::text) > 0  THEN
	  pg_catalog.concat(pg_catalog.quote_ident(nspc.nspname), '.', pg_catalog.quote_ident(coll.collname))
	ELSE '' END AS collnspname
FROM (
      SELECT
          indexrelid, i.indoption, i.indclass,
          pg_catalog.unnest(ARRAY(SELECT pg_catalog.generate_series(1, i.indnkeyatts) AS n)) AS attnum
      FROM
          pg_catalog.pg_index i
      WHERE i.indexrelid = {{idx}}::OID
) i
    LEFT JOIN pg_catalog.pg_opclass o ON (o.oid = i.indclass[i.attnum - 1])
    LEFT OUTER JOIN pg_catalog.pg_constraint c ON (c.conindid = i.indexrelid)
    LEFT OUTER JOIN pg_catalog.pg_operator op ON (op.oid = c.conexclop[i.attnum])
    LEFT JOIN pg_catalog.pg_attribute a ON (a.attrelid = i.indexrelid AND a.attnum = i.attnum)
    LEFT OUTER JOIN pg_catalog.pg_collation coll ON a.attcollation=coll.oid
    LEFT OUTER JOIN pg_catalog.pg_namespace nspc ON coll.collnamespace=nspc.oid
ORDER BY i.attnum;
