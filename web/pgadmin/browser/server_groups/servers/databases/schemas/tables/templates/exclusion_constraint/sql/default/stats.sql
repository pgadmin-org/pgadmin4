SELECT
    idx_scan AS {{ conn|qtIdent(_('Index scans')) }},
    idx_tup_read AS {{ conn|qtIdent(_('Index tuples read')) }},
    idx_tup_fetch AS {{ conn|qtIdent(_('Index tuples fetched')) }},
    idx_blks_read AS {{ conn|qtIdent(_('Index blocks read')) }},
    idx_blks_hit AS {{ conn|qtIdent(_('Index blocks hit')) }},
    pg_relation_size({{ exid }}::OID) AS {{ conn|qtIdent(_('Index size')) }}
{#=== Extended stats ===#}
{% if is_pgstattuple %}
    ,version AS {{ conn|qtIdent(_('Version')) }},
    tree_level AS {{ conn|qtIdent(_('Tree level')) }},
    index_size AS {{ conn|qtIdent(_('Index size')) }},
    root_block_no AS {{ conn|qtIdent(_('Root block no')) }},
    internal_pages AS {{ conn|qtIdent(_('Internal pages')) }},
    leaf_pages AS {{ conn|qtIdent(_('Leaf pages')) }},
    empty_pages AS {{ conn|qtIdent(_('Empty pages')) }},
    deleted_pages AS {{ conn|qtIdent(_('Deleted pages')) }},
    avg_leaf_density AS {{ conn|qtIdent(_('Average leaf density')) }},
    leaf_fragmentation AS {{ conn|qtIdent(_('Leaf fragmentation')) }}
FROM
    pgstatindex('{{conn|qtIdent(schema)}}.{{conn|qtIdent(name)}}'), pg_stat_all_indexes stat
{% else %}
FROM
    pg_stat_all_indexes stat
{% endif %}
    JOIN pg_statio_all_indexes statio ON stat.indexrelid = statio.indexrelid
    JOIN pg_class cl ON cl.oid=stat.indexrelid
    WHERE stat.indexrelid = {{ exid }}::OID
