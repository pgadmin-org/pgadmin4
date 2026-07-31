DO $$
DECLARE
    _client_name text;
    _chain_id bigint := {{ chain_id|qtLiteral(conn) }}::bigint;
BEGIN
    SELECT client_name INTO _client_name
    FROM timetable.chain
    WHERE chain_id = _chain_id;

    IF _client_name IS NULL OR _client_name = '' THEN
        SELECT client_name INTO _client_name
        FROM timetable.active_session LIMIT 1;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'no client_name specified and no active agents';
        END IF;
    END IF;

    PERFORM timetable.notify_chain_start(_chain_id, _client_name);
END
$$;
