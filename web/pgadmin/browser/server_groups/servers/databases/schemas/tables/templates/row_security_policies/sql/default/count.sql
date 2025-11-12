SELECT COUNT(*)
FROM
    pg_catalog.pg_policy pl
WHERE
{% if tid %}
    pl.polrelid	 = {{ tid }}
{% endif %}
