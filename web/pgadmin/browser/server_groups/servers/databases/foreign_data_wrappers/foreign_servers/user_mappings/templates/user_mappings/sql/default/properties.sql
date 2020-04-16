{# ============= Get the properties of user mapping ============= #}
{% if fserid %}
SELECT srv.oid as fsrvid, srvname as name
FROM pg_foreign_server srv
    LEFT OUTER JOIN pg_description des ON (des.objoid=srv.oid AND des.objsubid=0 AND des.classoid='pg_foreign_server'::regclass)
WHERE srv.oid = {{fserid}}::oid
{% endif %}
{% if fsid or umid %}
SELECT u.umid AS um_oid, u.usename as name, array_to_string(u.umoptions, ',') AS umoptions
FROM pg_user_mappings u
{% if fsid %} WHERE u.srvid = {{fsid}}::oid {% endif %} {% if umid %} WHERE u.umid= {{umid}}::oid {% endif %}
ORDER BY 2;
{% endif %}
