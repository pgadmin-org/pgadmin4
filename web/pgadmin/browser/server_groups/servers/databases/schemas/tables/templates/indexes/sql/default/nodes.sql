SELECT DISTINCT ON(cls.relname) cls.oid, cls.relname as name,
(SELECT (CASE WHEN count(i.inhrelid) > 0 THEN true ELSE false END) FROM pg_inherits i WHERE i.inhrelid = cls.oid) as is_inherited,
CASE WHEN contype IN ('p', 'u', 'x') THEN desp.description ELSE des.description END AS description
FROM pg_catalog.pg_index idx
    JOIN pg_catalog.pg_class cls ON cls.oid=indexrelid
    JOIN pg_catalog.pg_class tab ON tab.oid=indrelid
    LEFT OUTER JOIN pg_catalog.pg_tablespace ta on ta.oid=cls.reltablespace
    JOIN pg_catalog.pg_namespace n ON n.oid=tab.relnamespace
    JOIN pg_catalog.pg_am am ON am.oid=cls.relam
    LEFT JOIN pg_catalog.pg_depend dep ON (dep.classid = cls.tableoid AND dep.objid = cls.oid AND dep.refobjsubid = '0' AND dep.refclassid=(SELECT oid FROM pg_catalog.pg_class WHERE relname='pg_constraint') AND dep.deptype='i')
    LEFT OUTER JOIN pg_catalog.pg_constraint con ON (con.tableoid = dep.refclassid AND con.oid = dep.refobjid)
    LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=cls.oid AND des.classoid='pg_class'::regclass)
    LEFT OUTER JOIN pg_catalog.pg_description desp ON (desp.objoid=con.oid AND desp.objsubid = 0 AND desp.classoid='pg_constraint'::regclass)
WHERE indrelid = {{tid}}::OID
    AND conname is NULL
{% if idx %}
    AND cls.oid = {{ idx }}::OID
{% endif %}
{% if schema_diff %}
    AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
        WHERE objid = cls.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
    ORDER BY cls.relname
