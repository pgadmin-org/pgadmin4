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
{% endif %} ORDER BY relname;
