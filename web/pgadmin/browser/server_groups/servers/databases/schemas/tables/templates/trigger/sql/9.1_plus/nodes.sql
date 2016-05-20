SELECT t.oid, t.tgname as name, (CASE WHEN tgenabled = 'O' THEN true ElSE false END) AS is_enable_trigger
FROM pg_trigger t
    WHERE NOT tgisinternal
    AND tgrelid = {{tid}}::OID
    ORDER BY tgname;
