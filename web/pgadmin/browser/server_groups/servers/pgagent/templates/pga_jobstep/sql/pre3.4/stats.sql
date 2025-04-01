SELECT
    jslid AS {{ conn|qtIdent(_('Run')) }},
    jslstatus AS {{ conn|qtIdent(_('Status')) }},
    jslresult AS {{ conn|qtIdent(_('Result')) }},
    jslstart AS {{ conn|qtIdent(_('Start time')) }},
    (jslstart + jslduration) AS {{ conn|qtIdent(_('End time')) }},
    jslduration AS {{ conn|qtIdent(_('Duration')) }},
    jsloutput AS {{ conn|qtIdent(_('Output')) }}
FROM
    pgagent.pga_jobsteplog
WHERE
    jsljstid = {{ jstid|qtLiteral(conn) }}::integer
ORDER BY jslid DESC
LIMIT {{ rows_threshold }};
