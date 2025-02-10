SELECT DISTINCT att.attname as name, att.attnum as OID, pg_catalog.format_type(ty.oid,NULL) AS datatype,
att.attnotnull as not_null,
CASE WHEN att.atthasdef OR att.attidentity != '' THEN True
ELSE False END as has_default_val, des.description, seq.seqtypid
FROM pg_catalog.pg_attribute att
    JOIN pg_catalog.pg_type ty ON ty.oid=atttypid
    JOIN pg_catalog.pg_namespace tn ON tn.oid=ty.typnamespace
    JOIN pg_catalog.pg_class cl ON cl.oid=att.attrelid
    JOIN pg_catalog.pg_namespace na ON na.oid=cl.relnamespace
    LEFT OUTER JOIN pg_catalog.pg_type et ON et.oid=ty.typelem
    LEFT OUTER JOIN pg_catalog.pg_attrdef def ON adrelid=att.attrelid AND adnum=att.attnum
    LEFT OUTER JOIN (pg_catalog.pg_depend JOIN pg_catalog.pg_class cs ON classid='pg_class'::regclass AND objid=cs.oid AND cs.relkind='S') ON refobjid=att.attrelid AND refobjsubid=att.attnum
    LEFT OUTER JOIN pg_catalog.pg_namespace ns ON ns.oid=cs.relnamespace
    LEFT OUTER JOIN pg_catalog.pg_index pi ON pi.indrelid=att.attrelid AND indisprimary
    LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=att.attrelid AND des.objsubid=att.attnum AND des.classoid='pg_class'::regclass)
    LEFT OUTER JOIN pg_catalog.pg_sequence seq ON cs.oid=seq.seqrelid
WHERE

{% if tid %}
    att.attrelid = {{ tid|qtLiteral(conn) }}::oid
{% endif %}
{% if table_name and table_nspname %}
    cl.relname= {{table_name |qtLiteral(conn)}} and na.nspname={{table_nspname|qtLiteral(conn)}}
{% endif %}
{% if clid %}
    AND att.attnum = {{ clid|qtLiteral(conn) }}
{% endif %}
{### To show system objects ###}
{% if not show_sys_objects and not has_oids %}
    AND att.attnum > 0
{% endif %}
{### To show oids in view data ###}
{% if has_oids %}
    AND (att.attnum > 0 OR (att.attname = 'oid' AND att.attnum < 0))
{% endif %}
    AND att.attisdropped IS FALSE
ORDER BY att.attnum
