DO $$
DECLARE
    jid integer;
BEGIN
-- Creating a new job
INSERT INTO pgagent.pga_job(
    jobjclid, jobname, jobdesc, jobhostagent, jobenabled
) VALUES (
    1::integer, E'test_batch_job_$%{}[]()&*^!@""''`\\/#'::text, 'test_job_step_schedule description'::text, 'test_host'::text, true
) RETURNING jobid INTO jid;

-- Steps
-- Inserting a step (jobid: NULL)
INSERT INTO pgagent.pga_jobstep (
    jstjobid, jstname, jstenabled, jstkind,
    jstconnstr, jstdbname, jstonerror,
    jstcode, jstdesc
) VALUES (
    jid, 'step_1'::text, true, 'b'::character(1),
    ''::text, ''::name, 'i'::character(1),
    'SELECT 1;'::text, 'job step description'::text
) ;
END
$$;
