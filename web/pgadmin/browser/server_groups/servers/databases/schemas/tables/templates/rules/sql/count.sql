SELECT COUNT(*)
FROM
    pg_catalog.pg_rewrite rw
WHERE
{% if tid %}
    rw.ev_class = {{ tid }}
{% endif %}
