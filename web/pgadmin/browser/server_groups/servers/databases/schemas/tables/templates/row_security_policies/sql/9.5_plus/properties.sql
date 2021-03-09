SELECT
    pl.oid AS oid,
    pl.polname AS name,
    rw.cmd AS event,
    rw.qual AS using,
    rw.qual AS using_orig,
    rw.with_check AS withcheck,
    rw.with_check AS withcheck_orig,

    pg_catalog.array_to_string(rw.roles::name[], ', ') AS policyowner
FROM
    pg_catalog.pg_policy pl
JOIN pg_catalog.pg_policies rw ON pl.polname=rw.policyname
JOIN pg_catalog.pg_namespace n ON n.nspname=rw.schemaname
JOIN pg_catalog.pg_class rel on rel.relname=rw.tablename
WHERE
{% if plid %}
      pl.oid = {{ plid }} and n.oid = {{ scid }} and rel.oid = {{ policy_table_id }};
{% endif %}
{% if tid %}
      pl.polrelid = {{ tid }};
{% endif %}
