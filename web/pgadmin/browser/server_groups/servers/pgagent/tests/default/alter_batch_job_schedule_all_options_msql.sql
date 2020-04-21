

DO $$
DECLARE
    scid integer;
BEGIN
-- Inserting a schedule (jobid: <PGA_JOB_ID>)
INSERT INTO pgagent.pga_schedule(
    jscjobid, jscname, jscdesc, jscenabled,
    jscstart, jscend,    jscminutes, jschours, jscweekdays, jscmonthdays, jscmonths
) VALUES (
    <PGA_JOB_ID>, 'schedule_2'::text, 'test schedule_2 comment'::text, true,
    '2020-04-15 05:11:31 -07:00'::timestamp with time zone, '2020-04-16 05:11:34 -07:00'::timestamp with time zone,
    -- Minutes
    ARRAY[true,true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false]::boolean[],
    -- Hours
    ARRAY[true,true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false]::boolean[],
    -- Week days
    ARRAY[true,true,false,false,false,false,false]::boolean[],
    -- Month days
    ARRAY[true,true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false]::boolean[],
    -- Months
    ARRAY[true,true,false,false,false,false,false,false,false,false,false,false]::boolean[]
) RETURNING jscid INTO scid;END
$$;
