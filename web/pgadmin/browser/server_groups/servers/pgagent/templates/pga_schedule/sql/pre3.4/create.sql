{% import 'macros/pga_schedule.macros' as SCHEDULE %}
DO $$
DECLARE
    scid integer;
BEGIN
{{ SCHEDULE.INSERT(jid, data) }}
END
$$;
