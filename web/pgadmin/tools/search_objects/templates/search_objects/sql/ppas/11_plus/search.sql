{% import 'catalog/ppas/macros/catalogs.sql' as CATALOGS %}
{% set all_obj = false %}
{% if obj_type == 'all' or obj_type is none %}
{% set all_obj = true %}
{% endif %}
SELECT obj_type, obj_name,
    pg_catalog.REPLACE(obj_path, '/'||sn.schema_name||'/', '/'||{{ CATALOGS.LABELS_SCHEMACOL('sn.schema_name', _) }}||'/') AS obj_path,
    schema_name, show_node, other_info,
    CASE
        WHEN {{ CATALOGS.IS_CATALOG_SCHEMA('sn.schema_name') }} THEN
            CASE WHEN {{ CATALOGS.DB_SUPPORT_SCHEMACOL('sn.schema_name') }} THEN 'D' ELSE 'O' END
        ELSE 'N'
    END AS catalog_level
FROM (
{% if all_obj or obj_type in ['sequence', 'view', 'mview'] %}
    SELECT
    CASE
        WHEN c.relkind = 'S' THEN 'sequence'
        WHEN c.relkind = 'v' THEN 'view'
        WHEN c.relkind = 'm' THEN 'mview'
        ELSE 'should not happen'
    END::text AS obj_type, c.relname AS obj_name,
    ':schema.'|| n.oid || ':/' || n.nspname || '/' ||
    CASE
        WHEN c.relkind = 'S' THEN ':sequence.'
        WHEN c.relkind = 'v' THEN ':view.'
        WHEN c.relkind = 'm' THEN ':mview.'
        ELSE 'should not happen'
    END || c.oid ||':/' || c.relname AS obj_path, n.nspname AS schema_name,
    CASE
        WHEN c.relkind = 'S' THEN {{ show_node_prefs['sequence'] }}
        WHEN c.relkind = 'v' THEN {{ show_node_prefs['view'] }}
        WHEN c.relkind = 'm' THEN {{ show_node_prefs['mview'] }}
        ELSE False
    END AS show_node, NULL AS other_info
    FROM pg_catalog.pg_class c
    LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    {% if all_obj %}
    WHERE c.relkind in ('S','v','m')
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
{% if all_obj or obj_type in ['table', 'partition'] %}
    SELECT CASE WHEN c.relispartition THEN 'partition' ELSE 'table' END::text AS obj_type, c.relname AS obj_name,
    ':schema.'|| n.oid || ':/' || n.nspname || '/' || (
		WITH RECURSIVE table_path_data as (
			select c.oid as oid, 0 as height, c.relkind,
				CASE c.relispartition WHEN true THEN ':partition.' ELSE ':table.' END || c.oid || ':/' || c.relname as path
			union
			select rel.oid, pt.height+1 as height, rel.relkind,
				CASE rel.relispartition WHEN true THEN ':partition.' ELSE ':table.' END
				|| rel.oid || ':/' || rel.relname || '/' || pt.path as path
			from pg_catalog.pg_class rel JOIN pg_catalog.pg_namespace nsp ON rel.relnamespace = nsp.oid
			join pg_catalog.pg_inherits inh ON inh.inhparent = rel.oid
			join table_path_data pt ON inh.inhrelid = pt.oid
		)
		select CASE WHEN relkind = 'p' THEN path ELSE ':table.' || c.oid || ':/' || c.relname END AS path
		from table_path_data order by height desc limit 1
	) obj_path, n.nspname AS schema_name,
	CASE WHEN c.relispartition THEN {{ show_node_prefs['partition'] }}
	    ELSE {{ show_node_prefs['table'] }} END AS show_node,
    NULL AS other_info
    FROM pg_catalog.pg_class c
    LEFT JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind in ('p','r','t')
    {% if obj_type == 'table' %}
    AND NOT c.relispartition
    {% elif obj_type == 'partition' %}
    AND c.relispartition
    {% endif %}
    AND CASE WHEN c.relispartition THEN {{ CATALOGS.DB_SUPPORT('n') }} ELSE true END
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['index'] %}
    SELECT 'index'::text AS obj_type, cls.relname AS obj_name, ':schema.'|| n.oid || ':/' || n.nspname || '/' ||
        case
            when tab.relkind = 'm' then ':mview.' || tab.oid || ':' || '/' || tab.relname
            WHEN tab.relkind in ('r', 't', 'p') THEN
                (
                    WITH RECURSIVE table_path_data as (
                        select tab.oid as oid, 0 as height, tab.relkind,
                            CASE tab.relispartition WHEN true THEN ':partition.' ELSE ':table.' END || tab.oid || ':/' || tab.relname as path
                        union
                        select rel.oid, pt.height+1 as height, rel.relkind,
                            CASE rel.relispartition WHEN true THEN ':partition.' ELSE ':table.' END
                            || rel.oid || ':/' || rel.relname || '/' || pt.path as path
                        from pg_catalog.pg_class rel JOIN pg_catalog.pg_namespace nsp ON rel.relnamespace = nsp.oid
                        join pg_catalog.pg_inherits inh ON inh.inhparent = rel.oid
                        join table_path_data pt ON inh.inhrelid = pt.oid
                    )
                    select CASE WHEN relkind = 'p' THEN path ELSE ':table.' || tab.oid || ':/' || tab.relname END AS path
                    from table_path_data order by height desc limit 1
               )
        end
        || '/:index.'|| cls.oid ||':/' || cls.relname AS obj_path, n.nspname AS schema_name,
    {{ show_node_prefs['index'] }} AS show_node, NULL AS other_info
    FROM pg_catalog.pg_index idx
    JOIN pg_catalog.pg_class cls ON cls.oid=indexrelid
    JOIN pg_catalog.pg_class tab ON tab.oid=indrelid
    JOIN pg_catalog.pg_namespace n ON n.oid=tab.relnamespace
    LEFT JOIN pg_catalog.pg_depend dep ON (dep.classid = cls.tableoid AND dep.objid = cls.oid AND dep.refobjsubid = '0' AND dep.refclassid=(SELECT oid FROM pg_catalog.pg_class WHERE relname='pg_constraint') AND dep.deptype='i')
    LEFT OUTER JOIN pg_catalog.pg_constraint con ON (con.tableoid = dep.refclassid AND con.oid = dep.refobjid)
    LEFT OUTER JOIN pg_catalog.pg_description des ON des.objoid=cls.oid
    LEFT OUTER JOIN pg_catalog.pg_description desp ON (desp.objoid=con.oid AND desp.objsubid = 0)
    WHERE contype IS NULL
    AND {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['trigger_function', 'function', 'procedure', 'edbfunc', 'edbproc'] %}
    SELECT fd.obj_type, fd.obj_name,
        CASE
            WHEN fd.obj_type = 'function' THEN
                ':schema.'|| fd.schema_oid || ':/' || fd.schema_name || '/:function.' || fd.obj_oid ||':/' || fd.obj_name
            WHEN fd.obj_type = 'procedure' THEN
                ':schema.'|| fd.schema_oid || ':/' || fd.schema_name || '/:procedure.' || fd.obj_oid ||':/' || fd.obj_name
            WHEN fd.obj_type = 'trigger_function' THEN
                ':schema.'|| fd.schema_oid || ':/' || fd.schema_name || '/:trigger_function.' || fd.obj_oid ||':/' || fd.obj_name
            WHEN fd.obj_type = 'edbfunc' THEN
                ':schema.'|| fd.next_schema_oid || ':/' || fd.next_schema_name || '/:package.'|| fd.schema_oid || ':/' || fd.schema_name || '/:edbfunc.' || fd.obj_oid ||':/' || fd.obj_name
            WHEN fd.obj_type = 'edbproc' THEN
                ':schema.'|| fd.next_schema_oid || ':/' || fd.next_schema_name || '/:package.'|| fd.schema_oid || ':/' || fd.schema_name || '/:edbproc.' || fd.obj_oid ||':/' || fd.obj_name
            ELSE NULL
        END AS obj_path,
        CASE
            WHEN fd.obj_type IN ('function', 'procedure', 'trigger_function') THEN fd.schema_name
            WHEN fd.obj_type IN ('edbfunc', 'edbproc') THEN fd.next_schema_name
            ELSE NULL
        END AS schema_name,
        CASE
            WHEN fd.obj_type = 'function' THEN {{ show_node_prefs['function'] }}
            WHEN fd.obj_type = 'procedure' THEN {{ show_node_prefs['procedure'] }}
            WHEN fd.obj_type = 'trigger_function' THEN {{ show_node_prefs['trigger_function'] }}
            WHEN fd.obj_type = 'edbfunc' THEN {{ show_node_prefs['edbfunc'] }}
            WHEN fd.obj_type = 'edbproc' THEN {{ show_node_prefs['edbproc'] }}
            ELSE NULL
        END AS show_node, other_info
    FROM (
        SELECT
            CASE
            WHEN t.typname IN ('trigger', 'event_trigger') THEN 'trigger_function'
            WHEN pr.protype = '0'::char THEN
                CASE WHEN np.oid IS NOT NULL THEN 'edbfunc' ELSE 'function' END
            WHEN pr.protype = '1'::char THEN
                CASE WHEN np.oid IS NOT NULL THEN 'edbproc' ELSE 'procedure' END
            ELSE null
            END::text AS obj_type, pr.proname AS obj_name, pr.oid AS obj_oid, n.oid AS schema_oid, n.nspname AS schema_name, np.oid next_schema_oid, np.nspname next_schema_name,
            pg_catalog.pg_get_function_identity_arguments(pr.oid) AS other_info
        FROM pg_catalog.pg_proc pr left join pg_catalog.pg_namespace n
        ON pr.pronamespace = n.oid left JOIN pg_catalog.pg_namespace np
        ON np.oid=n.nspparent left JOIN pg_catalog.pg_type t
        ON t.oid = pr.prorettype left JOIN pg_catalog.pg_language l
        ON l.oid = pr.prolang
        WHERE NOT (t.typname = 'trigger' AND l.lanname = 'edbspl')
        AND ({{ CATALOGS.DB_SUPPORT('n') }} AND {{ CATALOGS.DB_SUPPORT('np') }}) AND pr.prokind != 'a'
    ) fd
    {% if not all_obj %}
    WHERE fd.obj_type = '{{ obj_type }}'
    {% endif %}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['event_trigger'] %}
    select 'event_trigger'::text AS obj_type, evtname AS obj_name, ':event_trigger.'||oid||':/' || evtname AS obj_path, ''::text AS schema_name,
    {{ show_node_prefs['index'] }} AS show_node, NULL AS other_info from pg_catalog.pg_event_trigger
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['schema'] %}
    select 'schema'::text AS obj_type, n.nspname AS obj_name,
    ':schema.'||n.oid||':/' || n.nspname as obj_path, n.nspname AS schema_name,
    {{ show_node_prefs['schema'] }} AS show_node, NULL AS other_info from pg_catalog.pg_namespace n
    where n.nspparent = 0
    AND {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['column'] %}
    select 'column'::text AS obj_type, a.attname AS obj_name,
    ':schema.'||n.oid||':/' || n.nspname || '/' ||
    case
        WHEN t.relkind in ('r', 't', 'p') THEN ':table.'
        WHEN t.relkind = 'v' THEN ':view.'
        WHEN t.relkind = 'm' THEN ':mview.'
        else 'should not happen'
    end || t.oid || ':/' || t.relname || '/:column.'|| a.attnum ||':/' || a.attname AS obj_path, n.nspname AS schema_name,
    {{ show_node_prefs['column'] }} AS show_node, NULL AS other_info
    from pg_catalog.pg_attribute a
    inner join pg_catalog.pg_class t on a.attrelid = t.oid and t.relkind in ('r','t','p','v','m')
    left join pg_catalog.pg_namespace n on t.relnamespace = n.oid where a.attnum > 0
    and not t.relispartition
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
    ':schema.'||n.oid||':/' || n.nspname||'/'||
    (
		WITH RECURSIVE table_path_data as (
			select t.oid as oid, 0 as height, t.relkind,
				CASE t.relispartition WHEN true THEN ':partition.' ELSE ':table.' END || t.oid || ':/' || t.relname as path
			union
			select rel.oid, pt.height+1 as height, rel.relkind,
				CASE rel.relispartition WHEN true THEN ':partition.' ELSE ':table.' END
				|| rel.oid || ':/' || rel.relname || '/' || pt.path as path
			from pg_catalog.pg_class rel JOIN pg_catalog.pg_namespace nsp ON rel.relnamespace = nsp.oid
			join pg_catalog.pg_inherits inh ON inh.inhparent = rel.oid
			join table_path_data pt ON inh.inhrelid = pt.oid
		)
		select CASE WHEN relkind = 'p' THEN path ELSE ':table.' || t.oid || ':/' || t.relname END AS path
		from table_path_data order by height desc limit 1
	) ||
    CASE
        WHEN c.contype = 'c' THEN  '/:check_constraint.' ||c.oid
        WHEN c.contype = 'f' THEN  '/:foreign_key.' ||c.oid
        WHEN c.contype = 'p' THEN  '/:primary_key.' ||c.conindid
        WHEN c.contype = 'u' THEN  '/:unique_constraint.' ||c.conindid
        WHEN c.contype = 'x' THEN  '/:exclusion_constraint.' ||c.conindid
    END ||':/'|| case when tf.relname is null then c.conname else c.conname || ' -> ' || tf.relname end AS obj_path, n.nspname AS schema_name,
    {{ show_node_prefs['constraints'] }} AS show_node, NULL AS other_info
    from pg_catalog.pg_constraint c
    left join pg_catalog.pg_class t on c.conrelid = t.oid
    left join pg_catalog.pg_class tf on c.confrelid = tf.oid
    left join pg_catalog.pg_namespace n on t.relnamespace = n.oid
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
    select 'rule'::text AS obj_type, r.rulename AS obj_name, ':schema.'||n.oid||':/' || n.nspname|| '/' ||
            case
                when t.relkind = 'v' then ':view.' || t.oid || ':' || '/' || t.relname
                WHEN t.relkind in ('r', 't', 'p') THEN
                    (
                        WITH RECURSIVE table_path_data as (
                            select t.oid as oid, 0 as height, t.relkind,
                                CASE t.relispartition WHEN true THEN ':partition.' ELSE ':table.' END || t.oid || ':/' || t.relname as path
                            union
                            select rel.oid, pt.height+1 as height, rel.relkind,
                                CASE rel.relispartition WHEN true THEN ':partition.' ELSE ':table.' END
                                || rel.oid || ':/' || rel.relname || '/' || pt.path as path
                            from pg_catalog.pg_class rel JOIN pg_catalog.pg_namespace nsp ON rel.relnamespace = nsp.oid
                            join pg_catalog.pg_inherits inh ON inh.inhparent = rel.oid
                            join table_path_data pt ON inh.inhrelid = pt.oid
                        )
                        select CASE WHEN relkind = 'p' THEN path ELSE ':table.' || t.oid || ':/' || t.relname END AS path
                        from table_path_data order by height desc limit 1
                    )
            end
            ||'/:rule.'||r.oid||':/'|| r.rulename AS obj_path,
            n.nspname AS schema_name,
            {{ show_node_prefs['rule'] }} AS show_node, NULL AS other_info
            from pg_catalog.pg_rewrite r
    inner join pg_catalog.pg_class t on r.ev_class = t.oid and t.relkind in ('r','t','p','v')
    left join pg_catalog.pg_namespace n on t.relnamespace = n.oid
    where {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['trigger'] %}
    select 'trigger'::text AS obj_type, tr.tgname AS obj_name, ':schema.'||n.oid||':/' || n.nspname|| '/' ||
        case
            when t.relkind = 'v' then ':view.' || t.oid || ':' || '/' || t.relname
            when t.relkind = 'm' then ':mview.' || t.oid || ':' || '/' || t.relname
            WHEN t.relkind in ('r', 't', 'p') THEN
            (
                WITH RECURSIVE table_path_data as (
                    select t.oid as oid, 0 as height, t.relkind,
                        CASE t.relispartition WHEN true THEN ':partition.' ELSE ':table.' END || t.oid || ':/' || t.relname as path
                    union
                    select rel.oid, pt.height+1 as height, rel.relkind,
                        CASE rel.relispartition WHEN true THEN ':partition.' ELSE ':table.' END
                        || rel.oid || ':/' || rel.relname || '/' || pt.path as path
                    from pg_catalog.pg_class rel JOIN pg_catalog.pg_namespace nsp ON rel.relnamespace = nsp.oid
                    join pg_catalog.pg_inherits inh ON inh.inhparent = rel.oid
                    join table_path_data pt ON inh.inhrelid = pt.oid
                )
                select CASE WHEN relkind = 'p' THEN path ELSE ':table.' || t.oid || ':/' || t.relname END AS path
                from table_path_data order by height desc limit 1
            )
        end || '/:trigger.'|| tr.oid || ':/' || tr.tgname AS obj_path, n.nspname AS schema_name,
        {{ show_node_prefs['trigger'] }} AS show_node, NULL AS other_info
        from pg_catalog.pg_trigger tr
    inner join pg_catalog.pg_class t on tr.tgrelid = t.oid and t.relkind in ('r', 't', 'p', 'v')
    left join pg_catalog.pg_namespace n on t.relnamespace = n.oid
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
    FROM pg_catalog.pg_type t
    LEFT OUTER JOIN pg_catalog.pg_type e ON e.oid=t.typelem
    LEFT OUTER JOIN pg_catalog.pg_class ct ON ct.oid=t.typrelid AND ct.relkind <> 'c'
    LEFT OUTER JOIN pg_catalog.pg_namespace n on t.typnamespace = n.oid
    WHERE t.typtype != 'd' AND t.typname NOT LIKE E'\\_%'
    {% if not show_system_objects %}
        AND ct.oid is NULL
    {% endif %}
    AND n.nspparent = 0
    AND {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['cast'] %}
    SELECT 'cast'::text AS obj_type, pg_catalog.format_type(st.oid,NULL) ||'->'|| pg_catalog.format_type(tt.oid,tt.typtypmod) AS obj_name,
    ':cast.'||ca.oid||':/' || pg_catalog.format_type(st.oid,NULL) ||'->'|| pg_catalog.format_type(tt.oid,tt.typtypmod) AS obj_path, ''::text AS schema_name,
    {{ show_node_prefs['cast'] }} AS show_node, NULL AS other_info
    FROM pg_catalog.pg_cast ca
    JOIN pg_catalog.pg_type st ON st.oid=castsource
    JOIN pg_catalog.pg_type tt ON tt.oid=casttarget
    {% if not show_system_objects %}
    WHERE ca.oid > {{last_system_oid}}::OID
    {% endif %}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}

