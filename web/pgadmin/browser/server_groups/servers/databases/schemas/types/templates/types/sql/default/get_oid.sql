{# Below will provide oid for newly created type #}
SELECT t.oid
FROM pg_type t
    LEFT OUTER JOIN pg_type e ON e.oid=t.typelem
    LEFT OUTER JOIN pg_class ct ON ct.oid=t.typrelid AND ct.relkind <> 'c'
    LEFT OUTER JOIN pg_description des ON (des.objoid=t.oid AND des.classoid='pg_type'::regclass)
WHERE t.typtype != 'd' AND t.typname NOT LIKE E'\\_%' AND t.typnamespace = {{scid}}::oid
{% if data %}
    AND t.typname = {{data.name|qtLiteral}}
{% endif %}
ORDER BY t.typname;
