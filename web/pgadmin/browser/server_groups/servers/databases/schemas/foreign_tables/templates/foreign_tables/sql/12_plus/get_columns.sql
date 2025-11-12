WITH INH_TABLES AS
    (SELECT
     at.attname AS name, ph.inhparent AS inheritedid, ph.inhseqno,
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
SELECT INH.inheritedfrom, INH.inheritedid, att.attoptions, att.atttypid, attfdwoptions,
    att.attname as name, att.attndims, att.atttypmod, pg_catalog.format_type(t.oid,NULL) AS cltype,
    att.attnotnull, att.attstorage, att.attstattarget, att.attnum, pg_catalog.format_type(t.oid, att.atttypmod) AS fulltype,
    t.typstorage AS defaultstorage,
    CASE WHEN t.typelem > 0 THEN t.typelem ELSE t.oid END as elemoid,
    (CASE WHEN (att.attidentity in ('a', 'd')) THEN 'i' WHEN (att.attgenerated in ('s')) THEN 'g' ELSE 'n' END) AS colconstype,
    (CASE WHEN (att.attgenerated in ('s')) THEN pg_catalog.pg_get_expr(def.adbin, def.adrelid) END) AS genexpr,
    (SELECT nspname FROM pg_catalog.pg_namespace WHERE oid = t.typnamespace) as typnspname,
    pg_catalog.format_type(t.oid,NULL) AS typname,
    CASE WHEN length(cn.nspname::text) > 0 AND length(cl.collname::text) > 0 THEN
    pg_catalog.concat(cn.nspname, '."', cl.collname,'"')
    ELSE '' END AS collname,
    pg_catalog.pg_get_expr(def.adbin, def.adrelid) AS defval,
    (SELECT COUNT(1) from pg_catalog.pg_type t2 WHERE t2.typname=t.typname) > 1 AS isdup,
    des.description
FROM
    pg_catalog.pg_attribute att
LEFT JOIN
    INH_TABLES as INH ON att.attname = INH.name
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
LEFT OUTER JOIN
	pg_catalog.pg_description des ON (des.objoid=att.attrelid AND des.classoid='pg_class'::regclass AND des.objsubid = att.attnum)
WHERE
    att.attrelid={{foid}}::oid
    AND att.attnum>0
    ORDER BY att.attnum;
