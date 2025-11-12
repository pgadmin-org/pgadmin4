SELECT
    dsp_program_id AS jsprid, dsp_program_name AS jsprname,
    dsp_program_type AS jsprtype,
	CASE WHEN dsp_program_type = 'PLSQL_BLOCK' THEN dsp_program_action ELSE '' END AS jsprcode,
	CASE WHEN dsp_program_type = 'STORED_PROCEDURE' THEN dsp_program_action ELSE '' END AS jsprproc,
    dsp_number_of_arguments AS jsprnoofargs, dsp_enabled AS jsprenabled,
    dsp_comments AS jsprdesc, array_agg(argument_name) AS proargnames,
	array_agg(argument_type) AS proargtypenames,
	array_agg(default_value) AS proargdefaultvals
FROM sys.scheduler_0200_program prt
{% if not jsprid %}
	JOIN sys.dba_scheduler_programs prv ON prt.dsp_program_name = prv.program_name
{% endif %}
	LEFT JOIN dba_scheduler_program_args prargs ON dsp_program_name = prargs.program_name
{% if jsprid %}
WHERE dsp_program_id={{jsprid}}::oid
{% endif %}
GROUP BY dsp_program_id, dsp_program_name
