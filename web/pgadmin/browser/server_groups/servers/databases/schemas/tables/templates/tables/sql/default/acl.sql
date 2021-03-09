SELECT 'relacl' as deftype, COALESCE(privileges_information.grantee, 'PUBLIC') grantee, privileges_information.grantor,
    pg_catalog.array_agg(privilege_type) as privileges, pg_catalog.array_agg(is_grantable) as grantable
from (
  SELECT
      acls.grantee, acls.grantor, CASE WHEN acls.is_grantable = 'YES' THEN TRUE ELSE FALSE END as is_grantable,
      CASE acls.privilege_type
      WHEN 'CONNECT' THEN 'c'
      WHEN 'CREATE' THEN 'C'
      WHEN 'DELETE' THEN 'd'
      WHEN 'EXECUTE' THEN 'X'
      WHEN 'INSERT' THEN 'a'
      WHEN 'REFERENCES' THEN 'x'
      WHEN 'SELECT' THEN 'r'
      WHEN 'TEMPORARY' THEN 'T'
      WHEN 'TRIGGER' THEN 't'
      WHEN 'TRUNCATE' THEN 'D'
      WHEN 'UPDATE' THEN 'w'
      WHEN 'USAGE' THEN 'U'
      ELSE 'UNKNOWN'
    END AS privilege_type
    FROM
      (SELECT rel.relacl, rel.relname
          FROM pg_catalog.pg_class rel
            LEFT OUTER JOIN pg_catalog.pg_tablespace spc on spc.oid=rel.reltablespace
            LEFT OUTER JOIN pg_catalog.pg_constraint con ON con.conrelid=rel.oid AND con.contype='p'
            LEFT OUTER JOIN pg_catalog.pg_class tst ON tst.oid = rel.reltoastrelid
          WHERE rel.relkind IN ('r','s','t') AND rel.relnamespace = {{ scid }}::oid
                AND rel.oid = {{ tid }}::OID
      ) rel
    LEFT JOIN information_schema.table_privileges acls ON (table_name = rel.relname)
) as privileges_information


GROUP BY privileges_information.grantee,privileges_information.grantor
ORDER BY privileges_information.grantee
