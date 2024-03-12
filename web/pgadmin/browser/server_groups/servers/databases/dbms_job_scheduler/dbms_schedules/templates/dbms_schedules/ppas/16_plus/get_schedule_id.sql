SELECT
    dss_schedule_id as jsscid, dss_schedule_name as jsscname
FROM sys.scheduler_0300_schedule
WHERE dss_schedule_name={{ jsscname|qtLiteral(conn) }}
