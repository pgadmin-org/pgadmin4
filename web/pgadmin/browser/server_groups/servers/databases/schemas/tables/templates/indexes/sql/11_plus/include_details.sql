-- pg_get_indexdef did not support INCLUDE columns

SELECT a.attname as colname
FROM (
    SELECT
      i.indnkeyatts,
      i.indrelid,
      unnest(indkey) AS table_colnum,
      unnest(ARRAY(SELECT generate_series(1, i.indnatts) AS n)) attnum
    FROM
      pg_index i
    WHERE i.indexrelid = {{idx}}::OID
) i JOIN pg_attribute a
ON (a.attrelid = i.indrelid AND i.table_colnum = a.attnum)
WHERE i.attnum > i.indnkeyatts
ORDER BY i.attnum
