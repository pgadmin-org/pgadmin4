SELECT
    pid AS "PID",
    usename AS {{ conn|qtIdent(_('User')) }},
    datname AS {{ conn|qtIdent(_('Database')) }},
    backend_start AS {{ conn|qtIdent(_('Backend start')) }},
    CASE
    WHEN client_hostname IS NOT NULL AND client_hostname != '' THEN
        client_hostname || ':' || client_port
    WHEN client_addr IS NOT NULL AND client_addr::text != '' THEN
        client_addr::text || ':' || client_port
    WHEN client_port = -1 THEN
        'local pipe'
    ELSE
        'localhost:' || client_port
    END AS {{ conn|qtIdent(_('Client')) }},
    application_name AS {{ conn|qtIdent(_('Application')) }},
    wait_event_type AS {{ conn|qtIdent(_('Wait event type')) }},
    wait_event AS {{ conn|qtIdent(_('Wait event name')) }},
    query AS {{ conn|qtIdent(_('Query')) }},
    query_start AS {{ conn|qtIdent(_('Query start')) }},
    xact_start AS {{ conn|qtIdent(_('Xact start')) }}
FROM
    pg_catalog.pg_stat_activity sa
WHERE
    (SELECT r.rolsuper OR r.oid = sa.usesysid  FROM pg_catalog.pg_roles r WHERE r.rolname = current_user)
UNION
SELECT
    pid AS "PID",
    usename AS {{ conn|qtIdent(_('User')) }},
    '' AS {{ conn|qtIdent(_('Database')) }},
    backend_start AS {{ conn|qtIdent(_('Backend start')) }},
    CASE
    WHEN client_hostname IS NOT NULL AND client_hostname != '' THEN
        client_hostname || ':' || client_port
    WHEN client_addr IS NOT NULL AND client_addr::text != '' THEN
        client_addr::text || ':' || client_port
    WHEN client_port = -1 THEN
        'local pipe'
    ELSE
        'localhost:' || client_port
    END AS {{ conn|qtIdent(_('Client')) }},
    {{ _('Streaming Replication')|qtLiteral }} AS {{ conn|qtIdent(_('Application')) }},
    null AS {{ conn|qtIdent(_('Wait event type')) }},
    null AS {{ conn|qtIdent(_('Wait event name')) }},
    state || ' [sync (state: ' || COALESCE(sync_state, '') || ', priority: ' || sync_priority::text || ')] (' || sent_location || ' sent, ' || write_location || ' written, ' || flush_location || ' flushed, ' || replay_location || ' applied)' AS {{ conn|qtIdent(_('Query')) }},
    null AS {{ conn|qtIdent(_('Query start')) }},
    null AS {{ conn|qtIdent(_('Xact start')) }}
FROM
    pg_catalog.pg_stat_replication sa
WHERE
    (SELECT r.rolsuper OR r.oid = sa.usesysid  FROM pg_catalog.pg_roles r WHERE r.rolname = current_user)
