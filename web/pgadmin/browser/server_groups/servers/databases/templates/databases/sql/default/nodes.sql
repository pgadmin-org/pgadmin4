SELECT
    db.oid as did, db.datname as name, ta.spcname as spcname, db.datallowconn,
    has_database_privilege(db.oid, 'CREATE') as cancreate, datdba as owner
FROM
    pg_database db
    LEFT OUTER JOIN pg_tablespace ta ON db.dattablespace = ta.oid
WHERE {% if did %}
db.oid = {{ did|qtLiteral }}::OID{% else %}
db.oid > {{ last_system_oid }}::OID
{% endif %}
{% if db_restrictions %}

AND
db.datname in ({{db_restrictions}})
{% endif %}

ORDER BY datname;
