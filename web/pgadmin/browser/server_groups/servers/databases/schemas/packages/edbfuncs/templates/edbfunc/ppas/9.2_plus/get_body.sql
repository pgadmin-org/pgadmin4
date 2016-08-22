SELECT  pg_catalog.edb_get_packagebodydef(nsp.oid) AS pkgbodysrc
FROM pg_namespace nsp
LEFT OUTER JOIN pg_description des ON (des.objoid=nsp.oid AND des.classoid='pg_namespace'::regclass)
WHERE nspparent = {{scid}}::oid
AND nsp.oid = {{pkgid}}::oid
AND nspobjecttype = 0;