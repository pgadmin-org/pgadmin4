{% import 'catalog/pg/macros/catalogs.sql' as CATALOGS %}
SELECT
    CASE
    WHEN (nspname LIKE E'pg\\_temp\\_%') THEN 1
    WHEN (nspname LIKE E'pg\\_%') THEN 0
    ELSE 3 END AS nsptyp,
    nsp.nspname AS name,
    nsp.oid,
    array_to_string(nsp.nspacl::text[], ', ') as acl,
    r.rolname AS namespaceowner, description,
    has_schema_privilege(nsp.oid, 'CREATE') AS can_create,
    {### Default ACL for Tables ###}
    (SELECT array_to_string(ARRAY(
        SELECT array_to_string(defaclacl::text[], ', ')
            FROM pg_default_acl
        WHERE defaclobjtype = 'r' AND defaclnamespace = nsp.oid
    ), ', ')) AS tblacl,
    {### Default ACL for Sequnces ###}
    (SELECT array_to_string(ARRAY(
        SELECT array_to_string(defaclacl::text[], ', ')
            FROM pg_default_acl
        WHERE defaclobjtype = 'S' AND defaclnamespace = nsp.oid
    ), ', ')) AS seqacl,
    {### Default ACL for Functions ###}
    (SELECT array_to_string(ARRAY(
        SELECT array_to_string(defaclacl::text[], ', ')
            FROM pg_default_acl
        WHERE defaclobjtype = 'f' AND defaclnamespace = nsp.oid
    ), ', ')) AS funcacl,
    {### Default ACL for Type ###}
    (SELECT array_to_string(ARRAY(
        SELECT array_to_string(defaclacl::text[], ', ')
            FROM pg_default_acl
        WHERE defaclobjtype = 'T' AND defaclnamespace = nsp.oid
    ), ', ')) AS typeacl,
    (SELECT array_agg(provider || '=' || label) FROM pg_seclabels sl1 WHERE sl1.objoid=nsp.oid) AS seclabels
FROM
    pg_namespace nsp
    LEFT OUTER JOIN pg_description des ON
        (des.objoid=nsp.oid AND des.classoid='pg_namespace'::regclass)
    LEFT JOIN pg_roles r ON (r.oid = nsp.nspowner)
WHERE
    {% if scid %}
    nsp.oid={{scid}}::oid AND
    {% else %}
    {% if not show_sysobj %}
    nspname NOT LIKE E'pg\\_%' AND
    {% endif %}
    {% endif %}
    NOT (
{{ CATALOGS.LIST('nsp') }}
    )
    {% if schema_restrictions %}
        AND
        nsp.nspname in ({{schema_restrictions}})
    {% endif %}
ORDER BY 1, nspname;
