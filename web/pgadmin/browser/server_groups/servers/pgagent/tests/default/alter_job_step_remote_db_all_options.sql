DO $$
DECLARE
    jid integer;
BEGIN
-- Creating a new job
INSERT INTO pgagent.pga_job(
    jobjclid, jobname, jobdesc, jobhostagent, jobenabled
) VALUES (
    1::integer, E'test_sql_job_remote_db_$%{}[]()&*^!@""''`\\/#'::text, 'test_job_step_schedule description'::text, 'test_host'::text, true
) RETURNING jobid INTO jid;

-- Steps
-- Inserting a step (jobid: NULL)
INSERT INTO pgagent.pga_jobstep (
    jstjobid, jstname, jstenabled, jstkind,
    jstconnstr, jstdbname, jstonerror,
    jstcode, jstdesc
) VALUES (
    jid, 'step_1'::text, true, 's'::character(1),
    'host=localhost port=5432 dbname=postgres connect_timeout=10'::text, ''::name, 's'::character(1),
    'SELECT 1;'::text, 'job step description'::text
) ;-- Inserting a step (jobid: NULL)
INSERT INTO pgagent.pga_jobstep (
    jstjobid, jstname, jstenabled, jstkind,
    jstconnstr, jstdbname, jstonerror,
    jstcode, jstdesc
) VALUES (
    jid, 'step_2'::text, false , 's'::character(1),
    'host=localhost port=5434 dbname=postgres connect_timeout=20'::text, ''::name, 'f'::character(1),
    'SELECT 5;'::text, 'job step_2 description'::text
) ;
END
$$;
