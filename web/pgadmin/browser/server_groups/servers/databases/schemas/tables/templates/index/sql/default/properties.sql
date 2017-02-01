SELECT DISTINCT ON(cls.relname) cls.oid, cls.relname as name, indrelid, indkey, indisclustered,
    indisvalid, indisunique, indisprimary, n.nspname,indnatts,cls.reltablespace AS spcoid,
    COALESCE(spcname, 'pg_default') as spcname, tab.relname as tabname, indclass, con.oid AS conoid,
    CASE WHEN contype IN ('p', 'u', 'x') THEN desp.description
         ELSE des.description END AS description,
    pg_get_expr(indpred, indrelid, true) as indconstraint, contype, condeferrable, condeferred, amname,
    substring(array_to_string(cls.reloptions, ',') from 'fillfactor=([0-9]*)') AS fillfactor
    {% if datlastsysoid %}, (CASE WHEN cls.oid <= {{ datlastsysoid}}::oid THEN true ElSE false END) AS is_sys_idx {% endif %}
FROM pg_index idx
    JOIN pg_class cls ON cls.oid=indexrelid
    JOIN pg_class tab ON tab.oid=indrelid
    LEFT OUTER JOIN pg_tablespace ta on ta.oid=cls.reltablespace
    JOIN pg_namespace n ON n.oid=tab.relnamespace
    JOIN pg_am am ON am.oid=cls.relam
    LEFT JOIN pg_depend dep ON (dep.classid = cls.tableoid AND dep.objid = cls.oid AND dep.refobjsubid = '0' AND dep.refclassid=(SELECT oid FROM pg_class WHERE relname='pg_constraint') AND dep.deptype='i')
    LEFT OUTER JOIN pg_constraint con ON (con.tableoid = dep.refclassid AND con.oid = dep.refobjid)
    LEFT OUTER JOIN pg_description des ON (des.objoid=cls.oid AND des.classoid='pg_class'::regclass)
    LEFT OUTER JOIN pg_description desp ON (desp.objoid=con.oid AND desp.objsubid = 0 AND desp.classoid='pg_constraint'::regclass)
WHERE indrelid = {{tid}}::OID
    AND conname is NULL
    {% if idx %}AND cls.oid = {{idx}}::OID {% endif %}
    ORDER BY cls.relname