{# ========================== Fetch Materialized View Properties ========================= #}
{% if (vid and datlastsysoid) or scid %}
SELECT
    c.oid,
    c.xmin,
    c.relname AS name,
    c.reltablespace AS spcoid,
    c.relispopulated AS with_data,
    CASE WHEN length(spcname::text) > 0 THEN spcname ELSE
        (SELECT sp.spcname FROM pg_catalog.pg_database dtb
        JOIN pg_catalog.pg_tablespace sp ON dtb.dattablespace=sp.oid
        WHERE dtb.oid = {{ did }}::oid)
    END as spcname,
    (SELECT st.setting from pg_catalog.pg_settings st
    WHERE st.name = 'default_table_access_method') as default_amname,
    c.relacl,
    nsp.nspname as schema,
    pg_catalog.pg_get_userbyid(c.relowner) AS owner,
    description AS comment,
    pg_catalog.pg_get_viewdef(c.oid) AS definition,
    {# ============= Checks if it is system view ================ #}
    {% if vid and datlastsysoid %}
    CASE WHEN {{vid}} <= {{datlastsysoid}} THEN True ELSE False END AS system_view,
    {% endif %}
    pg_catalog.array_to_string(c.relacl::text[], ', ') AS acl,
    (SELECT pg_catalog.array_agg(provider || '=' || label) FROM pg_catalog.pg_seclabels sl1 WHERE sl1.objoid=c.oid AND sl1.objsubid=0) AS seclabels,
    substring(pg_catalog.array_to_string(c.reloptions, ',')
      FROM 'fillfactor=([0-9]*)') AS fillfactor,
    (substring(pg_catalog.array_to_string(c.reloptions, ',') FROM 'autovacuum_enabled=([a-z|0-9]*)'))::BOOL AS autovacuum_enabled,
    substring(pg_catalog.array_to_string(c.reloptions, ',')
      FROM 'autovacuum_vacuum_threshold=([0-9]*)') AS autovacuum_vacuum_threshold,
    substring(pg_catalog.array_to_string(c.reloptions, ',')
      FROM 'autovacuum_vacuum_scale_factor=([0-9]*[.]?[0-9]*)') AS autovacuum_vacuum_scale_factor,
    substring(pg_catalog.array_to_string(c.reloptions, ',')
      FROM 'autovacuum_analyze_threshold=([0-9]*)') AS autovacuum_analyze_threshold,
    substring(pg_catalog.array_to_string(c.reloptions, ',')
      FROM 'autovacuum_analyze_scale_factor=([0-9]*[.]?[0-9]*)') AS autovacuum_analyze_scale_factor,
    substring(pg_catalog.array_to_string(c.reloptions, ',')
      FROM 'autovacuum_vacuum_cost_delay=([0-9]*)') AS autovacuum_vacuum_cost_delay,
    substring(pg_catalog.array_to_string(c.reloptions, ',')
      FROM 'autovacuum_vacuum_cost_limit=([0-9]*)') AS autovacuum_vacuum_cost_limit,
    substring(pg_catalog.array_to_string(c.reloptions, ',')
      FROM 'autovacuum_freeze_min_age=([0-9]*)') AS autovacuum_freeze_min_age,
    substring(pg_catalog.array_to_string(c.reloptions, ',')
      FROM 'autovacuum_freeze_max_age=([0-9]*)') AS autovacuum_freeze_max_age,
    substring(pg_catalog.array_to_string(c.reloptions, ',')
      FROM 'autovacuum_freeze_table_age=([0-9]*)') AS autovacuum_freeze_table_age,
    (substring(pg_catalog.array_to_string(tst.reloptions, ',') FROM 'autovacuum_enabled=([a-z|0-9]*)'))::BOOL AS toast_autovacuum_enabled,
    substring(pg_catalog.array_to_string(tst.reloptions, ',')
      FROM 'autovacuum_vacuum_threshold=([0-9]*)') AS toast_autovacuum_vacuum_threshold,
    substring(pg_catalog.array_to_string(tst.reloptions, ',')
      FROM 'autovacuum_vacuum_scale_factor=([0-9]*[.]?[0-9]*)') AS toast_autovacuum_vacuum_scale_factor,
    substring(pg_catalog.array_to_string(tst.reloptions, ',')
      FROM 'autovacuum_analyze_threshold=([0-9]*)') AS toast_autovacuum_analyze_threshold,
    substring(pg_catalog.array_to_string(tst.reloptions, ',')
      FROM 'autovacuum_analyze_scale_factor=([0-9]*[.]?[0-9]*)') AS toast_autovacuum_analyze_scale_factor,
    substring(pg_catalog.array_to_string(tst.reloptions, ',')
      FROM 'autovacuum_vacuum_cost_delay=([0-9]*)') AS toast_autovacuum_vacuum_cost_delay,
    substring(pg_catalog.array_to_string(tst.reloptions, ',')
      FROM 'autovacuum_vacuum_cost_limit=([0-9]*)') AS toast_autovacuum_vacuum_cost_limit,
    substring(pg_catalog.array_to_string(tst.reloptions, ',')
      FROM 'autovacuum_freeze_min_age=([0-9]*)') AS toast_autovacuum_freeze_min_age,
    substring(pg_catalog.array_to_string(tst.reloptions, ',')
      FROM 'autovacuum_freeze_max_age=([0-9]*)') AS toast_autovacuum_freeze_max_age,
    substring(pg_catalog.array_to_string(tst.reloptions, ',')
      FROM 'autovacuum_freeze_table_age=([0-9]*)') AS toast_autovacuum_freeze_table_age,
    c.reloptions AS reloptions, tst.reloptions AS toast_reloptions, am.amname,
    (CASE WHEN c.reltoastrelid = 0 THEN false ELSE true END) AS hastoasttable
FROM
    pg_catalog.pg_class c
LEFT OUTER JOIN pg_catalog.pg_namespace nsp on nsp.oid = c.relnamespace
LEFT OUTER JOIN pg_catalog.pg_tablespace spc on spc.oid=c.reltablespace
LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=c.oid and des.objsubid=0 AND des.classoid='pg_class'::regclass)
LEFT OUTER JOIN pg_catalog.pg_class tst ON tst.oid = c.reltoastrelid
LEFT OUTER JOIN pg_catalog.pg_am am ON am.oid = c.relam
    WHERE ((c.relhasrules AND (EXISTS (
        SELECT
            r.rulename
        FROM
            pg_catalog.pg_rewrite r
        WHERE
            ((r.ev_class = c.oid)
                AND (pg_catalog.bpchar(r.ev_type) = '1'::bpchar)) )))
            AND (c.relkind = 'm'::char)
          )
{% if (vid and datlastsysoid) %}
    AND c.oid = {{vid}}::oid
{% elif scid %}
    AND c.relnamespace = {{scid}}::oid
ORDER BY
    c.relname
{% endif %}

{% elif type == 'roles' %}
SELECT
    pr.rolname
FROM
    pg_catalog.pg_roles pr
WHERE
    pr.rolcanlogin
ORDER BY
    pr.rolname

{% elif type == 'schemas' %}
SELECT
    nsp.nspname
FROM
    pg_catalog.pg_namespace nsp
WHERE
    (nsp.nspname NOT LIKE E'pg\\_%'
        AND nsp.nspname != 'information_schema')
{% endif %}
