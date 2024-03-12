SELECT
    dss_schedule_id as jsscid, dss_schedule_name as jsscname,
    dss_start_date as jsscstart, dss_end_date as jsscend,
    dss_repeat_interval as jsscrepeatint, dss_comments as jsscdesc
FROM sys.scheduler_0300_schedule sct
{% if not jsscid %}
	JOIN sys.dba_scheduler_schedules scv ON sct.dss_schedule_name = scv.schedule_name
{% endif %}
{% if jsscid %}
WHERE dss_schedule_id={{jsscid}}::oid
{% endif %}
ORDER BY dss_schedule_name
