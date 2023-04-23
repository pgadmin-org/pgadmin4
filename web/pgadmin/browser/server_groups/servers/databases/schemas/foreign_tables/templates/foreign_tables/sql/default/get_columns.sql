WITH INH_TABLES AS
    (SELECT
     distinct on (at.attname) attname, ph.inhparent AS inheritedid, ph.inhseqno,
     pg_catalog.concat(nmsp_parent.nspname, '.',parent.relname ) AS inheritedfrom
    FROM
        pg_catalog.pg_attribute at
    JOIN
        pg_catalog.pg_inherits ph ON ph.inhparent = at.attrelid AND ph.inhrelid = {{foid}}::oid
    JOIN
        pg_catalog.pg_class parent ON ph.inhparent  = parent.oid
    JOIN
        pg_catalog.pg_namespace nmsp_parent ON nmsp_parent.oid  = parent.relnamespace
    GROUP BY at.attname, ph.inhparent, ph.inhseqno, inheritedfrom
    ORDER BY at.attname, ph.inhparent, ph.inhseqno, inheritedfrom
    )
SELECT INH.inheritedfrom, INH.inheritedid, att.attoptions, attfdwoptions,
    att.attname, att.attndims, att.atttypmod, pg_catalog.format_type(t.oid,NULL) AS datatype,
    att.attnotnull, att.attstattarget, att.attnum, pg_catalog.format_type(t.oid, att.atttypmod) AS fulltype,
    CASE WHEN length(cn.nspname::text) > 0 AND length(cl.collname::text) > 0 THEN
    pg_catalog.concat(cn.nspname, '."', cl.collname,'"')
    ELSE '' END AS collname,
    pg_catalog.pg_get_expr(def.adbin, def.adrelid) AS typdefault,
    (SELECT COUNT(1) from pg_catalog.pg_type t2 WHERE t2.typname=t.typname) > 1 AS isdup
FROM
    pg_catalog.pg_attribute att
LEFT JOIN
    INH_TABLES as INH ON att.attname = INH.attname
JOIN
    pg_catalog.pg_type t ON t.oid=atttypid
JOIN
    pg_catalog.pg_namespace nsp ON t.typnamespace=nsp.oid
LEFT OUTER JOIN
    pg_catalog.pg_attrdef def ON adrelid=att.attrelid AND adnum=att.attnum
LEFT OUTER JOIN
    pg_catalog.pg_type b ON t.typelem=b.oid
LEFT OUTER JOIN
    pg_catalog.pg_collation cl ON att.attcollation=cl.oid
LEFT OUTER JOIN
    pg_catalog.pg_namespace cn ON cl.collnamespace=cn.oid
WHERE
    att.attrelid={{foid}}::oid
    AND att.attnum>0
    ORDER BY att.attnum;
