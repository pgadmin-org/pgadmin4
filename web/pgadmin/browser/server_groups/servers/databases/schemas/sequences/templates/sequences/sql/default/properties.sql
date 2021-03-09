{% if scid %}
SELECT
    cl.oid as oid,
    relname as name,
    nsp.nspname as schema,
    pg_catalog.pg_get_userbyid(relowner) AS seqowner,
    description as comment,
    pg_catalog.array_to_string(relacl::text[], ', ') as acl,
    (SELECT pg_catalog.array_agg(provider || '=' || label) FROM pg_catalog.pg_seclabels sl1 WHERE sl1.objoid=cl.oid) AS securities
FROM pg_catalog.pg_class cl
    LEFT OUTER JOIN pg_catalog.pg_namespace nsp ON cl.relnamespace = nsp.oid
    LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=cl.oid
        AND des.classoid='pg_class'::regclass)
WHERE relkind = 'S' AND relnamespace  = {{scid}}::oid
{% if seid %}AND cl.oid = {{seid}}::oid {% endif %}
ORDER BY relname
{% endif %}
