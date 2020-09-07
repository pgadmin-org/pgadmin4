SELECT
    pl.oid AS oid,
    pl.polname AS name,
    rw.permissive as type,
    rw.cmd AS event,
    rw.qual AS using,
    rw.qual AS using_orig,
    rw.with_check AS withcheck,
    rw.with_check AS withcheck_orig,

    array_to_string(rw.roles::name[], ', ') AS policyowner
FROM
    pg_policy pl
JOIN pg_policies rw ON pl.polname=rw.policyname
JOIN pg_namespace n ON n.nspname=rw.schemaname
JOIN pg_class rel on rel.relname=rw.tablename
WHERE
{% if plid %}
      pl.oid = {{ plid }} and n.oid = {{ scid }} and rel.relfilenode = {{ policy_table_id }};
{% endif %}
{% if tid %}
      pl.polrelid = {{ tid }};
{% endif %}
