
-- Inserting a step (jobid: <PGA_JOB_ID>)
INSERT INTO pgagent.pga_jobstep (
    jstjobid, jstname, jstenabled, jstkind,
    jstconnstr, jstdbname, jstonerror,
    jstcode, jstdesc
) VALUES (
    <PGA_JOB_ID>, 'step_2'::text, false , 'b'::character(1),
    ''::text, ''::name, 's'::character(1),
    'SELECT 10;'::text, 'job step_2 description'::text
) RETURNING jstid;
