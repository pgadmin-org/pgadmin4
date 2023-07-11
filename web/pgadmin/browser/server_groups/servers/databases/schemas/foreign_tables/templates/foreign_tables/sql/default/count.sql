SELECT COUNT(*)
FROM
    pg_catalog.pg_class c
JOIN
    pg_catalog.pg_foreign_table ft ON c.oid=ft.ftrelid
WHERE
    c.relnamespace = {{scid}}::oid
