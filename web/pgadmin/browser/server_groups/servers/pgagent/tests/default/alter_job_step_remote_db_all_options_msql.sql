
-- Inserting a step (jobid: <PGA_JOB_ID>)
INSERT INTO pgagent.pga_jobstep (
    jstjobid, jstname, jstenabled, jstkind,
    jstconnstr, jstdbname, jstonerror,
    jstcode, jstdesc
) VALUES (
    <PGA_JOB_ID>, 'step_2'::text, false , 's'::character(1),
    'host=localhost port=5434 dbname=postgres connect_timeout=20'::text, ''::name, 'f'::character(1),
    'SELECT 5;'::text, 'job step_2 description'::text
) RETURNING jstid;
