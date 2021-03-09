SELECT synname AS name, pg_catalog.pg_get_userbyid(synowner) AS owner,
  synobjschema, synobjname,  ns.nspname as schema,
  COALESCE((SELECT relkind
  FROM pg_catalog.pg_class c, pg_catalog.pg_namespace n
  WHERE c.relnamespace = n.oid
    AND n.nspname = synobjschema
    AND c.relname = synobjname),
  (SELECT CASE WHEN p.protype = '0' THEN 'f'::"char" ELSE 'p'::"char" END
  FROM pg_catalog.pg_proc p, pg_catalog.pg_namespace n
    WHERE p.pronamespace = n.oid
      AND n.nspname = synobjschema
      AND p.proname = synobjname LIMIT 1), 's') AS targettype -- Default s = Synonym
FROM pg_catalog.pg_synonym s  JOIN pg_catalog.pg_namespace ns ON s.synnamespace = ns.oid
 WHERE s.synnamespace={{scid}}::oid
 {% if syid %}
   AND s.oid={{syid}}::oid
 {% endif %}
ORDER BY synname;
