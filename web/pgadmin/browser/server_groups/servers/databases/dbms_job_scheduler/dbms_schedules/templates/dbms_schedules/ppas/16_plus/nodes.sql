SELECT
    dss_schedule_id as jsscid, dss_schedule_name as jsscname,
    dss_comments as jsscdesc
FROM sys.scheduler_0300_schedule sct
	JOIN sys.dba_scheduler_schedules scv ON sct.dss_schedule_name = scv.schedule_name;
