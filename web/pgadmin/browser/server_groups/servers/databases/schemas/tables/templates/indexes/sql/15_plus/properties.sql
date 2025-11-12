SELECT DISTINCT ON (cls.relname)
  cls.oid,
  cls.relname AS name,
  idx.indrelid,
  idx.indkey,
  idx.indisclustered,
  idx.indisvalid,
  idx.indisunique,
  idx.indisprimary,
  n.nspname,
  idx.indnatts,
  COALESCE(cls.reltablespace, 0) AS spcoid,
  idx.indnullsnotdistinct,
  COALESCE(
    CASE
          WHEN (cls.reltablespace <> 0 OR cls.relkind = 'I') THEN ta.spcname
          ELSE (
              SELECT sp.spcname
              FROM pg_catalog.pg_database dtb
              JOIN pg_catalog.pg_tablespace sp ON dtb.dattablespace = sp.oid
              WHERE dtb.oid = {{ did }}::oid
              LIMIT 1
          )
      END, 'pg_default'
  ) AS spcname,
  con.conname,
  tab.relname AS tabname,
  idx.indclass,
  con.oid AS conoid,
  CASE
      WHEN con.contype IN ('p', 'u', 'x') THEN desp.description
      ELSE des.description
  END AS description,
  pg_catalog.pg_get_expr(idx.indpred, idx.indrelid, true) AS indconstraint,
  con.contype,
  con.condeferrable,
  con.condeferred,
  am.amname,
  EXISTS (
      SELECT 1 FROM pg_inherits inh WHERE inh.inhrelid = cls.oid
  ) AS is_inherited,
  -- Options (with defaults per index type)
    COALESCE(
        substring(array_to_string(cls.reloptions, ',') FROM 'fillfactor=([0-9]*)')::int,
        CASE am.amname
            WHEN 'btree' THEN 100
            WHEN 'gist' THEN 90
            ELSE NULL
        END
    ) AS fillfactor,
    COALESCE(
        CASE am.amname
            WHEN 'btree' THEN substring(array_to_string(cls.reloptions, ',') FROM 'deduplicate_items=([a-z]*)')::boolean
            ELSE NULL
        END,
        CASE am.amname WHEN 'btree' THEN TRUE ELSE NULL END
    ) AS deduplicate_items,
    COALESCE(
        CASE am.amname
            WHEN 'gin' THEN substring(array_to_string(cls.reloptions, ',') FROM 'gin_pending_list_limit=([0-9]*)')::int
            ELSE NULL
        END,
        CASE am.amname WHEN 'gin' THEN 4096 * 1024 ELSE NULL END
    ) AS gin_pending_list_limit,
    COALESCE(
        CASE am.amname
            WHEN 'brin' THEN substring(array_to_string(cls.reloptions, ',') FROM 'pages_per_range=([0-9]*)')::int
            ELSE NULL
        END,
        CASE am.amname WHEN 'brin' THEN 128 ELSE NULL END
    ) AS pages_per_range,
    COALESCE(
        CASE am.amname
            WHEN 'gist' THEN substring(array_to_string(cls.reloptions, ',') FROM 'buffering=([a-z]*)')
            ELSE NULL
        END,
        CASE am.amname WHEN 'gist' THEN 'auto' ELSE NULL END
    ) AS buffering,
    COALESCE(
        CASE am.amname
            WHEN 'gin' THEN substring(array_to_string(cls.reloptions, ',') FROM 'fastupdate=([a-z]*)')::boolean
            ELSE NULL
        END,
        CASE am.amname WHEN 'gin' THEN TRUE ELSE NULL END
    ) AS fastupdate,
    COALESCE(
        CASE am.amname
            WHEN 'brin' THEN substring(array_to_string(cls.reloptions, ',') FROM 'autosummarize=([a-z]*)')::boolean
            ELSE NULL
        END,
        CASE am.amname WHEN 'brin' THEN FALSE ELSE NULL END
    ) AS autosummarize,
    COALESCE(
        substring(array_to_string(cls.reloptions, ',') FROM 'lists=([0-9]*)')::int,
        NULL
    ) AS lists
    {% if datlastsysoid %}
        , (cls.oid <= {{ datlastsysoid }}::oid) AS is_sys_idx
    {% endif %}
FROM pg_catalog.pg_index idx
    JOIN pg_catalog.pg_class cls ON cls.oid = idx.indexrelid
    JOIN pg_catalog.pg_class tab ON tab.oid = idx.indrelid
    LEFT JOIN pg_catalog.pg_tablespace ta ON ta.oid = cls.reltablespace
    JOIN pg_catalog.pg_namespace n ON n.oid = tab.relnamespace
    JOIN pg_catalog.pg_am am ON am.oid = cls.relam
    LEFT JOIN pg_catalog.pg_depend dep ON dep.classid = cls.tableoid
        AND dep.objid = cls.oid
        AND dep.refobjsubid = 0
        AND dep.refclassid = (SELECT oid FROM pg_catalog.pg_class WHERE relname = 'pg_constraint')
        AND dep.deptype = 'i'
    LEFT JOIN pg_catalog.pg_constraint con ON con.tableoid = dep.refclassid AND con.oid = dep.refobjid
    LEFT JOIN pg_catalog.pg_description des ON des.objoid = cls.oid AND des.classoid = 'pg_class'::regclass
    LEFT JOIN pg_catalog.pg_description desp ON desp.objoid = con.oid AND desp.objsubid = 0 AND desp.classoid = 'pg_constraint'::regclass
WHERE idx.indrelid = {{ tid }}::OID
    {% if not show_sys_objects %}
    AND con.conname IS NULL
    {% endif %}
    {% if idx %}
    AND cls.oid = {{ idx }}::OID
    {% endif %}
ORDER BY cls.relname;
