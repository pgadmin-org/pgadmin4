
-- Inserting a step (jobid: <PGA_JOB_ID>)
INSERT INTO pgagent.pga_jobstep (
    jstjobid, jstname, jstenabled, jstkind,
    jstconnstr, jstdbname, jstonerror,
    jstcode, jstdesc
) VALUES (
    <PGA_JOB_ID>, 'step_2_added'::text, true, 's'::character(1),
    ''::text, 'postgres'::name, 's'::character(1),
    'SELECT 3;'::text, 'job step 2 description'::text
) RETURNING jstid;
