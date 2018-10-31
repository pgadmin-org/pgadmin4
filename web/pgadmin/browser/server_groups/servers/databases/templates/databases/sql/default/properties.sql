SELECT
    db.oid AS did, db.oid, db.datname AS name, db.dattablespace AS spcoid,
    spcname, datallowconn, pg_encoding_to_char(encoding) AS encoding,
    pg_get_userbyid(datdba) AS datowner,
    (select current_setting('lc_collate')) as datcollate,
    (select current_setting('lc_ctype')) as datctype,
    datconnlimit,
    has_database_privilege(db.oid, 'CREATE') AS cancreate,
    current_setting('default_tablespace') AS default_tablespace,
    descr.description AS comments, db.datistemplate AS is_template,
    {### Default ACL for Tables ###}
    '' AS tblacl,
    {### Default ACL for Sequnces ###}
    '' AS seqacl,
    {### Default ACL for Functions ###}
    '' AS funcacl,
    array_to_string(datacl::text[], ', ') AS acl
FROM pg_database db
    LEFT OUTER JOIN pg_tablespace ta ON db.dattablespace=ta.OID
    LEFT OUTER JOIN pg_shdescription descr ON (
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

ORDER BY datname;
