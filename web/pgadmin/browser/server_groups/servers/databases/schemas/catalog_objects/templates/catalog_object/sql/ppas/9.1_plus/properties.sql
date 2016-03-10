SELECT
    c.oid, c.relname as name, r.rolname AS owner, description
FROM
    pg_class c
    LEFT OUTER JOIN pg_description d
        ON d.objoid=c.oid AND d.classoid='pg_class'::regclass
    LEFT JOIN pg_roles r ON c.relowner = r.oid
WHERE
    relnamespace = {{scid}}::int
{% if coid %} AND
    c.oid = {{coid}}::int
{% endif %} OR (
    -- On EnterpriseDB - ignore some objects in the catalog, whose name starts
    -- with _*, dual and type_object_source.
    SELECT 'sys' ~ (
        SELECT nsp.nspname FROM pg_namespace nsp
        WHERE nsp.oid = {{scid}}::int
    ) AND (
        c.relname NOT LIKE '\\_%' AND c.relname = 'dual' AND
        c.relname = 'type_object_source'
    )
)
ORDER BY relname;
