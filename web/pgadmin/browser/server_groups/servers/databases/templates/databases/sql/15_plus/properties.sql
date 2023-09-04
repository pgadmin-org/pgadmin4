SELECT
    db.oid AS did, db.oid, db.datname AS name, db.dattablespace AS spcoid,
    spcname, datallowconn, pg_catalog.pg_encoding_to_char(encoding) AS encoding,
    pg_catalog.pg_get_userbyid(datdba) AS datowner,
    (select pg_catalog.current_setting('lc_collate')) as datcollate,
    (select pg_catalog.current_setting('lc_ctype')) as datctype,
    CASE WHEN datlocprovider = 'i' THEN 'icu' ELSE 'libc' END datlocaleprovider,
    daticulocale, datcollversion,
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
WHERE
{% if show_user_defined_templates is defined  %}
     db.datistemplate = {{show_user_defined_templates}} AND
{% endif %}
{% if did %}
    db.oid = {{ did|qtLiteral(conn) }}::OID
{% else %}
    {% if name %}
        db.datname = {{ name|qtLiteral(conn) }}::text
    {% endif %}
{% endif %}

{% if db_restrictions %}
    {% if did or name %}AND{% endif %}
    db.datname in ({{db_restrictions}})
{% elif not did and not name%}
    db.oid > {{ last_system_oid }}::OID OR db.datname IN ('postgres', 'edb')
{% endif %}

ORDER BY datname;
