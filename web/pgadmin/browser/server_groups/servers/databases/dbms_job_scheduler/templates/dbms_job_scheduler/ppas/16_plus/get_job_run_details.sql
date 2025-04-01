SELECT
	scjobs.dsj_job_id as jobid, scjobs.dsj_job_name as jobname,
	jrd.workerpid, jrd.error as joberror, job.jobnextrun as jobnextrun,
	jrd.starttime as jobstarttime, jrd.endtime as jobendtime,
	CASE
		WHEN jrd.status = 's' THEN 'Success'
		WHEN jrd.status = 'f' THEN 'Failed'
		WHEN jrd.status = 'r' THEN 'Running'
	END as jobstatus
FROM sys.scheduler_0400_job scjobs
	JOIN sys.job_run_details jrd ON scjobs.dsj_job_id = jrd.jobid
	LEFT JOIN sys.jobs job ON scjobs.dsj_job_id = job.jobid
ORDER BY jobid;
