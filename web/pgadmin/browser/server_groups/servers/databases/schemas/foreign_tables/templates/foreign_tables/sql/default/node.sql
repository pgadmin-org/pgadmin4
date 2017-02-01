SELECT
    c.oid, c.relname AS name, pg_get_userbyid(relowner) AS owner,
    ftoptions, nspname as basensp, description
FROM
    pg_class c
JOIN
    pg_foreign_table ft ON c.oid=ft.ftrelid
LEFT OUTER JOIN
    pg_namespace nsp ON (nsp.oid=c.relnamespace)
LEFT OUTER JOIN
    pg_description des ON (des.objoid=c.oid AND des.classoid='pg_class'::regclass)
WHERE
{% if scid %}
    c.relnamespace = {{scid}}::oid
{% elif foid %}
    c.oid = {{foid}}::oid
{% endif %}
ORDER BY c.relname;
