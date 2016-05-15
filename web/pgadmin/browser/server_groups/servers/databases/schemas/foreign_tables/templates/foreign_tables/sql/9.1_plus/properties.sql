SELECT
    c.oid, c.relname AS name, pg_get_userbyid(relowner) AS owner,
    ftoptions, srvname AS ftsrvname, description, nspname as basensp,
    (SELECT
        array_agg(provider || '=' || label)
    FROM
        pg_seclabel sl1
    WHERE
        sl1.objoid=c.oid) AS seclabels
FROM
    pg_class c
JOIN
    pg_foreign_table ft ON c.oid=ft.ftrelid
LEFT OUTER JOIN
    pg_foreign_server fs ON ft.ftserver=fs.oid
LEFT OUTER JOIN
    pg_description des ON (des.objoid=c.oid AND des.classoid='pg_class'::regclass)
LEFT OUTER JOIN
    pg_namespace nsp ON (nsp.oid=c.relnamespace)
WHERE
    c.relnamespace = {{scid}}::oid
    {% if foid %}
    AND c.oid = {{foid}}::oid
    {% endif %}
ORDER BY c.relname;
