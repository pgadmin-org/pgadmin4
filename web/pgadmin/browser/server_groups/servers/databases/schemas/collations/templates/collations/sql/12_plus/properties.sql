SELECT c.oid, c.collname AS name, c.collcollate AS lc_collate, c.collctype AS lc_type,
    pg_catalog.pg_get_userbyid(c.collowner) AS owner, c.collisdeterministic AS is_deterministic, c.collversion AS version,
    c.collprovider AS provider, des.description, n.nspname AS schema

FROM pg_catalog.pg_collation c
    JOIN pg_catalog.pg_namespace n ON n.oid=c.collnamespace
    LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=c.oid AND des.classoid='pg_collation'::regclass)
WHERE c.collnamespace = {{scid}}::oid
{% if coid %}    AND c.oid = {{coid}}::oid {% endif %}
ORDER BY c.collname;
