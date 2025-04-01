SELECT
    jobid, jobname, jobenabled, jobdesc
FROM
    pgagent.pga_job
{% if jid %}
WHERE jobid = {{ jid|qtLiteral(conn) }}::integer
{% endif %}
ORDER BY jobname;
