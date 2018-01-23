SELECT
  table_class.oid,
  partitions.partitiontablename                                                   AS name,
  (SELECT count(*)
   FROM pg_trigger
   WHERE tgrelid = table_class.oid AND tgisconstraint = FALSE)                     AS triggercount,
  (SELECT count(*)
   FROM pg_trigger
   WHERE tgrelid = table_class.oid AND tgisconstraint = FALSE AND tgenabled = 'O') AS has_enable_triggers,
  partitions.partitionboundary                                                    AS partition_value,
  partitions.partitionschemaname                                                  AS schema_id,
  schema_name,
  CASE WHEN sub_partitions.n > 0
    THEN TRUE
  ELSE FALSE END                                                                     is_partitioned,
  ''                                                                              AS partition_scheme
FROM
  (SELECT
     table_class.relnamespace,
     nsp.nspname AS schema_name,
     partitions.partitiontablename,
     partitions.partitionboundary,
     partitions.partitionschemaname
   FROM pg_class table_class
     INNER JOIN pg_partitions partitions
       ON (relname = tablename AND parentpartitiontablename IS NULL) OR relname = parentpartitiontablename
     LEFT JOIN pg_namespace nsp ON table_class.relnamespace = nsp.oid
   WHERE
    {% if ptid %} table_class.oid = {{ ptid }}::OID {% endif %}
    {% if not ptid %} table_class.oid = {{ tid }}::OID {% endif %}
  ) AS partitions
  LEFT JOIN (SELECT
               parentpartitiontablename,
               count(*) AS n
             FROM pg_partitions
             GROUP BY parentpartitiontablename) sub_partitions
    ON partitions.partitiontablename = sub_partitions.parentpartitiontablename
  LEFT JOIN pg_class table_class ON partitions.relnamespace = table_class.relnamespace AND partitions.partitiontablename = table_class.relname
ORDER BY partitions.partitiontablename;
