SELECT ct.oid,
      conname as name,
      condeferrable,
      condeferred,
      confupdtype,
      confdeltype,
      CASE confmatchtype
        WHEN 's' THEN FALSE
        WHEN 'f' THEN TRUE
      END AS confmatchtype,
      conkey,
      confkey,
      confrelid,
      nl.nspname as fknsp,
      cl.relname as fktab,
      nr.nspname as refnsp,
      cr.relname as reftab,
      description as comment,
      NOT convalidated as convalidated
FROM pg_constraint ct
JOIN pg_class cl ON cl.oid=conrelid
JOIN pg_namespace nl ON nl.oid=cl.relnamespace
JOIN pg_class cr ON cr.oid=confrelid
JOIN pg_namespace nr ON nr.oid=cr.relnamespace
LEFT OUTER JOIN pg_description des ON (des.objoid=ct.oid AND des.classoid='pg_constraint'::regclass)
WHERE contype='f' AND
conrelid = {{tid}}::oid
{% if cid %}
AND ct.oid = {{cid}}::oid
{% endif %}
ORDER BY conname