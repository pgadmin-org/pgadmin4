/*pga4dash*/
{% if log_format != '' %}
SELECT encode(pg_read_binary_file(pg_current_logfile('{{log_format}}'), {{ st }}, {{ ed }}), 'escape') AS log_data, current_setting('server_encoding') AS encoding;
{% elif st !='' and ed != '' %}
SELECT encode(pg_read_binary_file(pg_current_logfile(), {{ st }}, {{ ed }}), 'escape') AS log_data, current_setting('server_encoding') AS encoding;
{% else %}
SELECT encode(pg_read_binary_file(pg_current_logfile()), 'escape') AS log_data, current_setting('server_encoding') AS encoding;
{% endif %}
