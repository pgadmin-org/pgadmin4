SELECT DISTINCT ON(cls.relname) cls.oid, cls.relname as name, indrelid, indkey, indisclustered,
    indisvalid, indisunique, indisprimary, n.nspname,indnatts,cls.reltablespace AS spcoid,
    CASE WHEN (length(spcname::text) > 0 OR cls.relkind = 'I') THEN spcname ELSE
        (SELECT sp.spcname FROM pg_catalog.pg_database dtb
        JOIN pg_catalog.pg_tablespace sp ON dtb.dattablespace=sp.oid
        WHERE dtb.oid = {{ did }}::oid)
    END as spcname, conname,
    tab.relname as tabname, indclass, con.oid AS conoid,
    CASE WHEN contype IN ('p', 'u', 'x') THEN desp.description
         ELSE des.description END AS description,
    pg_catalog.pg_get_expr(indpred, indrelid, true) as indconstraint, contype, condeferrable, condeferred, amname,
    (SELECT (CASE WHEN count(i.inhrelid) > 0 THEN true ELSE false END) FROM pg_inherits i WHERE i.inhrelid = cls.oid) as is_inherited,
    substring(pg_catalog.array_to_string(cls.reloptions, ',') from 'fillfactor=([0-9]*)') AS fillfactor,
    substring(pg_catalog.array_to_string(cls.reloptions, ',') from 'gin_pending_list_limit=([0-9]*)') AS gin_pending_list_limit,
    substring(pg_catalog.array_to_string(cls.reloptions, ',') from 'pages_per_range=([0-9]*)') AS pages_per_range,
    substring(pg_catalog.array_to_string(cls.reloptions, ',') from 'buffering=([a-z]*)') AS buffering,
    substring(pg_catalog.array_to_string(cls.reloptions, ',') from 'fastupdate=([a-z]*)')::boolean AS fastupdate,
    substring(pg_catalog.array_to_string(cls.reloptions, ',') from 'autosummarize=([a-z]*)')::boolean AS autosummarize,
    substring(pg_catalog.array_to_string(cls.reloptions, ',') from 'lists=([0-9]*)') AS lists
    {% if datlastsysoid %}, (CASE WHEN cls.oid <= {{ datlastsysoid}}::oid THEN true ElSE false END) AS is_sys_idx {% endif %}
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
{% if not show_sys_objects %}
    AND conname is NULL
{% endif %}
    {% if idx %}AND cls.oid = {{idx}}::OID {% endif %}
    ORDER BY cls.relname
