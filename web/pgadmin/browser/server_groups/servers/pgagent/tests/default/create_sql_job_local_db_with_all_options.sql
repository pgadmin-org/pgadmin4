DO $$
DECLARE
    jid integer;
    scid integer;
BEGIN
-- Creating a new job
INSERT INTO pgagent.pga_job(
    jobjclid, jobname, jobdesc, jobhostagent, jobenabled
) VALUES (
    1::integer, E'test_sql_job_local_db_$%{}[]()&*^!@""''`\\/#'::text, 'test_job_step_schedule description'::text, 'test_host'::text, true
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
) ;

-- Schedules
-- Inserting a schedule
INSERT INTO pgagent.pga_schedule(
    jscjobid, jscname, jscdesc, jscenabled,
    jscstart, jscend,    jscminutes, jschours, jscweekdays, jscmonthdays, jscmonths
) VALUES (
    jid, 'schedule_1'::text, 'test schedule comment'::text, true,
    '<TIMESTAMPTZ_1>'::timestamp with time zone, '<TIMESTAMPTZ_2>'::timestamp with time zone,
    -- Minutes
    '{t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f,f}'::bool[]::boolean[],
    -- Hours
    '{t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,f,f,f,f}'::bool[]::boolean[],
    -- Week days
    '{t,t,t,t,t,t,t}'::bool[]::boolean[],
    -- Month days
    '{t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,t,f,f,f,f,f,f,f,f,f,f,f,f}'::bool[]::boolean[],
    -- Months
    '{t,t,t,t,t,t,t,t,t,t,t,t}'::bool[]::boolean[]
) RETURNING jscid INTO scid;
-- Inserting a schedule exception
INSERT INTO pgagent.pga_exception (
    jexscid, jexdate, jextime
) VALUES (
    scid, to_date('2020-04-18', 'YYYY-MM-DD')::date, '01:18:00'::time without time zone
);
-- Inserting a schedule exception
INSERT INTO pgagent.pga_exception (
    jexscid, jexdate, jextime
) VALUES (
    scid, to_date('2020-04-19', 'YYYY-MM-DD')::date, '01:19:00'::time without time zone
);
END
$$;
