SELECT
    db.oid AS did, db.oid, db.datname AS name, db.dattablespace AS spcoid,
    spcname, datallowconn, pg_catalog.pg_encoding_to_char(encoding) AS encoding,
    pg_catalog.pg_get_userbyid(datdba) AS datowner, datcollate, datctype, datconnlimit,
    pg_catalog.has_database_privilege(db.oid, 'CREATE') AS cancreate,
    pg_catalog.current_setting('default_tablespace') AS default_tablespace,
    descr.description AS comments, db.datistemplate AS is_template,
    {### Default ACL for Tables ###}
    (SELECT pg_catalog.array_to_string(ARRAY(
        SELECT pg_catalog.array_to_string(defaclacl::text[], ', ')
            FROM pg_catalog.pg_default_acl
        WHERE defaclobjtype = 'r' AND defaclnamespace = 0::OID
    ), ', ')) AS tblacl,
    {### Default ACL for Sequnces ###}
    (SELECT pg_catalog.array_to_string(ARRAY(
        SELECT pg_catalog.array_to_string(defaclacl::text[], ', ')
            FROM pg_catalog.pg_default_acl
        WHERE defaclobjtype = 'S' AND defaclnamespace = 0::OID
    ), ', ')) AS seqacl,
    {### Default ACL for Functions ###}
    (SELECT pg_catalog.array_to_string(ARRAY(
        SELECT pg_catalog.array_to_string(defaclacl::text[], ', ')
            FROM pg_catalog.pg_default_acl
        WHERE defaclobjtype = 'f' AND defaclnamespace = 0::OID
    ), ', ')) AS funcacl,
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
