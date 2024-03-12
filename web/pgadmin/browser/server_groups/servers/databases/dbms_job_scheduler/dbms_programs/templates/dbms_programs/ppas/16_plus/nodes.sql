SELECT
    dsp_program_id AS jsprid, dsp_program_name AS jsprname,
    dsp_program_type AS jsprtype, dsp_enabled AS jsprenabled,
    dsp_comments AS jsprdesc
FROM sys.scheduler_0200_program prt
	JOIN sys.dba_scheduler_programs prv ON prt.dsp_program_name = prv.program_name
