{% import 'macros/pga_jobstep.macros' as STEP %}
{% import 'macros/pga_schedule.macros' as SCHEDULE %}
{% if 'jobjclid' in data or 'jobname' in data or 'jobdesc' in data or 'jobhostagent' in data or 'jobenabled' in data %}
UPDATE pgagent.pga_job
SET {% if 'jobjclid' in data %}jobjclid={{ data.jobjclid|qtLiteral }}::integer{% if 'jobname' in data or 'jobdesc' in data or 'jobhostagent' in data or 'jobenabled' in data %}, {% endif %}{% endif %}
{% if 'jobname' in data %}jobname={{ data.jobname|qtLiteral }}::text{%if 'jobdesc' in data or 'jobhostagent' in data or 'jobenabled' in data %}, {% endif %}{% endif %}
{% if 'jobdesc' in data %}jobdesc={{ data.jobdesc|qtLiteral }}::text{%if 'jobhostagent' in data or 'jobenabled' in data %}, {% endif %}{% endif %}
{%if 'jobhostagent' in data %}jobhostagent={{ data.jobhostagent|qtLiteral }}::text{% if 'jobenabled' in data %}, {% endif %}{% endif %}
{% if 'jobenabled' in data %}jobenabled={% if data.jobenabled %}true{% else %}false{% endif %}{% endif %}

WHERE jobid = {{ jid }};
{% endif %}{% if 'jsteps' in data %}

{% if 'deleted' in data.jsteps %}{% for step in data.jsteps.deleted %}{{ STEP.DELETE(jid, step.jstid) }}{% endfor %}{% endif %}
{% if 'changed' in data.jsteps %}{% for step in data.jsteps.changed %}{{ STEP.UPDATE(has_connstr, jid, step.jstid, step) }}{% endfor %}{% endif %}
{% if 'added' in data.jsteps %}{% for step in data.jsteps.added %}{{ STEP.INSERT(has_connstr, jid, step) }}{% endfor %}{% endif %}{% endif %}{% if 'jschedules' in data %}

{% if 'deleted' in data.jschedules %}{% for schedule in data.jschedules.deleted %}{{ SCHEDULE.DELETE(jid, schedule.jscid) }}{% endfor %}{% endif %}
{% if 'changed' in data.jschedules %}{% for schedule in data.jschedules.changed %}{{ SCHEDULE.UPDATE(jid, schedule.jscid, schedule) }}{% endfor %}{% endif %}
{% if 'added' in data.jschedules %}

DO $$
DECLARE
    scid integer;
BEGIN
{% for schedule in data.jschedules.added %}{{ SCHEDULE.INSERT(jid, schedule) }}{% endfor %}
END
$$;
{% endif %}
{% endif %}
