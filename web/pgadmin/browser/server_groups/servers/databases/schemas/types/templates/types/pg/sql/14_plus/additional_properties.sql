{# The SQL given below will fetch composite type#}
{% if typtype == 'c' %}
SELECT attnum, attname, pg_catalog.format_type(t.oid,NULL) AS typname, attndims, atttypmod, nsp.nspname,
    (SELECT COUNT(1) from pg_catalog.pg_type t2 WHERE t2.typname=t.typname) > 1 AS isdup,
    collname, nspc.nspname as collnspname, att.attrelid,
    pg_catalog.format_type(t.oid, att.atttypmod) AS fulltype,
    CASE WHEN t.typelem > 0 THEN t.typelem ELSE t.oid END as elemoid
FROM pg_catalog.pg_attribute att
    JOIN pg_catalog.pg_type t ON t.oid=atttypid
    JOIN pg_catalog.pg_namespace nsp ON t.typnamespace=nsp.oid
    LEFT OUTER JOIN pg_catalog.pg_type b ON t.typelem=b.oid
    LEFT OUTER JOIN pg_catalog.pg_collation c ON att.attcollation=c.oid
    LEFT OUTER JOIN pg_catalog.pg_namespace nspc ON c.collnamespace=nspc.oid
    WHERE att.attrelid = {{typrelid}}::oid
    ORDER by attnum;
{% endif %}

{# The SQL given below will fetch enum type#}
{% if typtype == 'e' %}
SELECT enumlabel
FROM pg_catalog.pg_enum
    WHERE enumtypid={{tid}}::oid
    ORDER by enumsortorder
{% endif %}

{# The SQL given below will fetch range type#}
{% if typtype == 'r' %}
SELECT rngsubtype, st.typname,
    rngcollation, mt.typname as rngmultirangetype,
    CASE WHEN n.nspname IS NOT NULL THEN pg_catalog.concat(pg_catalog.quote_ident(n.nspname), '.', pg_catalog.quote_ident(col.collname)) ELSE col.collname END AS collname,
    rngsubopc, opc.opcname,
    rngcanonical, rngsubdiff as rngsubdiff_proc,
    CASE WHEN length(ns.nspname::text) > 0 AND length(pgpr.proname::text) > 0  THEN
        pg_catalog.concat(quote_ident(ns.nspname), '.', pg_catalog.quote_ident(pgpr.proname))
    ELSE '' END AS rngsubdiff
FROM pg_catalog.pg_range
    LEFT JOIN pg_catalog.pg_type st ON st.oid=rngsubtype
    LEFT JOIN pg_catalog.pg_type mt ON mt.oid=rngmultitypid
    LEFT JOIN pg_catalog.pg_collation col ON col.oid=rngcollation
    LEFT JOIN pg_catalog.pg_namespace n ON col.collnamespace=n.oid
    LEFT JOIN pg_catalog.pg_opclass opc ON opc.oid=rngsubopc
    LEFT JOIN pg_catalog.pg_proc pgpr ON pgpr.oid = rngsubdiff
    LEFT JOIN pg_catalog.pg_namespace ns ON ns.oid=pgpr.pronamespace
    WHERE rngtypid={{tid}}::oid;
{% endif %}
