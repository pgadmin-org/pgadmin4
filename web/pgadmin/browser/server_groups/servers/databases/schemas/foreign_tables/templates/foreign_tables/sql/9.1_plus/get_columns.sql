SELECT
    attname, attndims, atttypmod, format_type(t.oid,NULL) AS datatype,
    format_type(t.oid, att.atttypmod) AS fulltype, attnotnull, attnum,
    (SELECT COUNT(1) from pg_type t2 WHERE t2.typname=t.typname) > 1 AS isdup
FROM
    pg_attribute att
JOIN
    pg_type t ON t.oid=atttypid
JOIN
    pg_namespace nsp ON t.typnamespace=nsp.oid
LEFT OUTER JOIN
    pg_type b ON t.typelem=b.oid
WHERE
    att.attrelid={{foid}}::oid
    AND attnum>0
ORDER by attnum;
