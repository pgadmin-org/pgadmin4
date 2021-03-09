{#
-- Given SQL is workaround
-- We need to implement a mechanism to check for valid supported server encoding
#}
SELECT *
FROM
    (SELECT pg_catalog.pg_encoding_to_char(s.i) AS encoding
    FROM (SELECT pg_catalog.generate_series(0, 100, 1) as i) s) a
WHERE encoding != '' ORDER BY encoding;

{#
-- For future use, Do not delete
--SELECT * FROM
--(SELECT s.i as id, pg_encoding_to_char(s.i)
--	as encoding
--	FROM (SELECT generate_series(0, 100, 1) as i) s) a
--WHERE encoding != ''
#}
