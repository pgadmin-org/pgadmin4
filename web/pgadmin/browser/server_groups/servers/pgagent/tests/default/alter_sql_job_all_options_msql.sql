UPDATE pgagent.pga_job
SET jobjclid=4::integer, jobname=E'test_sql_job_local_db_updated_$%{}[]()&*^!@""''`\\/#'::text, jobdesc='test_job_step_schedule description updated'::text, jobhostagent='test_host_updated'::text, jobenabled=false
WHERE jobid = <PGA_JOB_ID>;
