SELECT
    rw.oid AS oid,
    rw.rulename AS name,
    CASE WHEN rw.ev_enabled != 'D' THEN True ELSE False END AS enabled,
    rw.ev_enabled AS is_enable_rule

FROM
    pg_catalog.pg_rewrite rw
WHERE
{% if tid %}
    rw.ev_class = {{ tid }}
{% elif rid %}
    rw.oid = {{ rid }}
{% endif %}
ORDER BY
    rw.rulename
