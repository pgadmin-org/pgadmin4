SELECT
    calls AS {{ conn|qtIdent(_('Number of calls')) }},
    total_time AS {{ conn|qtIdent(_('Total time')) }},
    self_time AS {{ conn|qtIdent(_('Self time')) }}
FROM
    pg_catalog.pg_stat_user_functions
WHERE
    funcid = {{fnid}}::OID
