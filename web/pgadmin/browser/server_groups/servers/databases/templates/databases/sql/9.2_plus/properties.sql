SELECT
    db.oid as did, db.datname as name, db.dattablespace AS spcoid,
    spcname, datallowconn, pg_encoding_to_char(encoding) AS encoding,
    pg_get_userbyid(datdba) AS datowner, datcollate, datctype, datconnlimit,
    has_database_privilege(db.oid, 'CREATE') as cancreate,
    current_setting('default_tablespace') AS default_tablespace,
    descr.description as comments
	,(SELECT array_agg(provider || '=' || label) FROM pg_shseclabel sl1 WHERE sl1.objoid=db.oid) AS seclabels
FROM pg_database db
    LEFT OUTER JOIN pg_tablespace ta ON db.dattablespace=ta.OID
    LEFT OUTER JOIN pg_shdescription descr ON (
        db.oid=descr.objoid AND descr.classoid='pg_database'::regclass
    )
{% if did %}
WHERE db.oid= {{did}}::int
{% endif %}
{% if name %}
WHERE db.datname = {{name|qtLiteral}}
{% endif %}
ORDER BY datname
