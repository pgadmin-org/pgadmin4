SELECT pg_catalog.array_to_string(pg_catalog.array_agg(inhrelname), ', ') inhrelname, attrname
FROM
 (SELECT
   inhparent::regclass AS inhrelname,
   a.attname AS attrname
  FROM pg_catalog.pg_inherits i
  LEFT JOIN pg_catalog.pg_attribute a ON
   (attrelid = inhparent AND attnum > 0)
  WHERE inhrelid = {{tid}}::oid
  ORDER BY inhseqno
 ) a
GROUP BY attrname;
