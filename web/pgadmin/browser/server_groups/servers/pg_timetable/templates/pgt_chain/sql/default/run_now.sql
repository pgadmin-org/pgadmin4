SELECT timetable.notify_chain_start(
    {{ chain_id|qtLiteral(conn) }}::bigint,
    (
        SELECT client_name
        FROM timetable.chain
        WHERE chain_id = {{ chain_id|qtLiteral(conn) }}::integer
    )
) AS result;
