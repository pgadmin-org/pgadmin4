SELECT c.oid AS oid, c.pubname AS name,
pubinsert AS evnt_insert, pubupdate AS evnt_update, pubdelete AS evnt_delete,
puballtables AS all_table,
pga.rolname AS pubowner FROM pg_catalog.pg_publication c
JOIN pg_catalog.pg_roles pga ON c.pubowner= pga.oid
{%  if pbid %}
    where c.oid = {{ pbid }}
{% endif %}
