SELECT
    db.oid as did, db.datname as name, ta.spcname as spcname, db.datallowconn,
    pg_catalog.has_database_privilege(db.oid, 'CREATE') as cancreate, datdba as owner
FROM
    pg_catalog.pg_database db
    LEFT OUTER JOIN pg_catalog.pg_tablespace ta ON db.dattablespace = ta.oid
WHERE {% if did %}
db.oid = {{ did|qtLiteral }}::OID{% else %}
db.oid > {{ last_system_oid }}::OID
{% endif %}
{% if db_restrictions %}

AND
db.datname in ({{db_restrictions}})
{% endif %}

{% if show_system_objects %}
AND db.datistemplate in (false, {{show_system_objects}})
{% else %}
AND db.datistemplate in (false)
{% endif %}

ORDER BY datname;
