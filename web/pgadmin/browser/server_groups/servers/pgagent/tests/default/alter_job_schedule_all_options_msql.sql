

DO $$
DECLARE
    scid integer;
BEGIN
-- Inserting a schedule (jobid: <PGA_JOB_ID>)
INSERT INTO pgagent.pga_schedule(
    jscjobid, jscname, jscdesc, jscenabled,
    jscstart, jscend,    jscminutes, jschours, jscweekdays, jscmonthdays, jscmonths
) VALUES (
    <PGA_JOB_ID>, 'schedule_2'::text, 'test schedule_2 comment'::text, false,
    '2020-04-14 05:11:31 -07:00'::timestamp with time zone, '2020-04-15 05:11:34 -07:00'::timestamp with time zone,
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
);END
$$;
