SELECT DISTINCT ON(cls.relname) cls.oid, cls.relname as name
FROM pg_catalog.pg_index idx
    JOIN pg_catalog.pg_class cls ON cls.oid=indexrelid
    JOIN pg_catalog.pg_class tab ON tab.oid=indrelid
    LEFT OUTER JOIN pg_catalog.pg_tablespace ta on ta.oid=cls.reltablespace
    JOIN pg_catalog.pg_namespace n ON n.oid=tab.relnamespace
    JOIN pg_catalog.pg_am am ON am.oid=cls.relam
    LEFT JOIN pg_catalog.pg_depend dep ON (dep.classid = cls.tableoid AND dep.objid = cls.oid AND dep.refobjsubid = '0' AND dep.refclassid=(SELECT oid FROM pg_catalog.pg_class WHERE relname='pg_constraint') AND dep.deptype='i')
    LEFT OUTER JOIN pg_catalog.pg_constraint con ON (con.tableoid = dep.refclassid AND con.oid = dep.refobjid)
WHERE indrelid = {{tid}}::OID
    AND conname is NULL
{% if idx %}
    AND cls.oid = {{ idx }}::OID
{% endif %}
    ORDER BY cls.relname
