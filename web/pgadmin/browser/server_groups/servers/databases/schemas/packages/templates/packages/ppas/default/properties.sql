SELECT nsp.oid, nsp.xmin, nspname AS name,
    pg_catalog.edb_get_packagebodydef(nsp.oid) AS pkgbodysrc,
    pg_catalog.edb_get_packageheaddef(nsp.oid) AS pkgheadsrc,
    pg_catalog.pg_get_userbyid(nspowner) AS owner,
    pg_catalog.array_to_string(nsp.nspacl::text[], ', ') as acl,
    description,
    CASE
      WHEN nspname LIKE E'pg\\_%' THEN true
      ELSE false
      END AS is_sys_object
FROM pg_catalog.pg_namespace nsp
LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=nsp.oid AND des.classoid='pg_namespace'::regclass)
WHERE nspparent = {{scid}}::oid
{% if pkgid %}
AND nsp.oid = {{pkgid}}::oid
{% endif %}
AND nspobjecttype = 0
ORDER BY nspname;
