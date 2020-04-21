DO $$
DECLARE
    jid integer;
BEGIN
-- Creating a new job
INSERT INTO pgagent.pga_job(
    jobjclid, jobname, jobdesc, jobhostagent, jobenabled
) VALUES (
    4::integer, 'test_sql_job_local_db_updated_$%{}[]()&*^!@""''`\/#'::text, 'test_job_step_schedule description updated'::text, 'test_host_updated'::text, false
) RETURNING jobid INTO jid;

-- Steps
-- Inserting a step (jobid: NULL)
INSERT INTO pgagent.pga_jobstep (
    jstjobid, jstname, jstenabled, jstkind,
    jstconnstr, jstdbname, jstonerror,
    jstcode, jstdesc
) VALUES (
    jid, 'step_1'::text, true, 's'::character(1),
    ''::text, 'postgres'::name, 'f'::character(1),
    'SELECT 1;'::text, 'job step description'::text
) ;-- Inserting a step (jobid: NULL)
INSERT INTO pgagent.pga_jobstep (
    jstjobid, jstname, jstenabled, jstkind,
    jstconnstr, jstdbname, jstonerror,
    jstcode, jstdesc
) VALUES (
    jid, 'step_2_added'::text, true, 's'::character(1),
    ''::text, 'postgres'::name, 's'::character(1),
    'SELECT 3;'::text, 'job step 2 description'::text
) ;
END
$$;
