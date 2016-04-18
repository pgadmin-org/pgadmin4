SELECT
    procpid AS "{{ conn|qtIdent('PID') }},
    usename AS "{{ conn|qtIdent(_('User')|safe) }},
    datname AS "{{ conn|qtIdent(_('Database')|safe) }},
    backend_start AS "{{ conn|qtIdent(_('Backend start')|safe) }},
    CASE
    WHEN client_hostname IS NOT NULL AND client_hostname != '' THEN
        client_hostname || ':' || client_port
    WHEN client_addr IS NOT NULL AND client_addr::text != '' THEN
        client_addr || ':' || client_port
    WHEN client_port = -1 THEN
        'local pipe'
    ELSE
        'localhost:' || client_port
    END AS "{{ conn|qtIdent(_('Client')|safe) }},
    application_name AS "{{ conn|qtIdent(_('Application')|safe) }},
    waiting AS "{{ conn|qtIdent(_('Waiting?')|safe) }},
    current_query AS "{{ conn|qtIdent(_('Query')|safe) }},
    query_start AS "{{ conn|qtIdent(_('Query start')|safe) }},
    xact_start AS "{{ conn|qtIdent(_('Xact start')|safe) }}
FROM
    pg_stat_activity sa
WHERE
    (SELECT r.rolsuper OR r.oid = sa.usesysid  FROM pg_roles r WHERE r.rolname = current_user)
UNION
SELECT
    procpid AS "{{ conn|qtIdent('PID') }},
    usename AS "{{ conn|qtIdent(_('User')|safe) }},
    '' AS "{{ conn|qtIdent(_('Database')|safe) }},
    backend_start AS "{{ conn|qtIdent(_('Backend start')|safe) }},
    CASE
    WHEN client_hostname IS NOT NULL AND client_hostname != '' THEN
        client_hostname || ':' || client_port
    WHEN client_addr IS NOT NULL AND client_addr::text != '' THEN
        client_addr || ':' || client_port
    WHEN client_port = -1 THEN
        'local pipe'
    ELSE
        'localhost:' || client_port
    END AS "{{ conn|qtIdent(_('Client')|safe) }},
    {{ _('Streaming Replication') }}|safe|qtLiteral AS "{{ conn|qtIdent(_('Application')|safe) }},
    null AS "{{ conn|qtIdent(_('Waiting?')|safe) }},
    state || ' [sync (state: ' || COALESCE(sync_state, '') || ', priority: ' || sync_priority::text || ')] (' || sent_location || ' sent, ' || write_location || ' written, ' || flush_location || ' flushed, ' || replay_location || ' applied)' AS "{{ conn|qtIdent(_('Query')|safe) }},
    null AS "{{ conn|qtIdent(_('Query start')|safe) }},
    null AS "{{ conn|qtIdent(_('Xact start')|safe) }}
FROM
    pg_stat_replication sa
WHERE
    (SELECT r.rolsuper OR r.oid = sa.usesysid  FROM pg_roles r WHERE r.rolname = current_user)
