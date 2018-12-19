SELECT
    i.indexrelid,
    CASE i.indoption[i.attnum - 1]
    WHEN 0 THEN ARRAY['ASC', 'NULLS LAST']
    WHEN 1 THEN ARRAY['DESC', 'NULLS FIRST']
    WHEN 2 THEN ARRAY['ASC', 'NULLS FIRST']
    WHEN 3 THEN ARRAY['DESC', 'NULLS  ']
    ELSE ARRAY['UNKNOWN OPTION' || i.indoption[i.attnum - 1]::text, '']
    END::text[] AS options,
    i.attnum,
    pg_get_indexdef(i.indexrelid, i.attnum, true) as attdef,
    CASE WHEN (o.opcdefault = FALSE) THEN o.opcname ELSE null END AS opcname,
    NULL AS oprname,
	  '' AS collnspname
FROM (
      SELECT
          indexrelid, i.indoption, i.indclass,
          unnest(ARRAY(SELECT generate_series(1, i.indnatts) AS n)) AS attnum
      FROM
          pg_index i
      WHERE i.indexrelid = {{idx}}::OID
) i
    LEFT JOIN pg_opclass o ON (o.oid = i.indclass[i.attnum - 1])
    LEFT JOIN pg_attribute a ON (a.attrelid = i.indexrelid AND a.attnum = i.attnum)
ORDER BY i.attnum;
