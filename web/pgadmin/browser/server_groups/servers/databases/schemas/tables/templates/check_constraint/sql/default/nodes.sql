SELECT c.oid, conname as name,
    NOT convalidated as convalidated, conislocal
    FROM pg_catalog.pg_constraint c
WHERE contype = 'c'
    AND conrelid = {{ tid }}::oid
{% if cid %}
    AND c.oid = {{ cid }}::oid
{% endif %}
