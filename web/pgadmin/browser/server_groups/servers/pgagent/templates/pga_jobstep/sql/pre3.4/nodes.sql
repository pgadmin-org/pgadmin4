SELECT
    jstid, jstjobid, jstname, jstenabled, jstkind = 's'::bpchar AS jstkind, jstdesc
FROM
    pgagent.pga_jobstep
WHERE
{% if jstid %}
    jstid = {{ jstid|qtLiteral(conn) }}::integer AND
{% endif %}
    jstjobid = {{ jid|qtLiteral(conn) }}::integer
ORDER BY jstname;
