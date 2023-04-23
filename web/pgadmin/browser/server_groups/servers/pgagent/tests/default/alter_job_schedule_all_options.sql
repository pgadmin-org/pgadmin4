DO $$
DECLARE
    jid integer;
    scid integer;
BEGIN
-- Creating a new job
INSERT INTO pgagent.pga_job(
    jobjclid, jobname, jobdesc, jobhostagent, jobenabled
) VALUES (
    4::integer, E'test_sql_job_local_db_updated_$%{}[]()&*^!@""''`\\/#'::text, 'test_job_step_schedule description updated'::text, 'test_host_updated'::text, false
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

-- Schedules
-- Inserting a schedule
INSERT INTO pgagent.pga_schedule(
    jscjobid, jscname, jscdesc, jscenabled,
    jscstart, jscend,    jscminutes, jschours, jscweekdays, jscmonthdays, jscmonths
) VALUES (
    jid, 'schedule_2'::text, 'test schedule_2 comment'::text, false,
    '<TIMESTAMPTZ_1>'::timestamp with time zone, '<TIMESTAMPTZ_2>'::timestamp with time zone,
    -- Minutes
    '{f,f,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f}'::bool[]::boolean[],
    -- Hours
    '{f,f,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,f,f,f,f}'::bool[]::boolean[],
    -- Week days
    '{f,f,t,t,t,t,t}'::bool[]::boolean[],
    -- Month days
    '{f,f,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,f,f,f,f,f,f,f,f,f,f,f,f}'::bool[]::boolean[],
    -- Months
    '{f,f,t,t,t,t,t,t,t,t,t,t}'::bool[]::boolean[]
) RETURNING jscid INTO scid;
-- Inserting a schedule exception
INSERT INTO pgagent.pga_exception (
    jexscid, jexdate, jextime
) VALUES (
    scid, to_date('2020-04-22', 'YYYY-MM-DD')::date, '01:22:00'::time without time zone
);
-- Inserting a schedule exception
INSERT INTO pgagent.pga_exception (
    jexscid, jexdate, jextime
) VALUES (
    scid, to_date('2020-04-23', 'YYYY-MM-DD')::date, '01:23:00'::time without time zone
);
END
$$;
