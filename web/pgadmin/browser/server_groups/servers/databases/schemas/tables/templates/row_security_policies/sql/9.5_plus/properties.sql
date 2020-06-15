SELECT
    pl.oid AS oid,
    pl.polname AS name,
    rw.cmd AS event,
    rw.qual AS using,
    rw.with_check AS withcheck,
    array_to_string(rw.roles::name[], ', ') AS policyowner
FROM
    pg_policy pl
JOIN pg_policies rw ON pl.polname=rw.policyname
WHERE
{% if plid %}
      pl.oid = {{ plid }}
{% endif %}
{% if tid %}
      pl.polrelid = {{ tid }}
{% endif %};


