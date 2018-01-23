SELECT CASE WHEN number_of_rows > 0
  THEN TRUE
       ELSE FALSE END AS ptable
FROM (
       SELECT count(*) AS number_of_rows
       FROM pg_class
         INNER JOIN pg_partitions ON relname = tablename
       WHERE pg_class.oid = {{ tid }}::oid
     ) AS number_of_partitions
