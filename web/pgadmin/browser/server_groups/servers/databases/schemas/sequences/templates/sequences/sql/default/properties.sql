{% if scid %}
SELECT
    cl.oid as oid,
    cl.relname as name,
    nsp.nspname as schema,
    pg_catalog.pg_get_userbyid(cl.relowner) AS seqowner,
    description as comment,
    pg_catalog.array_to_string(cl.relacl::text[], ', ') as acl,
    (SELECT pg_catalog.array_agg(provider || '=' || label) FROM pg_catalog.pg_seclabels sl1 WHERE sl1.objoid=cl.oid) AS securities,
    depcl.relname AS owned_table,
    att.attname AS owned_column
FROM pg_catalog.pg_class cl
    LEFT OUTER JOIN pg_catalog.pg_namespace nsp ON cl.relnamespace = nsp.oid
    LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=cl.oid
        AND des.classoid='pg_class'::regclass)
	LEFT OUTER JOIN pg_catalog.pg_depend dep ON (dep.objid=cl.oid and deptype = 'a')
	LEFT JOIN pg_catalog.pg_attribute att ON dep.refobjid=att.attrelid AND dep.refobjsubid=att.attnum
	LEFT JOIN pg_catalog.pg_class depcl ON depcl.oid = att.attrelid
WHERE cl.relkind = 'S' AND cl.relnamespace  = {{scid}}::oid
{% if seid %}AND cl.oid = {{seid}}::oid {% endif %}
ORDER BY cl.relname
{% endif %}
