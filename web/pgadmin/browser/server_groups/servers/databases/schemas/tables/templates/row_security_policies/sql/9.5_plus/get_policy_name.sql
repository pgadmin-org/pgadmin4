{% if plid %}
SELECT
    pl.oid AS oid,
    pl.polname AS name
FROM
    pg_policy pl
WHERE
      pl.oid = {{ plid }}
{% endif %}
