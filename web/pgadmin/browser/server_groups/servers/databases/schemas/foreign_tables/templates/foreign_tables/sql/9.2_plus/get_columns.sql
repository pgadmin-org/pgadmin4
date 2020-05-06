SELECT
    attname, attndims, atttypmod, attoptions, attfdwoptions, format_type(t.oid,NULL) AS datatype,
    attnotnull, attstattarget, attnum, format_type(t.oid, att.atttypmod) AS fulltype,
    CASE WHEN length(cn.nspname::text) > 0 AND length(cl.collname::text) > 0 THEN
    concat(cn.nspname, '."', cl.collname,'"') ELSE '' END AS collname,
    (SELECT COUNT(1) from pg_type t2 WHERE t2.typname=t.typname) > 1 AS isdup,
    pg_catalog.pg_get_expr(def.adbin, def.adrelid) AS typdefault
FROM
    pg_attribute att
JOIN
    pg_type t ON t.oid=atttypid
JOIN
    pg_namespace nsp ON t.typnamespace=nsp.oid
LEFT OUTER JOIN
    pg_attrdef def ON adrelid=att.attrelid AND adnum=att.attnum
LEFT OUTER JOIN
    pg_type b ON t.typelem=b.oid
LEFT OUTER JOIN
    pg_collation cl ON att.attcollation=cl.oid
LEFT OUTER JOIN
    pg_namespace cn ON cl.collnamespace=cn.oid
WHERE
    att.attrelid={{foid}}::oid
    AND attnum>0
ORDER by attnum;
