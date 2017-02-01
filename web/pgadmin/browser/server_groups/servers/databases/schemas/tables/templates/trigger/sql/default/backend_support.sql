{#=============Checks if it is materialized view========#}
{% if vid %}
SELECT
    CASE WHEN c.relkind = 'm' THEN False ELSE True END As m_view
FROM
    pg_class c
WHERE
    c.oid = {{ vid }}::oid
{% endif %}
