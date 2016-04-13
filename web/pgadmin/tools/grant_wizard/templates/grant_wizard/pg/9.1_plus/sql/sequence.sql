{# ===== Fetch list of Database object types(Sequence) ===== #}
{% if node_id, nspname %}
SELECT
    cl.relname AS name,
    'Sequence' AS object_type,
    'icon-sequence' AS icon,
    '{{ nspname }}' AS nspname
FROM
    pg_class cl
LEFT OUTER JOIN pg_description des ON (des.objoid=cl.oid AND des.classoid='pg_class'::regclass)
WHERE
    relkind = 'S' AND relnamespace  = {{ node_id }}::oid
ORDER BY
    cl.relname
{% endif %}
