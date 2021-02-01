SELECT c.oid AS oid, c.pubname AS name,
pubinsert AS evnt_insert, pubupdate AS evnt_update, pubdelete AS evnt_delete, pubtruncate AS evnt_truncate,
puballtables AS all_table,
pga.rolname AS pubowner FROM pg_publication c
JOIN pg_authid pga ON c.pubowner= pga.oid
{%  if pbid %}
    WHERE c.oid = {{ pbid }}
{% endif %}
