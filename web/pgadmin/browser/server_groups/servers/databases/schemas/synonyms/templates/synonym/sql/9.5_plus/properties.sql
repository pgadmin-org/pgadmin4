SELECT synname AS name, pg_get_userbyid(synowner) AS owner,
  synobjschema, synobjname,  ns.nspname as schema,
  COALESCE(
  (SELECT relkind
  FROM pg_class c, pg_namespace n
  WHERE c.relnamespace = n.oid
    AND n.nspname = synobjschema
    AND c.relname = synobjname),
  -- For Function/Procedure
  (SELECT CASE WHEN p.protype = '0' THEN 'f'::"char" ELSE 'p'::"char" END
  FROM pg_proc p, pg_namespace n
    WHERE p.pronamespace = n.oid
      AND n.nspname = synobjschema
      AND p.proname = synobjname LIMIT 1),
  -- For Package
  (SELECT CASE WHEN count(*) > 0 THEN 'P'::"char" END
  FROM pg_namespace
    WHERE nspparent IN (SELECT oid
                           FROM pg_namespace
                        WHERE nspname = synobjschema LIMIT 1)
      AND nspname = synobjname
      AND nspobjecttype = 0),
  -- Default s = Synonym
  's') AS targettype,
  CASE WHEN ns.nspname = 'public' THEN true ELSE false END AS is_public_synonym
FROM pg_synonym s  JOIN pg_namespace ns ON s.synnamespace = ns.oid
 WHERE s.synnamespace={{scid}}::oid
 {% if syid %}
   AND s.synname={{ syid|qtLiteral }}
 {% endif %}
ORDER BY synname;