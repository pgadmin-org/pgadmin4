SELECT c.oid, conname as name, relname, nspname, description as comment ,
       pg_get_expr(conbin, conrelid, true) as consrc
    FROM pg_constraint c
    JOIN pg_class cl ON cl.oid=conrelid
    JOIN pg_namespace nl ON nl.oid=relnamespace
LEFT OUTER JOIN
    pg_description des ON (des.objoid=c.oid AND
                           des.classoid='pg_constraint'::regclass)
WHERE contype = 'c'
    AND conrelid = {{ tid }}::oid
{% if cid %}
    AND c.oid = {{ cid }}::oid
{% endif %}