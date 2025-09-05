SELECT t.oid, t.typname AS name,
    (CASE WHEN CAST(coalesce(t.typcollation, '0') AS integer) = 100 THEN true ElSE false END) AS is_collatable,
    t.typacl AS type_acl,
    t.typnamespace, t.typowner, t.typlen, t.typbyval, t.typtype,
    t.typcategory, t.typispreferred, t.typisdefined, t.typdelim,
    t.typrelid, t.typelem, t.typarray, t.typalign, t.typstorage,
	t.typnotnull, t.typbasetype, t.typtypmod, t.typndims,
    t.typcollation, t.typdefaultbin, t.typdefault,
	(SELECT pg_catalog.concat(nspname, '.', proname,'') FROM pg_proc pr JOIN pg_namespace nsp ON pr.pronamespace = nsp.oid
        WHERE pr.oid = t.typinput::oid) AS typinput,
    (SELECT pg_catalog.concat(nspname, '.', proname,'') FROM pg_proc pr JOIN pg_namespace nsp ON pr.pronamespace = nsp.oid
        WHERE pr.oid = t.typoutput::oid) AS typoutput,
	(SELECT pg_catalog.concat(nspname, '.', proname,'') FROM pg_proc pr JOIN pg_namespace nsp ON pr.pronamespace = nsp.oid
        WHERE pr.oid = t.typreceive::oid) AS typreceive,
	(SELECT pg_catalog.concat(nspname, '.', proname,'') FROM pg_proc pr JOIN pg_namespace nsp ON pr.pronamespace = nsp.oid
        WHERE pr.oid = t.typsend::oid) AS typsend,
	(SELECT pg_catalog.concat(nspname, '.', proname,'') FROM pg_proc pr JOIN pg_namespace nsp ON pr.pronamespace = nsp.oid
        WHERE pr.oid = t.typmodin::oid) AS typmodin,
	(SELECT pg_catalog.concat(nspname, '.', proname,'') FROM pg_proc pr JOIN pg_namespace nsp ON pr.pronamespace = nsp.oid
        WHERE pr.oid = t.typmodout::oid) AS typmodout,
	(SELECT pg_catalog.concat(nspname, '.', proname,'') FROM pg_proc pr JOIN pg_namespace nsp ON pr.pronamespace = nsp.oid
        WHERE pr.oid = t.typanalyze::oid) AS typanalyze,
	(SELECT pg_catalog.concat(nspname, '.', proname,'') FROM pg_proc pr JOIN pg_namespace nsp ON pr.pronamespace = nsp.oid
        WHERE pr.oid = t.typsubscript::oid) AS typsubscript,
    pg_catalog.format_type(t.oid, null) AS alias,
    pg_catalog.pg_get_userbyid(t.typowner) as typeowner, e.typname as element,
    description, ct.oid AS taboid,
    nsp.nspname AS schema,
    --MinimumVersion 9.1 START
    (SELECT pg_catalog.array_agg(provider || '=' || label) FROM pg_catalog.pg_seclabel sl1 WHERE sl1.objoid=t.oid) AS seclabels,
    -- END
    (CASE WHEN (t.oid <= {{ datlastsysoid}}::oid OR ct.oid != 0) THEN true ElSE false END) AS is_sys_type
FROM pg_catalog.pg_type t
    LEFT OUTER JOIN pg_catalog.pg_type e ON e.oid=t.typelem
    LEFT OUTER JOIN pg_catalog.pg_class ct ON ct.oid=t.typrelid AND ct.relkind <> 'c'
    LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=t.oid AND des.classoid='pg_type'::regclass)
    LEFT OUTER JOIN pg_catalog.pg_namespace nsp ON nsp.oid = t.typnamespace
WHERE t.typtype != 'd' AND t.typname NOT LIKE E'\\_%' AND t.typnamespace = {{scid}}::oid
{% if tid %}
    AND t.oid = {{tid}}::oid
{% endif %}
{% if not show_system_objects %}
    AND ct.oid is NULL
{% endif %}
ORDER BY t.typname;
