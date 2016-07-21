SELECT t.oid, t.typname AS name,
    (CASE WHEN CAST(coalesce(t.typcollation, '0') AS integer) = 100 THEN true ElSE false END) AS is_collatable,
    t.typacl AS type_acl,
    t.*, format_type(t.oid, null) AS alias,
    pg_get_userbyid(t.typowner) as typeowner, e.typname as element,
    description, ct.oid AS taboid,
    nsp.nspname AS schema,
    --MinimumVersion 9.1 START
    (SELECT array_agg(provider || '=' || label) FROM pg_seclabel sl1 WHERE sl1.objoid=t.oid) AS seclabels,
    -- END
    (CASE WHEN (t.oid <= {{ datlastsysoid}}::oid OR ct.oid != 0) THEN true ElSE false END) AS is_sys_type
FROM pg_type t
    LEFT OUTER JOIN pg_type e ON e.oid=t.typelem
    LEFT OUTER JOIN pg_class ct ON ct.oid=t.typrelid AND ct.relkind <> 'c'
    LEFT OUTER JOIN pg_description des ON (des.objoid=t.oid AND des.classoid='pg_type'::regclass)
    LEFT OUTER JOIN pg_namespace nsp ON nsp.oid = t.typnamespace
WHERE t.typtype != 'd' AND t.typname NOT LIKE E'\\_%' AND t.typnamespace = {{scid}}::oid
{% if tid %}
    AND t.oid = {{tid}}::oid
{% endif %}
{% if not show_system_objects %}
    AND ct.oid is NULL
{% endif %}
ORDER BY t.typname;