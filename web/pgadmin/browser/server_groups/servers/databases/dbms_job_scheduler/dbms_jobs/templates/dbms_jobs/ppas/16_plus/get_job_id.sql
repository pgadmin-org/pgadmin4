SELECT
    dsj_job_id AS jsjobid, dsj_job_name AS jsjobname,
    dsj_enabled AS jsjobenabled
FROM sys.scheduler_0400_job
WHERE dsj_job_name={{ job_name|qtLiteral(conn) }}
