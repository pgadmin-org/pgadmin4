{% import 'macros/pga_schedule.macros' as SCHEDULE %}
DO $$
DECLARE
    scid integer;
BEGIN
{{ SCHEDULE.INSERT(jid, data) }}
END
$$;{% if fetch_id %}

SELECT jscid FROM pgagent.pga_schedule WHERE xmin::text = (txid_current() % (2^32)::bigint)::text;{% endif %}
