{# ============= Get the properties of user mapping ============= #}
{% if fserid %}
SELECT srv.oid as fsrvid, srvname as name
FROM pg_foreign_server srv
    LEFT OUTER JOIN pg_description des ON (des.objoid=srv.oid AND des.objsubid=0 AND des.classoid='pg_foreign_server'::regclass)
WHERE srv.oid = {{fserid}}::int
{% endif %}
{% if fsid or umid or fdwdata or data %}
WITH umapData AS
    (
        SELECT u.oid AS um_oid, CASE WHEN u.umuser = 0::oid THEN 'PUBLIC'::name ELSE a.rolname END AS name,
        array_to_string(u.umoptions, ',') AS umoptions FROM pg_user_mapping u
        LEFT JOIN pg_authid a ON a.oid = u.umuser {% if fsid %} WHERE u.umserver = {{fsid}}::int {% endif %} {% if umid %} WHERE u.oid= {{umid}}::int {% endif %}
    )
    SELECT * FROM umapData
{% if data %}
    WHERE {% if data.name == "CURRENT_USER" %} name = {{data.name}} {% elif data.name == "PUBLIC" %} name = {{data.name|qtLiteral}} {% else %} name = {{data.name|qtLiteral}} {% endif %}
{% endif %}
{% if fdwdata %}
    WHERE fdw.fdwname = {{fdwdata.name|qtLiteral}}::text
{% endif %}
    ORDER BY 2;
{% endif %}
