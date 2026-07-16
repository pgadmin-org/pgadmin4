DO $$
DECLARE
    _client_name text;
    _chain_id bigint := {{ chain_id|qtLiteral(conn) }}::bigint;
    _found boolean := false;
BEGIN
    SELECT client_name INTO _client_name
    FROM timetable.chain
    WHERE chain_id = _chain_id;

    IF _client_name IS NULL OR _client_name = '' THEN
        FOR _client_name IN
            SELECT DISTINCT client_name FROM timetable.active_session
        LOOP
            _found := true;
            PERFORM timetable.notify_chain_start(_chain_id, _client_name);
        END LOOP;

        IF NOT _found THEN
            RAISE EXCEPTION 'no client_name specified and no active sessions';
        END IF;
    ELSE
        PERFORM timetable.notify_chain_start(_chain_id, _client_name);
    END IF;
END
$$;
