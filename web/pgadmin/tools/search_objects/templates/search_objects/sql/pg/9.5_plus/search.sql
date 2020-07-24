{% import 'catalog/pg/macros/catalogs.sql' as CATALOGS %}
{% set all_obj = false %}
{% if obj_type == 'all' or obj_type is none %}
{% set all_obj = true %}
{% endif %}
SELECT obj_type, obj_name,
    REPLACE(obj_path, '/'||sn.schema_name||'/', '/'||{{ CATALOGS.LABELS_SCHEMACOL('sn.schema_name', _) }}||'/') AS obj_path,
    schema_name, show_node, other_info,
    CASE
        WHEN {{ CATALOGS.IS_CATALOG_SCHEMA('sn.schema_name') }} THEN
            CASE WHEN {{ CATALOGS.DB_SUPPORT_SCHEMACOL('sn.schema_name') }} THEN 'D' ELSE 'O' END
        ELSE 'N'
    END AS catalog_level
FROM (
{% if all_obj or obj_type in ['table', 'sequence', 'view', 'mview'] %}
    SELECT
    CASE
        WHEN c.relkind in ('r', 't') THEN 'table'
        WHEN c.relkind = 'S' THEN 'sequence'
        WHEN c.relkind = 'v' THEN 'view'
        WHEN c.relkind = 'm' THEN 'mview'
        ELSE 'should not happen'
    END::text AS obj_type, c.relname AS obj_name,
    ':schema.'|| n.oid || ':/' || n.nspname || '/' ||
    CASE
        WHEN c.relkind in ('r', 't') THEN ':table.'
        WHEN c.relkind = 'S' THEN ':sequence.'
        WHEN c.relkind = 'v' THEN ':view.'
        WHEN c.relkind = 'm' THEN ':mview.'
        ELSE 'should not happen'
    END || c.oid ||':/' || c.relname AS obj_path, n.nspname AS schema_name,
    CASE
        WHEN c.relkind in ('r', 't') THEN {{ show_node_prefs['table'] }}
        WHEN c.relkind = 'S' THEN {{ show_node_prefs['sequence'] }}
        WHEN c.relkind = 'v' THEN {{ show_node_prefs['view'] }}
        WHEN c.relkind = 'm' THEN {{ show_node_prefs['mview'] }}
        ELSE False
    END AS show_node, NULL AS other_info
    FROM pg_class c
    LEFT JOIN pg_namespace n ON n.oid = c.relnamespace
    {% if all_obj %}
    WHERE c.relkind in ('r','t','S','v','m')
    {% elif obj_type == 'table' %}
    WHERE c.relkind  in ('r', 't')
    {% elif obj_type == 'sequence' %}
    WHERE c.relkind  = 'S'
    {% elif obj_type == 'view' %}
    WHERE c.relkind  = 'v'
    {% elif obj_type == 'mview' %}
    WHERE c.relkind  = 'm'
    {% endif %}
    AND CASE WHEN c.relkind in ('S', 'm') THEN {{ CATALOGS.DB_SUPPORT('n') }} ELSE true END
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['index'] %}
    SELECT 'index'::text AS obj_type, cls.relname AS obj_name,
    ':schema.'|| n.oid || ':/' || n.nspname || '/:table.'|| tab.oid ||':/' || tab.relname || '/:index.'|| cls.oid ||':/' || cls.relname AS obj_path, n.nspname AS schema_name,
    {{ show_node_prefs['index'] }} AS show_node, NULL AS other_info
    FROM pg_index idx
    JOIN pg_class cls ON cls.oid=indexrelid
    JOIN pg_class tab ON tab.oid=indrelid
    JOIN pg_namespace n ON n.oid=tab.relnamespace
    LEFT JOIN pg_depend dep ON (dep.classid = cls.tableoid AND dep.objid = cls.oid AND dep.refobjsubid = '0' AND dep.refclassid=(SELECT oid FROM pg_class WHERE relname='pg_constraint') AND dep.deptype='i')
    LEFT OUTER JOIN pg_constraint con ON (con.tableoid = dep.refclassid AND con.oid = dep.refobjid)
    LEFT OUTER JOIN pg_description des ON des.objoid=cls.oid
    LEFT OUTER JOIN pg_description desp ON (desp.objoid=con.oid AND desp.objsubid = 0)
    WHERE contype IS NULL
    AND {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['trigger_function', 'function'] %}
    SELECT
        CASE
        WHEN t.typname IN ('trigger', 'event_trigger') THEN 'trigger_function'
        ELSE 'function' END::text AS obj_type, p.proname AS obj_name,
    ':schema.'|| n.oid || ':/' || n.nspname || '/' || case when t.typname = 'trigger' then ':trigger_function.' else ':function.' end || p.oid ||':/' || p.proname AS obj_path, n.nspname AS schema_name,
    CASE WHEN t.typname IN ('trigger', 'event_trigger') THEN {{ show_node_prefs['trigger_function'] }} ELSE {{ show_node_prefs['function'] }} END AS show_node,
    pg_catalog.pg_get_function_identity_arguments(p.oid) AS other_info
    from pg_proc p
    left join pg_namespace n on p.pronamespace = n.oid
    left join pg_type t on p.prorettype = t.oid
    WHERE ({{ CATALOGS.DB_SUPPORT('n') }})
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['event_trigger'] %}
    select 'event_trigger'::text AS obj_type, evtname AS obj_name, ':event_trigger.'||oid||':/' || evtname AS obj_path, ''::text AS schema_name,
    {{ show_node_prefs['index'] }} AS show_node, NULL AS other_info from pg_event_trigger
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['schema'] %}
    select 'schema'::text AS obj_type, n.nspname AS obj_name,
    ':schema.'||n.oid||':/' || n.nspname as obj_path, n.nspname AS schema_name,
    {{ show_node_prefs['schema'] }} AS show_node, NULL AS other_info from pg_namespace n
    where {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['column'] %}
    select 'column'::text AS obj_type, a.attname AS obj_name,
    ':schema.'||n.oid||':/' || n.nspname || '/' ||
    case
        WHEN t.relkind in ('r', 't') THEN ':table.'
        WHEN t.relkind = 'v' THEN ':view.'
        WHEN t.relkind = 'm' THEN ':mview.'
        else 'should not happen'
    end || t.oid || ':/' || t.relname || '/:column.'|| a.attnum ||':/' || a.attname AS obj_path, n.nspname AS schema_name,
    {{ show_node_prefs['column'] }} AS show_node, NULL AS other_info
    from pg_attribute a
    inner join pg_class t on a.attrelid = t.oid and t.relkind in ('r', 't','v','m')
    left join pg_namespace n on t.relnamespace = n.oid where a.attnum > 0
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['constraints', 'check_constraint', 'foreign_key', 'primary_key', 'unique_constraint', 'exclusion_constraint'] %}
    SELECT
    CASE
        WHEN c.contype = 'c' THEN  'check_constraint'
        WHEN c.contype = 'f' THEN  'foreign_key'
        WHEN c.contype = 'p' THEN  'primary_key'
        WHEN c.contype = 'u' THEN  'unique_constraint'
        WHEN c.contype = 'x' THEN  'exclusion_constraint'
    END::text AS obj_type,
    case when tf.relname is null then c.conname else c.conname || ' -> ' || tf.relname end AS obj_name,
    ':schema.'||n.oid||':/' || n.nspname||'/:table.'|| t.oid || ':/'||t.relname||
    CASE
        WHEN c.contype = 'c' THEN  '/:check_constraint.' ||c.oid
        WHEN c.contype = 'f' THEN  '/:foreign_key.' ||c.oid
        WHEN c.contype = 'p' THEN  '/:primary_key.' ||c.conindid
        WHEN c.contype = 'u' THEN  '/:unique_constraint.' ||c.conindid
        WHEN c.contype = 'x' THEN  '/:exclusion_constraint.' ||c.conindid
    END ||':/'|| case when tf.relname is null then c.conname else c.conname || ' -> ' || tf.relname end AS obj_path, n.nspname AS schema_name,
    {{ show_node_prefs['constraints'] }} AS show_node, NULL AS other_info
    from pg_constraint c
    left join pg_class t on c.conrelid = t.oid
    left join pg_class tf on c.confrelid = tf.oid
    left join pg_namespace n on t.relnamespace = n.oid
    where c.contypid = 0
    {% if obj_type == 'check_constraint' %}
    AND c.contype = 'c'
    {% elif obj_type == 'foreign_key' %}
    AND c.contype = 'f'
    {% elif obj_type == 'primary_key' %}
    AND c.contype = 'p'
    {% elif obj_type == 'unique_constraint' %}
    AND c.contype = 'u'
    {% elif obj_type == 'exclusion_constraint' %}
    AND c.contype = 'x'
    {% else %}
    AND c.contype IN  ('c', 'f', 'p', 'u', 'x')
    {% endif %}
    AND {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['rule'] %}
    select 'rule'::text AS obj_type, r.rulename AS obj_name, ':schema.'||n.oid||':/' || n.nspname||
            case
                WHEN t.relkind in ('r', 't') THEN '/:table.'
                when t.relkind = 'v' then '/:view.'
                else 'should not happen'
            end || t.oid || ':/' || t.relname ||'/:rule.'||r.oid||':/'|| r.rulename AS obj_path,
            n.nspname AS schema_name,
            {{ show_node_prefs['rule'] }} AS show_node, NULL AS other_info
            from pg_rewrite r
    inner join pg_class t on r.ev_class = t.oid and t.relkind in ('r', 't','v')
    left join pg_namespace n on t.relnamespace = n.oid
    where {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['trigger'] %}
    select 'trigger'::text AS obj_type, tr.tgname AS obj_name, ':schema.'||n.oid||':/' || n.nspname||
            case
                WHEN t.relkind in ('r', 't') THEN '/:table.'
                when t.relkind = 'v' then '/:view.'
                else 'should not happen'
            end || t.oid || ':/' || t.relname || '/:trigger.'|| tr.oid || ':/' || tr.tgname AS obj_path, n.nspname AS schema_name,
            {{ show_node_prefs['trigger'] }} AS show_node, NULL AS other_info
            from pg_trigger tr
    inner join pg_class t on tr.tgrelid = t.oid and t.relkind in ('r', 't', 'v')
    left join pg_namespace n on t.relnamespace = n.oid
    where tr.tgisinternal = false
    and {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['type'] %}
    SELECT 'type'::text AS obj_type, t.typname AS obj_name, ':schema.'||n.oid||':/' || n.nspname ||
        '/:type.'|| t.oid ||':/' || t.typname AS obj_path, n.nspname AS schema_name,
        {{ show_node_prefs['type'] }} AS show_node, NULL AS other_info
    FROM pg_type t
    LEFT OUTER JOIN pg_type e ON e.oid=t.typelem
    LEFT OUTER JOIN pg_class ct ON ct.oid=t.typrelid AND ct.relkind <> 'c'
    LEFT OUTER JOIN pg_namespace n on t.typnamespace = n.oid
    WHERE t.typtype != 'd' AND t.typname NOT LIKE E'\\_%'
    {% if not show_system_objects %}
        AND ct.oid is NULL
    {% endif %}
    AND {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['cast'] %}
    SELECT 'cast'::text AS obj_type, format_type(st.oid,NULL) ||'->'|| format_type(tt.oid,tt.typtypmod) AS obj_name,
    ':cast.'||ca.oid||':/' || format_type(st.oid,NULL) ||'->'|| format_type(tt.oid,tt.typtypmod) AS obj_path, ''::text AS schema_name,
    {{ show_node_prefs['cast'] }} AS show_node, NULL AS other_info
    FROM pg_cast ca
    JOIN pg_type st ON st.oid=castsource
    JOIN pg_type tt ON tt.oid=casttarget
    {% if not show_system_objects %}
    WHERE ca.oid > {{last_system_oid}}::OID
    {% endif %}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['language'] %}
    SELECT 'language'::text AS obj_type, lanname AS obj_name, ':language.'||lan.oid||':/' || lanname AS obj_path, ''::text AS schema_name,
    {{ show_node_prefs['language'] }} AS show_node, NULL AS other_info
    FROM pg_language lan
    WHERE lanispl IS TRUE
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['fts_configuration'] %}
    SELECT 'fts_configuration'::text AS obj_type, cfg.cfgname AS obj_name, ':schema.'||n.oid||':/' || n.nspname || '/:fts_configuration.'||cfg.oid||':/' || cfg.cfgname AS obj_path, n.nspname AS schema_name,
    {{ show_node_prefs['fts_configuration'] }} AS show_node, NULL AS other_info
    FROM pg_ts_config cfg
    left join pg_namespace n on cfg.cfgnamespace = n.oid
    WHERE {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['fts_dictionary'] %}
    SELECT 'fts_dictionary'::text AS obj_type, dict.dictname AS obj_name, ':schema.'||ns.oid||':/' || ns.nspname || '/:fts_dictionary.'||dict.oid||':/' || dict.dictname AS obj_path, ns.nspname AS schema_name,
    {{ show_node_prefs['fts_dictionary'] }} AS show_node, NULL AS other_info
    FROM pg_ts_dict dict
    left join pg_namespace ns on dict.dictnamespace = ns.oid
    WHERE {{ CATALOGS.DB_SUPPORT('ns') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['fts_parser'] %}
    SELECT 'fts_parser'::text AS obj_type, prs.prsname AS obj_name, ':schema.'||ns.oid||':/' || ns.nspname || '/:fts_parser.'||prs.oid||':/' || prs.prsname AS obj_path, ns.nspname AS schema_name,
    {{ show_node_prefs['fts_parser'] }} AS show_node, NULL AS other_info
    FROM pg_ts_parser prs
    left join pg_namespace ns on prs.prsnamespace = ns.oid
    WHERE {{ CATALOGS.DB_SUPPORT('ns') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['fts_template'] %}
    SELECT 'fts_template'::text AS obj_type, tmpl.tmplname AS obj_name, ':schema.'||ns.oid||':/' || ns.nspname || '/:fts_template.'||tmpl.oid||':/' || tmpl.tmplname AS obj_path, ns.nspname AS schema_name,
    {{ show_node_prefs['fts_template'] }} AS show_node, NULL AS other_info
    FROM pg_ts_template tmpl
    left join pg_namespace ns on tmpl.tmplnamespace = ns.oid
    AND {{ CATALOGS.DB_SUPPORT('ns') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['domain'] %}
    select 'domain'::text AS obj_type, t.typname AS obj_name, ':schema.'||n.oid||':/' || n.nspname || '/:domain.'||t.oid||':/' || t.typname AS obj_path, n.nspname AS schema_name,
    {{ show_node_prefs['domain'] }} AS show_node, NULL AS other_info
    from pg_type t
    inner join pg_namespace n on t.typnamespace = n.oid
    where t.typtype = 'd'
    AND {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['domain_constraints'] %}
    SELECT 'domain_constraints'::text AS obj_type,
        c.conname AS obj_name, ':schema.'||n.oid||':/' || n.nspname || '/:domain.'||t.oid||':/' || t.typname || '/:domain_constraints.'||c.oid||':/' || c.conname AS obj_path,
        n.nspname AS schema_name,
        {{ show_node_prefs['domain_constraints'] }} AS show_node, NULL AS other_info
    FROM pg_constraint c JOIN pg_type t
    ON t.oid=contypid JOIN pg_namespace n
    ON n.oid=t.typnamespace
    WHERE t.typtype = 'd'
    AND {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['foreign_data_wrapper'] %}
    select 'foreign_data_wrapper'::text AS obj_type, fdwname AS obj_name, ':foreign_data_wrapper.'||oid||':/' || fdwname AS obj_path, ''::text AS schema_name,
    {{ show_node_prefs['foreign_data_wrapper'] }} AS show_node, NULL AS other_info
    from pg_foreign_data_wrapper
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['foreign_server'] %}
    select 'foreign_server'::text AS obj_type, sr.srvname AS obj_name, ':foreign_data_wrapper.'||fdw.oid||':/' || fdw.fdwname || '/:foreign_server.'||sr.oid||':/' || sr.srvname AS obj_path, ''::text AS schema_name,
    {{ show_node_prefs['foreign_server'] }} AS show_node, NULL AS other_info
    from pg_foreign_server sr
    inner join pg_foreign_data_wrapper fdw on sr.srvfdw = fdw.oid
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['user_mapping'] %}
    select 'user_mapping'::text AS obj_type, um.usename AS obj_name, ':foreign_data_wrapper.'||fdw.oid||':/' || fdw.fdwname || '/:foreign_server.'||sr.oid||':/' || sr.srvname || '/:user_mapping.'||um.umid||':/' || um.usename AS obj_path, ''::text AS schema_name,
    {{ show_node_prefs['user_mapping'] }} AS show_node, NULL AS other_info
    from pg_user_mappings um
    inner join pg_foreign_server sr on um.srvid = sr.oid
    inner join pg_foreign_data_wrapper fdw on sr.srvfdw = fdw.oid
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['foreign_table'] %}
    select 'foreign_table'::text AS obj_type, c.relname AS obj_name, ':schema.'||ns.oid||':/' || ns.nspname || '/:foreign_table.'||c.oid||':/' || c.relname AS obj_path, ns.nspname AS schema_name,
    {{ show_node_prefs['foreign_table'] }} AS show_node, NULL AS other_info
    from pg_foreign_table ft
    inner join pg_class c on ft.ftrelid = c.oid
    inner join pg_namespace ns on c.relnamespace = ns.oid
    AND {{ CATALOGS.DB_SUPPORT('ns') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['extension'] %}
    select 'extension'::text AS obj_type, x.extname AS obj_name, ':extension.'||x.oid||':/' || x.extname AS obj_path, ''::text AS schema_name,
    {{ show_node_prefs['extension'] }} AS show_node, NULL AS other_info
    FROM pg_extension x
    JOIN pg_namespace n on x.extnamespace=n.oid
    join pg_available_extensions() e(name, default_version, comment) ON x.extname=e.name
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['collation'] %}
    SELECT 'collation'::text AS obj_type, c.collname AS obj_name, ':schema.'||n.oid||':/' || n.nspname || '/:collation.'||c.oid||':/' || c.collname AS obj_path, n.nspname AS schema_name,
    {{ show_node_prefs['collation'] }} AS show_node, NULL AS other_info
    FROM pg_collation c
    JOIN pg_namespace n ON n.oid=c.collnamespace
    WHERE {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['row_security_policy'] %}
    select 'row_security_policy'::text AS obj_type, pl.polname AS obj_name, ':schema.'|| n.oid || ':/' || n.nspname ||
        '/:table.'|| t.oid ||':/' || t.relname || '/:row_security_policy.'|| pl.oid ||':/' || pl.polname AS obj_path, n.nspname AS schema_name,
        {{ show_node_prefs['row_security_policy'] }} AS show_node, NULL AS other_info
        FROM pg_policy pl
    JOIN pg_class t on pl.polrelid = t.oid and t.relkind in ('r','t','p')
    JOIN pg_policies rw ON (pl.polname=rw.policyname AND t.relname=rw.tablename)
    JOIN pg_namespace n on t.relnamespace = n.oid
    where {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
) sn
where lower(sn.obj_name) like '%{{ search_text }}%'
{% if not show_system_objects %}
AND NOT ({{ CATALOGS.IS_CATALOG_SCHEMA('sn.schema_name') }})
AND (sn.schema_name IS NOT NULL AND sn.schema_name NOT LIKE 'pg\_%')
{% endif %}
ORDER BY 1, 2, 3
