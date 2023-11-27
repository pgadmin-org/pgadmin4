SELECT
    st.relname AS {{ conn|qtIdent(_('Table name')) }},
    pg_catalog.pg_relation_size(st.relid)
        + CASE WHEN cl.reltoastrelid = 0 THEN 0 ELSE pg_catalog.pg_relation_size(cl.reltoastrelid)
        + COALESCE((SELECT SUM(pg_catalog.pg_relation_size(indexrelid))
                        FROM pg_catalog.pg_index WHERE indrelid=cl.reltoastrelid)::int8, 0) END
        + COALESCE((SELECT SUM(pg_catalog.pg_relation_size(indexrelid))
                        FROM pg_catalog.pg_index WHERE indrelid=st.relid)::int8, 0) AS {{ conn|qtIdent(_('Total Size')) }},
    n_tup_ins AS {{ conn|qtIdent(_('Tuples inserted')) }},
    n_tup_upd AS {{ conn|qtIdent(_('Tuples updated')) }},
    n_tup_del AS {{ conn|qtIdent(_('Tuples deleted')) }},
    n_tup_hot_upd AS {{ conn|qtIdent(_('Tuples HOT updated')) }},
    n_live_tup AS {{ conn|qtIdent(_('Live tuples')) }},
    n_dead_tup AS {{ conn|qtIdent(_('Dead tuples')) }},
    last_vacuum AS {{ conn|qtIdent(_('Last vacuum')) }},
    last_autovacuum AS {{ conn|qtIdent(_('Last autovacuum')) }},
    last_analyze AS {{ conn|qtIdent(_('Last analyze')) }},
    last_autoanalyze AS {{ conn|qtIdent(_('Last autoanalyze')) }},
    vacuum_count AS {{ conn|qtIdent(_('Vacuum counter')) }},
    autovacuum_count AS {{ conn|qtIdent(_('Autovacuum counter')) }},
    analyze_count AS {{ conn|qtIdent(_('Analyze counter')) }},
    autoanalyze_count AS {{ conn|qtIdent(_('Autoanalyze counter')) }}
FROM
    pg_catalog.pg_stat_all_tables st
JOIN
    pg_catalog.pg_class cl on cl.oid=st.relid and cl.relkind IN ('r','s','t','p')
WHERE
    schemaname = {{schema_name|qtLiteral(conn)}}
ORDER BY st.relname;
