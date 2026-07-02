{# Check if pg_timetable schema exists in the current connected database #}
SELECT EXISTS (
    SELECT 1 FROM pg_namespace WHERE nspname = 'timetable'
) AS has_timetable;
