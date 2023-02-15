SELECT
    null_frac AS {{ conn|qtIdent(_('Null fraction')) }},
    avg_width AS {{ conn|qtIdent(_('Average width')) }},
    n_distinct AS {{ conn|qtIdent(_('Distinct values')) }},
    most_common_vals AS {{ conn|qtIdent(_('Most common values')) }},
    most_common_freqs AS {{ conn|qtIdent(_('Most common frequencies')) }},
    histogram_bounds AS {{ conn|qtIdent(_('Histogram bounds')) }},
    correlation AS {{ conn|qtIdent(_('Correlation')) }}
FROM
    pg_catalog.pg_stats
WHERE
    schemaname = {{schema|qtLiteral(conn)}}
    AND tablename = {{table|qtLiteral(conn)}}
    AND attname = {{column|qtLiteral(conn)}};
