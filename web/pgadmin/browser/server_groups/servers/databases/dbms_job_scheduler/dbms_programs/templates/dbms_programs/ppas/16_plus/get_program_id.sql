SELECT
    dsp_program_id AS jsprid, dsp_program_name AS jsprname,
    dsp_enabled AS jsprenabled
FROM sys.scheduler_0200_program
WHERE dsp_program_name={{ jsprname|qtLiteral(conn) }}
