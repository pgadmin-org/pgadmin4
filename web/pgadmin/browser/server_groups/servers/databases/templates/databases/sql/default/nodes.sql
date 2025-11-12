SELECT
    db.oid as did, db.datname as name, ta.spcname as spcname, db.datallowconn,
    db.datistemplate AS is_template,
    pg_catalog.has_database_privilege(db.oid, 'CREATE') as cancreate, datdba as owner,
    descr.description
FROM
    pg_catalog.pg_database db
    LEFT OUTER JOIN pg_catalog.pg_tablespace ta ON db.dattablespace = ta.oid
    LEFT OUTER JOIN pg_catalog.pg_shdescription descr ON (
        db.oid=descr.objoid AND descr.classoid='pg_database'::regclass
    )
WHERE {% if did %}
db.oid = {{ did|qtLiteral(conn) }}::OID
{% endif %}
{% if db_restrictions %}

{% if did %}AND{% endif %}
db.datname in ({{db_restrictions}})
{% elif not did%}
    {% if db_restrictions %} AND {%endif%}
    db.oid > {{ last_system_oid }}::OID OR db.datname IN ('postgres', 'edb')
{% endif %}

ORDER BY datname;
