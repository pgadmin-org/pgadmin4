SELECT tt.oid, format_type(tt.oid,NULL) AS typname
FROM pg_type tt
WHERE tt.oid in (
	SELECT casttarget from pg_cast
	WHERE castsource = {{type_id}}
	AND castcontext IN ('i', 'a')
	UNION
	SELECT typbasetype from pg_type where oid = {{type_id}}
	UNION
	SELECT oid FROM pg_type WHERE typbasetype = {{type_id}}
)
