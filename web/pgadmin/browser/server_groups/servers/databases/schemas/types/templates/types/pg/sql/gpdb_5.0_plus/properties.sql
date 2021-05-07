SELECT
  t.oid,
  t.typname                   AS name,
  FALSE            AS is_collatable,
  array_to_string(ct.relacl::text[], ', ') AS acl,
  t.*,
  format_type(t.oid, NULL)    AS alias,
  pg_get_userbyid(t.typowner) AS typeowner,
  e.typname                   AS element,
  description,
  ct.oid                      AS taboid,
  nsp.nspname                 AS schema,
  ARRAY [] :: TEXT []         AS seclabels,
  (CASE WHEN (t.oid <= {{datlastsysoid}}:: OID OR ct.oid != 0)
    THEN TRUE
   ELSE FALSE END)            AS is_sys_type
FROM pg_type t
  LEFT OUTER JOIN pg_type e ON e.oid = t.typelem
  LEFT OUTER JOIN pg_class ct ON ct.oid = t.typrelid AND ct.relkind <> 'c'
  LEFT OUTER JOIN pg_description des
    ON (des.objoid = t.oid AND des.classoid = 'pg_type' :: REGCLASS)
  LEFT OUTER JOIN pg_namespace nsp ON nsp.oid = t.typnamespace
WHERE t.typtype != 'd' AND t.typname NOT LIKE E'\\_%' AND
      t.typnamespace = {{scid}}:: OID
{% if tid %}
AND t.oid = {{tid}}:: OID
{% endif %}
{% if not show_system_objects %}
AND ct.oid IS NULL
{% endif %}
ORDER BY t.typname;
