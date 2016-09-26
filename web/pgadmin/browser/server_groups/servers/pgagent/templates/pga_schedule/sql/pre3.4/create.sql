{% import 'macros/pga_schedule.macros' as SCHEDULE %}
DO $$
DECLARE
  jscid integer;
BEGIN
{{ SCHEDULE.INSERT(jid, data) }}
END
$$ LANGUAGE 'plpgsql';{% if fetch_id %}

{{ SCHEDULE.FETCH_CURRENT() }}{% endif %}
