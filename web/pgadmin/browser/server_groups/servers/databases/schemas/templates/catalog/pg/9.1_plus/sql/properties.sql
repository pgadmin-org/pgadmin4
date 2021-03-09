{% import 'catalog/pg/macros/catalogs.sql' as CATALOGS %}
SELECT
    2 AS nsptyp,
    nsp.nspname AS name,
    nsp.oid,
    pg_catalog.array_to_string(nsp.nspacl::text[], ', ') as acl,
    r.rolname AS namespaceowner, description,
    has_schema_privilege(nsp.oid, 'CREATE') AS can_create,
    (SELECT pg_catalog.array_to_string(defaclacl::text[], ', ') FROM pg_catalog.pg_default_acl WHERE defaclobjtype = 'r' AND defaclnamespace = nsp.oid) AS tblacl,
    (SELECT pg_catalog.array_to_string(defaclacl::text[], ', ') FROM pg_catalog.pg_default_acl WHERE defaclobjtype = 'S' AND defaclnamespace = nsp.oid) AS seqacl,
    (SELECT pg_catalog.array_to_string(defaclacl::text[], ', ') FROM pg_catalog.pg_default_acl WHERE defaclobjtype = 'f' AND defaclnamespace = nsp.oid) AS funcacl
FROM
    pg_catalog.pg_namespace nsp
    LEFT OUTER JOIN pg_catalog.pg_description des ON
        (des.objoid=nsp.oid AND des.classoid='pg_namespace'::regclass)
    LEFT JOIN pg_catalog.pg_roles r ON (r.oid = nsp.nspowner)
WHERE
    {% if scid %}
    nsp.oid={{scid}}::oid AND
    {% endif %}
    (
{{ CATALOGS.LIST('nsp') }}
    )
ORDER BY 1, nspname;
