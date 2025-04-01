SELECT
    jlgid AS {{ conn|qtIdent(_('Run')) }},
    jlgstatus AS {{ conn|qtIdent(_('Status')) }},
    jlgstart AS {{ conn|qtIdent(_('Start time')) }},
    jlgduration AS {{ conn|qtIdent(_('Duration')) }},
    (jlgstart + jlgduration) AS {{ conn|qtIdent(_('End time')) }}
FROM
    pgagent.pga_joblog
WHERE
    jlgjobid = {{ jid|qtLiteral(conn) }}::integer
ORDER BY jlgid DESC
LIMIT {{ rows_threshold }};
