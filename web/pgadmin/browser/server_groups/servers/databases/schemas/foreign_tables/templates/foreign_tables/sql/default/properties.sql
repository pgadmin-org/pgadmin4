SELECT
    c.oid, c.relname AS name, pg_catalog.pg_get_userbyid(relowner) AS owner,
    pg_catalog.array_to_string(c.relacl::text[], ', ') as acl,
    ftoptions, srvname AS ftsrvname, description, nspname AS basensp,
    (SELECT
        pg_catalog.array_agg(provider || '=' || label)
    FROM
        pg_catalog.pg_seclabel sl1
    WHERE
        sl1.objoid=c.oid) AS seclabels
    {% if foid %},
    (SELECT
        pg_catalog.array_agg(i.inhparent) FROM pg_catalog.pg_inherits i
    WHERE
        i.inhrelid = {{foid}}::oid GROUP BY i.inhrelid) AS inherits
    {% endif %}
FROM
    pg_catalog.pg_class c
JOIN
    pg_catalog.pg_foreign_table ft ON c.oid=ft.ftrelid
LEFT OUTER JOIN
    pg_catalog.pg_foreign_server fs ON ft.ftserver=fs.oid
LEFT OUTER JOIN
    pg_catalog.pg_description des ON (des.objoid=c.oid AND des.classoid='pg_class'::regclass AND des.objsubid = 0)
LEFT OUTER JOIN
    pg_catalog.pg_namespace nsp ON (nsp.oid=c.relnamespace)
WHERE
    c.relnamespace = {{scid}}::oid
    {% if foid %}
    AND c.oid = {{foid}}::oid
    {% endif %}
ORDER BY c.relname;
