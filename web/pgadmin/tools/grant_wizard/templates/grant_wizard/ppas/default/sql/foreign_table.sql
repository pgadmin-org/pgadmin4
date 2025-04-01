{# ===== Fetch list of Database object types(Tables) ===== #}
{% if node_id %}
SELECT
    rel.relname AS name,
    nsp.nspname AS nspname,
    'Foreign Table' AS object_type,
    'icon-coll-foreign_table' AS icon
FROM
    pg_catalog.pg_class rel
JOIN pg_catalog.pg_namespace nsp ON nsp.oid=rel.relnamespace

WHERE
    rel.relkind IN ('f') AND rel.relnamespace = {{ node_id }}::oid
ORDER BY
    rel.relname
{% endif %}
