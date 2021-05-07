{# The SQL given below will fetch composite type#}
{% if type == 'c' %}
SELECT attnum, attname, format_type(t.oid,NULL) AS typname, attndims, atttypmod, nsp.nspname,
    (SELECT COUNT(1) from pg_type t2 WHERE t2.typname=t.typname) > 1 AS isdup,
    NULL AS collname, NULL as collnspname, att.attrelid,
    format_type(t.oid, att.atttypmod) AS fulltype,
    CASE WHEN t.typelem > 0 THEN t.typelem ELSE t.oid END as elemoid
FROM pg_attribute att
    JOIN pg_type t ON t.oid=atttypid
    JOIN pg_namespace nsp ON t.typnamespace=nsp.oid
    LEFT OUTER JOIN pg_type b ON t.typelem=b.oid
    WHERE att.attrelid = {{typrelid}}::oid
    ORDER by attnum;
{% endif %}

{# The SQL given below will fetch enum type#}
{% if type == 'e' %}
SELECT enumlabel
FROM pg_enum
    WHERE enumtypid={{tid}}::oid
    ORDER by enumsortorder
{% endif %}

{# The SQL given below will fetch range type#}
{% if type == 'r' %}
SELECT rngsubtype, st.typname,
    rngcollation, NULL AS collname,
    rngsubopc, opc.opcname,
    rngcanonical, rngsubdiff
FROM pg_range
    LEFT JOIN pg_type st ON st.oid=rngsubtype
    LEFT JOIN pg_opclass opc ON opc.oid=rngsubopc
    WHERE rngtypid={{tid}}::oid;
{% endif %}
