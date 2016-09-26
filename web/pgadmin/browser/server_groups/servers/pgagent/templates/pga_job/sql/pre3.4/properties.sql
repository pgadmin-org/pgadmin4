SELECT
    j.jobid AS jobid, j.jobname as jobname, j.jobenabled as jobenabled,
    j.jobdesc AS jobdesc, j.jobhostagent AS jobhostagent,
    j.jobcreated AS jobcreated, j.jobchanged AS jobchanged,
    ag.jagstation AS jagagent, sub.jlgstatus AS jlgstatus,
    j.jobagentid AS jobagentid, j.jobnextrun AS jobnextrun,
    j.joblastrun AS joblastrun, j.jobjclid AS jobjclid,
    jc.jclname AS jobclass
FROM
    pgagent.pga_job j
    LEFT OUTER JOIN pgagent.pga_jobagent ag ON ag.jagpid=jobagentid
    LEFT OUTER JOIN (
        SELECT DISTINCT ON (jlgjobid) jlgstatus, jlgjobid
        FROM pgagent.pga_joblog
        ORDER BY jlgjobid, jlgid DESC
    ) sub ON sub.jlgjobid = j.jobid
    LEFT JOIN pgagent.pga_jobclass jc ON (j.jobjclid = jc.jclid)
{% if jid %}
WHERE j.jobid = {{ jid|qtLiteral }}::integer
{% endif %}
ORDER BY j.jobname;
