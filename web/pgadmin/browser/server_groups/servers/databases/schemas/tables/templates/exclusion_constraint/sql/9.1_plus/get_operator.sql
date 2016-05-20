SELECT DISTINCT op.oprname as oprname
FROM pg_operator op,
( SELECT oid
  FROM (SELECT format_type(t.oid,NULL) AS typname,
      t.oid as oid
      FROM pg_type t
      JOIN pg_namespace nsp ON typnamespace=nsp.oid
      WHERE (NOT (typname = 'unknown' AND nspname = 'pg_catalog')) AND
      typisdefined AND
      typtype IN ('b', 'c', 'd', 'e', 'r') AND
      NOT EXISTS (SELECT 1
                  FROM pg_class
                  WHERE relnamespace=typnamespace AND
                  relname = typname AND
                  relkind != 'c') AND
      (typname NOT LIKE '_%' OR
      NOT EXISTS (SELECT 1
                  FROM pg_class
                  WHERE relnamespace=typnamespace AND
                    relname = SUBSTRING(typname FROM 2)::name AND
                    relkind != 'c'))
    {% if not show_sysobj %}
      AND nsp.nspname != 'information_schema'
    {% endif %}
      UNION SELECT 'bigserial', 0
      UNION SELECT 'serial', 0) t1
      WHERE typname = {{type|qtLiteral}}) AS types
WHERE oprcom > 0 AND
      (op.oprleft=types.oid OR op.oprright=types.oid)