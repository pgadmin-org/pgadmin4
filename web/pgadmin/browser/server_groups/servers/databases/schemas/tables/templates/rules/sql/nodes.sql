SELECT
    rw.oid AS oid,
    rw.rulename AS name
FROM
    pg_rewrite rw
WHERE
{% if tid %}
    rw.ev_class = {{ tid }}
{% elif rid %}
    rw.oid = {{ rid }}
{% endif %}
ORDER BY
    rw.rulename
