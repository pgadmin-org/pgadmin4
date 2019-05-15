{#=============Checks if it is partitioned table========#}
{% if tid %}
SELECT
    CASE WHEN c.relkind = 'p' THEN True ELSE False END As ptable
FROM
    pg_class c
WHERE
    c.oid = {{ tid }}::oid
{% endif %}
