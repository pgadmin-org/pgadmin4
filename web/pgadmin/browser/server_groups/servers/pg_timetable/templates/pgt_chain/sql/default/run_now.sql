WITH a AS (
    SELECT c.chain_id, s.client_name, c.client_name AS designated_client
    FROM timetable.chain AS c
        LEFT JOIN LATERAL
            (SELECT client_name
             FROM timetable.active_session AS a
             WHERE c.client_name IS NULL OR a.client_name = c.client_name
             LIMIT 1) AS s ON true
    WHERE c.chain_id = {{ chain_id|qtLiteral(conn) }}::bigint
)
SELECT CASE
        WHEN a.client_name IS NULL AND designated_client IS NOT NULL THEN
            format('designated client %s is not active', designated_client)
        WHEN a.client_name IS NOT NULL THEN
            format('client %s has been notified to run', a.client_name)
        ELSE
            'No clients active to be notified'
    END AS notice,
    CASE WHEN a.client_name > '' THEN
        timetable.notify_chain_start(chain_id, client_name)
        ELSE NULL
    END AS notification_acted,
    (a.client_name > '') AS notification
FROM a;
