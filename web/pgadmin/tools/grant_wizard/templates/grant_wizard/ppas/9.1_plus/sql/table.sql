{# ===== Fetch list of Database object types(Tables) ===== #}
{% if node_id %}
SELECT
    rel.relname AS name,
    nsp.nspname AS nspname,
    'Table' AS object_type,
    'icon-table' AS icon
FROM
    pg_class rel
JOIN pg_namespace nsp ON nsp.oid=rel.relnamespace
LEFT OUTER JOIN pg_tablespace spc ON spc.oid=rel.reltablespace
LEFT OUTER JOIN pg_description des ON (des.objoid=rel.oid AND des.objsubid=0 AND des.classoid='pg_class'::regclass)
LEFT OUTER JOIN pg_constraint con ON con.conrelid=rel.oid AND con.contype='p'
LEFT OUTER JOIN pg_class tst ON tst.oid = rel.reltoastrelid
LEFT JOIN pg_type typ ON rel.reloftype=typ.oid
WHERE
    rel.relkind IN ('r','s','t') AND rel.relnamespace = {{ node_id }}::oid
ORDER BY
    rel.relname
{% endif %}
