/*pga4dash*/
{% if log_format != '' %}
SELECT pg_stat_file(pg_current_logfile('{{log_format}}'));
{% else %}
SELECT pg_stat_file(pg_current_logfile());
{% endif %}
