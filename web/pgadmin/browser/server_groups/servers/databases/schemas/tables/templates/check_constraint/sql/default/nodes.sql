SELECT c.oid, conname as name,
    NOT convalidated as convalidated, conislocal, description as comment
    FROM pg_catalog.pg_constraint c
LEFT OUTER JOIN
    pg_catalog.pg_description des ON (des.objoid=c.oid AND
                           des.classoid='pg_constraint'::regclass)
WHERE contype = 'c'
    AND conrelid = {{ tid }}::oid
{% if cid %}
    AND c.oid = {{ cid }}::oid
{% endif %}
