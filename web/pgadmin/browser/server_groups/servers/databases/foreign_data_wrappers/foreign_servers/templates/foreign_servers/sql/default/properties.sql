{# ============= Give all the properties of foreign server ============= #}
{% if fdwid %}
SELECT fdw.oid as fdwoid, fdwname as name
FROM pg_catalog.pg_foreign_data_wrapper fdw
LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=fdw.oid AND des.objsubid=0 AND des.classoid='pg_foreign_data_wrapper'::regclass)
WHERE fdw.oid={{fdwid}}::oid
{% else %}
SELECT srv.oid, srvname as name, srvfdw as fdwid, srvtype as fsrvtype, srvversion as fsrvversion,
fdw.fdwname as fdwname, description, srvoptions AS fsrvoptions,
pg_catalog.pg_get_userbyid(srvowner) as fsrvowner, pg_catalog.array_to_string(srvacl::text[], ', ') as acl
FROM pg_catalog.pg_foreign_server srv
LEFT OUTER JOIN pg_catalog.pg_foreign_data_wrapper fdw on fdw.oid=srvfdw
LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=srv.oid AND des.objsubid=0 AND des.classoid='pg_foreign_server'::regclass)
{% if data and fdwdata %}
WHERE fdw.fdwname = {{ fdwdata.name|qtLiteral(conn) }}::text and srvname = {{ data.name|qtLiteral(conn) }}::text
{% elif fdwdata %}
WHERE fdw.fdwname = {{fdwdata.name|qtLiteral(conn)}}::text
{% endif %}
{% if fid %}
WHERE srvfdw={{fid}}::oid
{% endif %}
{% if fsid %}
WHERE srv.oid={{fsid}}::oid
{% endif %}
{% if schema_diff %}
WHERE CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
    WHERE objid = srv.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
ORDER BY srvname;
{% endif %}
