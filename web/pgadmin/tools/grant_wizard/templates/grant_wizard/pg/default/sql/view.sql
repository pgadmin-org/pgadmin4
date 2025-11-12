{# ===== Fetch list of Database object types(View) ===== #}
{% if node_id and node_type %}
{% set ntype = "View" if node_type == 'v' else "Materialized View" %}
SELECT
    c.relname AS name,
    nsp.nspname AS nspname,
    '{{ ntype }}' AS object_type,
    'icon-view' AS icon
FROM
    pg_catalog.pg_class c
JOIN pg_catalog.pg_namespace nsp ON nsp.oid=c.relnamespace
LEFT OUTER JOIN pg_catalog.pg_tablespace spc ON spc.oid=c.reltablespace
LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=c.oid and des.objsubid=0 AND des.classoid='pg_class'::regclass)
LEFT OUTER JOIN pg_catalog.pg_class tst ON tst.oid = c.reltoastrelid
WHERE
    ((c.relhasrules AND (EXISTS (
      SELECT
          r.rulename
      FROM
          pg_catalog.pg_rewrite r
      WHERE
          ((r.ev_class = c.oid)
          AND (bpchar(r.ev_type) = '1'::bpchar))
      ))
     ) AND (c.relkind = '{{ node_type }}'::char)
    )
    AND c.relnamespace = {{ node_id }}::oid
ORDER BY
    c.relname
{% endif %}
