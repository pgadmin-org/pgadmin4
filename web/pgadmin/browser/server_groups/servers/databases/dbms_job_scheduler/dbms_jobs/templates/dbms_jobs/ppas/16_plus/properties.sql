SELECT
	job.dsj_job_id as jsjobid, job_name as jsjobname, program_name as jsjobprname, job_type as jsprtype,
	CASE WHEN job_type = 'PLSQL_BLOCK' THEN job_action ELSE '' END AS jsprcode,
	CASE WHEN job_type = 'STORED_PROCEDURE' THEN job_action ELSE '' END AS jsprproc,
	job_action, number_of_arguments as jsprnoofargs, schedule_name as jsjobscname,
    start_date as jsscstart, end_date as jsscend, repeat_interval as jsscrepeatint,
	enabled as jsjobenabled, comments as jsjobdesc,
	run_count as jsjobruncount, failure_count as jsjobfailurecount,
	job.dsj_program_id as program_id, job.dsj_schedule_id as schedule_id
FROM sys.dba_scheduler_jobs jobv
	LEFT JOIN sys.scheduler_0400_job job ON jobv.job_name = job.dsj_job_name
{% if jsjobid %}
WHERE job.dsj_job_id={{jsjobid}}::oid
{% endif %}
