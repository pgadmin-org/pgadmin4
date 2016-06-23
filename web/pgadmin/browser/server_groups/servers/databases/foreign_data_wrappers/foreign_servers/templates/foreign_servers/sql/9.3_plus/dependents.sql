{# ============= Get dependents of foreign server ============= #}
{% if fsid %}
WITH umapData AS
    (
        SELECT u.oid AS um_oid, CASE WHEN u.umuser = 0::oid THEN 'PUBLIC'::name ELSE a.rolname END AS name,
        array_to_string(u.umoptions, ',') AS umoptions FROM pg_user_mapping u
        LEFT JOIN pg_authid a ON a.oid = u.umuser WHERE u.umserver = {{ fsid }}::OID
    )

SELECT um.um_oid, name, dep.deptype FROM umapData um
    LEFT JOIN pg_depend dep ON dep.objid=um.um_oid
{% endif %}
