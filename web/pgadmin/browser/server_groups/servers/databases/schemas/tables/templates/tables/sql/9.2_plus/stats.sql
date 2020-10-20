SELECT
    seq_scan AS {{ conn|qtIdent(_('Sequential scans')) }},
    seq_tup_read AS {{ conn|qtIdent(_('Sequential tuples read')) }},
    idx_scan AS {{ conn|qtIdent(_('Index scans')) }},
    idx_tup_fetch AS {{ conn|qtIdent(_('Index tuples fetched')) }},
    n_tup_ins AS {{ conn|qtIdent(_('Tuples inserted')) }},
    n_tup_upd AS {{ conn|qtIdent(_('Tuples updated')) }},
    n_tup_del AS {{ conn|qtIdent(_('Tuples deleted')) }},
    n_tup_hot_upd AS {{ conn|qtIdent(_('Tuples HOT updated')) }},
    n_live_tup AS {{ conn|qtIdent(_('Live tuples')) }},
    n_dead_tup AS {{ conn|qtIdent(_('Dead tuples')) }},
    heap_blks_read AS {{ conn|qtIdent(_('Heap blocks read')) }},
    heap_blks_hit AS {{ conn|qtIdent(_('Heap blocks hit')) }},
    idx_blks_read AS {{ conn|qtIdent(_('Index blocks read')) }},
    idx_blks_hit AS {{ conn|qtIdent(_('Index blocks hit')) }},
    toast_blks_read AS {{ conn|qtIdent(_('Toast blocks read')) }},
    toast_blks_hit AS {{ conn|qtIdent(_('Toast blocks hit')) }},
    tidx_blks_read AS {{ conn|qtIdent(_('Toast index blocks read')) }},
    tidx_blks_hit AS {{ conn|qtIdent(_('Toast index blocks hit')) }},
    last_vacuum AS {{ conn|qtIdent(_('Last vacuum')) }},
    last_autovacuum AS {{ conn|qtIdent(_('Last autovacuum')) }},
    last_analyze AS {{ conn|qtIdent(_('Last analyze')) }},
    last_autoanalyze AS {{ conn|qtIdent(_('Last autoanalyze')) }},
    vacuum_count AS {{ conn|qtIdent(_('Vacuum counter')) }},
    autovacuum_count AS {{ conn|qtIdent(_('Autovacuum counter')) }},
    analyze_count AS {{ conn|qtIdent(_('Analyze counter')) }},
    autoanalyze_count AS {{ conn|qtIdent(_('Autoanalyze counter')) }},
    pg_relation_size(stat.relid) AS {{ conn|qtIdent(_('Table size')) }},
    CASE WHEN cl.reltoastrelid = 0 THEN NULL ELSE pg_size_pretty(pg_relation_size(cl.reltoastrelid)
        + COALESCE((SELECT SUM(pg_relation_size(indexrelid))
                        FROM pg_index WHERE indrelid=cl.reltoastrelid)::int8, 0))
        END AS {{ conn|qtIdent(_('Toast table size')) }},
    COALESCE((SELECT SUM(pg_relation_size(indexrelid))
                                FROM pg_index WHERE indrelid=stat.relid)::int8, 0)
        AS {{ conn|qtIdent(_('Indexes size')) }}
{% if is_pgstattuple %}
{#== EXTENDED STATS ==#}
    ,tuple_count AS {{ conn|qtIdent(_('Tuple count')) }},
    tuple_len AS {{ conn|qtIdent(_('Tuple length')) }},
    tuple_percent AS {{ conn|qtIdent(_('Tuple percent')) }},
    dead_tuple_count AS {{ conn|qtIdent(_('Dead tuple count')) }},
    dead_tuple_len AS {{ conn|qtIdent(_('Dead tuple length')) }},
    dead_tuple_percent AS {{ conn|qtIdent(_('Dead tuple percent')) }},
    free_space AS {{ conn|qtIdent(_('Free space')) }},
    free_percent AS {{ conn|qtIdent(_('Free percent')) }}
FROM
    pgstattuple('{{schema_name}}.{{table_name}}'), pg_stat_all_tables stat
{% else %}
FROM
    pg_stat_all_tables stat
{% endif %}
JOIN
    pg_statio_all_tables statio ON stat.relid = statio.relid
JOIN
    pg_class cl ON cl.oid=stat.relid
WHERE
    stat.relid = {{ tid }}::oid
