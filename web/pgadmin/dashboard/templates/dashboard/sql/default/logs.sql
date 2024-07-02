/*pga4dash*/
{% if log_format != '' %}
SELECT pg_read_file(pg_current_logfile('{{log_format}}'), {{ st }}, {{ ed }});
{% elif st !='' and ed != '' %}
SELECT pg_read_file(pg_current_logfile(), {{ st }}, {{ ed }});
{% else %}
SELECT pg_read_file(pg_current_logfile());
{% endif %}
