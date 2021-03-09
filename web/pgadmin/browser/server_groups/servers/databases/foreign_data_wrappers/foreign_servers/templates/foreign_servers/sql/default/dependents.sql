{# ============= Get dependents of foreign server ============= #}
{% if fsid %}
SELECT um.umid as um_oid, um.usename as name, dep.deptype FROM pg_catalog.pg_user_mappings um
    LEFT JOIN pg_catalog.pg_depend dep ON dep.objid=um.umid
    WHERE um.srvid = {{ fsid }}::OID
{% endif %}
