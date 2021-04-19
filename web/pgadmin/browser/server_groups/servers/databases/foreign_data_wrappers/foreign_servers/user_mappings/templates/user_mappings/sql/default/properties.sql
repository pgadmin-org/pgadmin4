{# ============= Get the properties of user mapping ============= #}
{% if fserid %}
SELECT srv.oid as fsrvid, srvname as name
FROM pg_catalog.pg_foreign_server srv
    LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=srv.oid AND des.objsubid=0 AND des.classoid='pg_foreign_server'::regclass)
WHERE srv.oid = {{fserid}}::oid
{% elif fsid or umid %}
SELECT u.umid AS oid, u.usename AS name, u.srvid AS fsid, umoptions AS umoptions, fs.srvfdw AS fdwid
FROM pg_catalog.pg_user_mappings u
LEFT JOIN pg_catalog.pg_foreign_server fs ON fs.oid = u.srvid
{% if fsid %} WHERE u.srvid = {{fsid}}::oid {% endif %} {% if umid %} WHERE u.umid= {{umid}}::oid {% endif %}
ORDER BY 2;
{% else %}
SELECT u.umid AS oid, u.usename AS name, u.srvid AS fsid, pg_catalog.array_to_string(u.umoptions, ',') AS umoptions, fs.srvfdw AS fdwid
FROM pg_catalog.pg_user_mappings u
LEFT JOIN pg_catalog.pg_foreign_server fs ON fs.oid = u.srvid
ORDER BY 2;
{% endif %}
