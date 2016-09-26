SELECT
    jscid, jscjobid, jscname, jscenabled
FROM
    pgagent.pga_schedule
WHERE
{% if jscid %}
    jscid = {{ jscid|qtLiteral }}::integer
{% else %}
    jscjobid = {{ jid|qtLiteral }}::integer
{% endif %}
ORDER BY jscname;
