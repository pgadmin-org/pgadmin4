SELECT
    jstid, jstjobid, jstname, jstenabled, jstkind = 's'::bpchar AS jstkind
FROM
    pgagent.pga_jobstep
WHERE
{% if jstid %}
    jstid = {{ jstid|qtLiteral }}::integer AND
{% endif %}
    jstjobid = {{ jid|qtLiteral }}::integer
ORDER BY jstname;
