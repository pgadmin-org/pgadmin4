SELECT
    db.oid AS did, db.oid, db.datname AS name, db.dattablespace AS spcoid,
    spcname, datallowconn, pg_catalog.pg_encoding_to_char(encoding) AS encoding,
    pg_catalog.pg_get_userbyid(datdba) AS datowner,
    (select pg_catalog.current_setting('lc_collate')) as datcollate,
    (select pg_catalog.current_setting('lc_ctype')) as datctype,
    datconnlimit,
    pg_catalog.has_database_privilege(db.oid, 'CREATE') AS cancreate,
    pg_catalog.current_setting('default_tablespace') AS default_tablespace,
    descr.description AS comments, db.datistemplate AS is_template,
    {### Default ACL for Tables ###}
    '' AS tblacl,
    {### Default ACL for Sequnces ###}
    '' AS seqacl,
    {### Default ACL for Functions ###}
    '' AS funcacl,
    pg_catalog.array_to_string(datacl::text[], ', ') AS acl
FROM pg_catalog.pg_database db
    LEFT OUTER JOIN pg_catalog.pg_tablespace ta ON db.dattablespace=ta.OID
    LEFT OUTER JOIN pg_catalog.pg_shdescription descr ON (
        db.oid=descr.objoid AND descr.classoid='pg_database'::regclass
    )
WHERE {% if did %}
db.oid = {{ did|qtLiteral }}::OID{% else %}{% if name %}
db.datname = {{ name|qtLiteral }}::text{% else %}
db.oid > {{ last_system_oid|qtLiteral }}::OID
{% endif %}{% endif %}
{% if db_restrictions %}

AND
db.datname in ({{db_restrictions}})
{% endif %}

AND db.datistemplate in (false, {{show_system_objects}})

ORDER BY datname;