{% if all_obj or obj_type in ['publication'] %}
    SELECT 'publication'::text AS obj_type, pubname AS obj_name, ':publication.'||pub.oid||':/' || pubname AS obj_path, ''::text AS schema_name,
    {{ show_node_prefs['publication'] }} AS show_node, NULL AS other_info
    FROM pg_catalog.pg_publication pub
{% endif %}
{% if all_obj %}
    UNION
{% endif %}

{% if 'subscription' not in skip_obj_type%}
{% if all_obj or obj_type in ['subscription'] %}
    SELECT 'subscription'::text AS obj_type, subname AS obj_name, ':subscription.'||pub.oid||':/' || subname AS obj_path, ''::text AS schema_name,
    {{ show_node_prefs['subscription'] }} AS show_node, NULL AS other_info
    FROM pg_catalog.pg_subscription pub
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% endif %}

{% if all_obj or obj_type in ['language'] %}
    SELECT 'language'::text AS obj_type, lanname AS obj_name, ':language.'||lan.oid||':/' || lanname AS obj_path, ''::text AS schema_name,
    {{ show_node_prefs['language'] }} AS show_node, NULL AS other_info
    FROM pg_catalog.pg_language lan
    WHERE lanispl IS TRUE
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['fts_configuration'] %}
    SELECT 'fts_configuration'::text AS obj_type, cfg.cfgname AS obj_name, ':schema.'||n.oid||':/' || n.nspname || '/:fts_configuration.'||cfg.oid||':/' || cfg.cfgname AS obj_path, n.nspname AS schema_name,
    {{ show_node_prefs['fts_configuration'] }} AS show_node, NULL AS other_info
    FROM pg_catalog.pg_ts_config cfg
    left join pg_catalog.pg_namespace n on cfg.cfgnamespace = n.oid
    WHERE {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['fts_dictionary'] %}
    SELECT 'fts_dictionary' AS obj_type, dict.dictname AS obj_name, ':schema.'||ns.oid||':/' || ns.nspname || '/:fts_dictionary.'||dict.oid||':/' || dict.dictname AS obj_path, ns.nspname AS schema_name,
    {{ show_node_prefs['fts_dictionary'] }} AS show_node, NULL AS other_info
    FROM pg_catalog.pg_ts_dict dict
    left join pg_catalog.pg_namespace ns on dict.dictnamespace = ns.oid
    WHERE {{ CATALOGS.DB_SUPPORT('ns') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['fts_parser'] %}
    SELECT 'fts_parser' AS obj_type, prs.prsname AS obj_name, ':schema.'||ns.oid||':/' || ns.nspname || '/:fts_parser.'||prs.oid||':/' || prs.prsname AS obj_path, ns.nspname AS schema_name,
    {{ show_node_prefs['fts_parser'] }} AS show_node, NULL AS other_info
    FROM pg_catalog.pg_ts_parser prs
    left join pg_catalog.pg_namespace ns on prs.prsnamespace = ns.oid
    WHERE {{ CATALOGS.DB_SUPPORT('ns') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['fts_template'] %}
    SELECT 'fts_template' AS obj_type, tmpl.tmplname AS obj_name, ':schema.'||ns.oid||':/' || ns.nspname || '/:fts_template.'||tmpl.oid||':/' || tmpl.tmplname AS obj_path, ns.nspname AS schema_name,
    {{ show_node_prefs['fts_template'] }} AS show_node, NULL AS other_info
    FROM pg_catalog.pg_ts_template tmpl
    left join pg_catalog.pg_namespace ns on tmpl.tmplnamespace = ns.oid
    AND {{ CATALOGS.DB_SUPPORT('ns') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['domain'] %}
    select 'domain' AS obj_type, t.typname AS obj_name, ':schema.'||n.oid||':/' || n.nspname || '/:domain.'||t.oid||':/' || t.typname AS obj_path, n.nspname AS schema_name,
    {{ show_node_prefs['domain'] }} AS show_node, NULL AS other_info
    from pg_catalog.pg_type t
    inner join pg_catalog.pg_namespace n on t.typnamespace = n.oid
    where t.typtype = 'd'
    AND n.nspparent = 0
    AND {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['domain_constraints'] %}
    SELECT 'domain_constraints' AS obj_type,
        c.conname AS obj_name, ':schema.'||n.oid||':/' || n.nspname || '/:domain.'||t.oid||':/' || t.typname || '/:domain_constraints.'||c.oid||':/' || c.conname AS obj_path,
        n.nspname AS schema_name,
        {{ show_node_prefs['domain_constraints'] }} AS show_node, NULL AS other_info
    FROM pg_catalog.pg_constraint c JOIN pg_catalog.pg_type t
    ON t.oid=contypid JOIN pg_catalog.pg_namespace n
    ON n.oid=t.typnamespace
    WHERE t.typtype = 'd'
    AND n.nspparent = 0
    AND {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['foreign_data_wrapper'] %}
    select 'foreign_data_wrapper' AS obj_type, fdwname AS obj_name, ':foreign_data_wrapper.'||oid||':/' || fdwname AS obj_path, ''::text AS schema_name,
    {{ show_node_prefs['foreign_data_wrapper'] }} AS show_node, NULL AS other_info
    from pg_catalog.pg_foreign_data_wrapper
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['foreign_server'] %}
    select 'foreign_server' AS obj_type, sr.srvname AS obj_name, ':foreign_data_wrapper.'||fdw.oid||':/' || fdw.fdwname || '/:foreign_server.'||sr.oid||':/' || sr.srvname AS obj_path, ''::text AS schema_name,
    {{ show_node_prefs['foreign_server'] }} AS show_node, NULL AS other_info
    from pg_catalog.pg_foreign_server sr
    inner join pg_catalog.pg_foreign_data_wrapper fdw on sr.srvfdw = fdw.oid
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['user_mapping'] %}
    select 'user_mapping' AS obj_type, um.usename AS obj_name, ':foreign_data_wrapper.'||fdw.oid||':/' || fdw.fdwname || '/:foreign_server.'||sr.oid||':/' || sr.srvname || '/:user_mapping.'||um.umid||':/' || um.usename AS obj_path, ''::text AS schema_name,
    {{ show_node_prefs['user_mapping'] }} AS show_node, NULL AS other_info
    from pg_catalog.pg_user_mappings um
    inner join pg_catalog.pg_foreign_server sr on um.srvid = sr.oid
    inner join pg_catalog.pg_foreign_data_wrapper fdw on sr.srvfdw = fdw.oid
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['foreign_table'] %}
    select 'foreign_table' AS obj_type, c.relname AS obj_name, ':schema.'||ns.oid||':/' || ns.nspname || '/:foreign_table.'||c.oid||':/' || c.relname AS obj_path, ns.nspname AS schema_name,
    {{ show_node_prefs['foreign_table'] }} AS show_node, NULL AS other_info
    from pg_catalog.pg_foreign_table ft
    inner join pg_catalog.pg_class c on ft.ftrelid = c.oid
    inner join pg_catalog.pg_namespace ns on c.relnamespace = ns.oid
    AND {{ CATALOGS.DB_SUPPORT('ns') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['extension'] %}
    select 'extension' AS obj_type, x.extname AS obj_name, ':extension.'||x.oid||':/' || x.extname AS obj_path, ''::text AS schema_name,
    {{ show_node_prefs['extension'] }} AS show_node, NULL AS other_info
    FROM pg_catalog.pg_extension x
    JOIN pg_catalog.pg_namespace n on x.extnamespace=n.oid
    join pg_catalog.pg_available_extensions() e(name, default_version, comment) ON x.extname=e.name
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['collation'] %}
    SELECT 'collation' AS obj_type, c.collname AS obj_name, ':schema.'||n.oid||':/' || n.nspname || '/:collation.'||c.oid||':/' || c.collname AS obj_path, n.nspname AS schema_name,
    {{ show_node_prefs['collation'] }} AS show_node, NULL AS other_info
    FROM pg_catalog.pg_collation c
    JOIN pg_catalog.pg_namespace n ON n.oid=c.collnamespace
    WHERE {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['synonym'] %}
    SELECT 'synonym' AS obj_type, s.synname AS obj_name, ':schema.'||n.oid||':/' || n.nspname || '/:synonym.'||s.oid||':/' || s.synname AS obj_path, n.nspname AS schema_name,
    {{ show_node_prefs['synonym'] }} AS show_node, NULL AS other_info
    FROM pg_catalog.pg_synonym s
    JOIN pg_catalog.pg_namespace n ON n.oid=s.synnamespace
    WHERE {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['package'] %}
    SELECT 'package' AS obj_type, p.nspname AS obj_name, ':schema.'||n.oid||':/' || n.nspname || '/:package.'||p.oid||':/' || p.nspname AS obj_path, n.nspname AS schema_name,
    {{ show_node_prefs['package'] }} AS show_node, NULL AS other_info
    FROM pg_catalog.pg_namespace p
    JOIN pg_catalog.pg_namespace n ON n.oid=p.nspparent
    WHERE {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['edbvar'] %}
    SELECT 'edbvar' AS obj_type, v.varname AS obj_name,
    ':schema.'||n.oid||':/' || n.nspname || '/:package.'||p.oid||':/' || p.nspname || '/:edbvar.'||v.oid||':/' || v.varname AS obj_path, n.nspname AS schema_name,
    {{ show_node_prefs['edbvar'] }} AS show_node, NULL AS other_info
    FROM pg_catalog.edb_variable v JOIN pg_catalog.pg_namespace p
    ON v.varpackage = p.oid JOIN pg_catalog.pg_namespace n
    ON p.nspparent = n.oid
    WHERE {{ CATALOGS.DB_SUPPORT('p') }}
    AND {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['row_security_policy'] %}
    select 'row_security_policy'::text AS obj_type, pl.polname AS obj_name, ':schema.'||n.oid||':/' || n.nspname|| '/' ||
            case
                WHEN t.relkind in ('r', 't', 'p') THEN
                    (
                        WITH RECURSIVE table_path_data as (
                            select t.oid as oid, 0 as height, t.relkind,
                                CASE t.relispartition WHEN true THEN ':partition.' ELSE ':table.' END || t.oid || ':/' || t.relname as path
                            union
                            select rel.oid, pt.height+1 as height, rel.relkind,
                                CASE rel.relispartition WHEN true THEN ':partition.' ELSE ':table.' END
                                || rel.oid || ':/' || rel.relname || '/' || pt.path as path
                            from pg_catalog.pg_class rel JOIN pg_catalog.pg_namespace nsp ON rel.relnamespace = nsp.oid
                            join pg_catalog.pg_inherits inh ON inh.inhparent = rel.oid
                            join table_path_data pt ON inh.inhrelid = pt.oid
                        )
                        select CASE WHEN relkind = 'p' THEN path ELSE ':table.' || t.oid || ':/' || t.relname END AS path
                        from table_path_data order by height desc limit 1
                    )
            end
            ||'/:row_security_policy.'|| pl.oid ||':/'|| pl.polname AS obj_path, n.nspname AS schema_name,
            {{ show_node_prefs['row_security_policy'] }} AS show_node, NULL AS other_info
            FROM pg_catalog.pg_policy pl
    JOIN pg_catalog.pg_class t on pl.polrelid = t.oid and t.relkind in ('r','t','p')
    JOIN pg_catalog.pg_policies rw ON (pl.polname=rw.policyname AND t.relname=rw.tablename)
    JOIN pg_catalog.pg_namespace n on t.relnamespace = n.oid
    where {{ CATALOGS.DB_SUPPORT('n') }}
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['aggregate'] %}
    SELECT 'aggregate' AS obj_type, pr.proname AS obj_name,
    ':schema.'|| ns.oid || ':/' || ns.nspname || '/' || ':aggregate.' || ag.aggfnoid::oid ||':/' || pr.proname AS obj_path,
    ns.nspname AS schema_name,
    {{ show_node_prefs['aggregate'] }} AS show_node, pg_catalog.pg_get_function_arguments(aggfnoid::oid) AS other_info
    FROM pg_aggregate ag
    LEFT OUTER JOIN pg_catalog.pg_proc pr ON pr.oid = ag.aggfnoid
    LEFT OUTER JOIN pg_catalog.pg_namespace ns ON ns.oid=pr.pronamespace
    WHERE ({{ CATALOGS.DB_SUPPORT('ns') }})
{% endif %}
{% if all_obj %}
    UNION
{% endif %}
{% if all_obj or obj_type in ['operator'] %}
    SELECT 'operator' AS obj_type, op.oprname AS obj_name,
    ':schema.'|| ns.oid || ':/' || ns.nspname || '/' || ':operator.' || op.oid::oid ||':/' || op.oprname AS obj_path,
    ns.nspname AS schema_name,
    {{ show_node_prefs['operator'] }} AS show_node,
    CASE WHEN lt.typname IS NOT NULL AND rt.typname IS NOT NULL THEN
		pg_catalog.format_type(lt.oid, NULL) || ', ' || pg_catalog.format_type(rt.oid, NULL)
	 WHEN lt.typname IS NULL AND rt.typname IS NOT NULL THEN
	    pg_catalog.format_type(rt.oid, NULL)
	 WHEN lt.typname IS NOT NULL AND rt.typname IS NULL THEN
	    pg_catalog.format_type(lt.oid, NULL)
	 ELSE '' END AS other_info
    FROM pg_catalog.pg_operator op
    LEFT OUTER JOIN pg_catalog.pg_namespace ns ON ns.oid=op.oprnamespace
    LEFT OUTER JOIN pg_catalog.pg_type lt ON lt.oid=op.oprleft
    LEFT OUTER JOIN pg_catalog.pg_type rt ON rt.oid=op.oprright
    WHERE ({{ CATALOGS.DB_SUPPORT('ns') }})
{% endif %}

) sn
where lower(sn.obj_name) like '%{{ search_text }}%'
{% if not show_system_objects %}
AND NOT ({{ CATALOGS.IS_CATALOG_SCHEMA('sn.schema_name') }})
AND (sn.schema_name IS NOT NULL AND sn.schema_name NOT LIKE 'pg\_%')
{% endif %}
ORDER BY 1, 2, 3
