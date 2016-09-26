{% import 'macros/pga_jobstep.macros' as STEP %}
{% import 'macros/pga_schedule.macros' as SCHEDULE %}
DO $$
DECLARE
    jid integer;{% if 'jschedules' in data and data.jschedules|length > 0 %}

    scid integer;{% endif %}

BEGIN
-- Creating a new job
INSERT INTO pgagent.pga_job(
    jobjclid, jobname, jobdesc, jobhostagent, jobenabled
) VALUES (
    {{ data.jobjclid|qtLiteral }}::integer, {{ data.jobname|qtLiteral }}::text, {{ data.jobdesc|qtLiteral }}::text, {{ data.jobhostagent|qtLiteral }}::text, {% if data.jobenabled %}true{% else %}false{% endif %}

) RETURNING jobid INTO jid;{% if 'jsteps' in data and data.jsteps|length > 0 %}


-- Steps
{% for step in data.jsteps %}{{ STEP.INSERT(has_connstr, None, step) }}{% endfor %}
{% endif %}{% if 'jschedules' in data and data.jschedules|length > 0 %}


-- Schedules
{% for schedule in data.jschedules %}{{ SCHEDULE.INSERT(None, schedule) }}{% endfor %}
{% endif %}

END
$$;{% if fetch_id %}

SELECT jobid FROM pgagent.pga_job WHERE xmin::text = (txid_current() % (2^32)::bigint)::text;{% endif %}
