{### SQL to fetch tablespace object stats ###}
SELECT pg_size_pretty(pg_tablespace_size({{did}})) AS tablespace_size