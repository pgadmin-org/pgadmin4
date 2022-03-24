SELECT s.oid, synname AS name, pg_catalog.pg_get_userbyid(synowner) AS owner,
  synobjschema, synobjname,  ns.nspname as schema,
  COALESCE(
  (SELECT relkind
  FROM pg_catalog.pg_class c, pg_catalog.pg_namespace n
  WHERE c.relnamespace = n.oid
    AND n.nspname = synobjschema
    AND c.relname = synobjname),
  -- For Function/Procedure
  (SELECT CASE WHEN p.protype = '0' THEN 'f'::"char" ELSE 'p'::"char" END
  FROM pg_catalog.pg_proc p, pg_catalog.pg_namespace n
    WHERE p.pronamespace = n.oid
      AND n.nspname = synobjschema
      AND p.proname = synobjname LIMIT 1),
  -- For Package
  (SELECT CASE WHEN count(*) > 0 THEN 'P'::"char" END
  FROM pg_catalog.pg_namespace
    WHERE nspparent IN (SELECT oid
                           FROM pg_catalog.pg_namespace
                        WHERE nspname = synobjschema LIMIT 1)
      AND nspname = synobjname
      AND nspobjecttype = 0),
  -- Default s = Synonym
  's') AS targettype
FROM pg_catalog.pg_synonym s  JOIN pg_catalog.pg_namespace ns ON s.synnamespace = ns.oid
 WHERE s.synnamespace={{scid}}::oid
 {% if syid %}
   AND s.oid={{syid}}::oid
 {% endif %}
{% if schema_diff %}
    AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
        WHERE objid = s.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
ORDER BY synname;
