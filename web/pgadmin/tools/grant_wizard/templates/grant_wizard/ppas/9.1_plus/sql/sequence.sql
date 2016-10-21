{# ===== Fetch list of Database object types(Sequence) ===== #}
{% if node_id %}
SELECT
    cl.relname AS name,
    nsp.nspname AS nspname,
    'Sequence' AS object_type,
    'icon-sequence' AS icon
FROM
    pg_class cl
JOIN pg_namespace nsp ON nsp.oid=cl.relnamespace
LEFT OUTER JOIN pg_description des ON (des.objoid=cl.oid AND des.classoid='pg_class'::regclass)
WHERE
    relkind = 'S' AND relnamespace  = {{ node_id }}::oid
ORDER BY
    cl.relname
{% endif %}
