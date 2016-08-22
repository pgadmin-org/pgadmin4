SELECT nsp.oid, nsp.xmin, nspname AS name,
    pg_catalog.edb_get_packagebodydef(nsp.oid) AS pkgbodysrc,
    pg_catalog.edb_get_packageheaddef(nsp.oid) AS pkgheadsrc,
    pg_get_userbyid(nspowner) AS owner,
    array_to_string(nsp.nspacl::text[], ', ') as acl,
    description,
    CASE
      WHEN nspname LIKE E'pg\\_%' THEN true
      ELSE false
      END AS is_sys_object
FROM pg_namespace nsp
LEFT OUTER JOIN pg_description des ON (des.objoid=nsp.oid AND des.classoid='pg_namespace'::regclass)
WHERE nspparent = {{scid}}::oid
{% if pkgid %}
AND nsp.oid = {{pkgid}}::oid
{% endif %}
ORDER BY nspname;