{### To fetch debug function information ###}
SELECT
    p.proname AS name, l.lanname, p.proretset, p.prorettype, y.typname AS rettype,
    CASE WHEN proallargtypes IS NOT NULL THEN
            pg_catalog.array_to_string(ARRAY(
                SELECT
                    pg_catalog.format_type(p.proallargtypes[s.i], NULL)
                FROM
                    pg_catalog.generate_series(0, pg_catalog.array_upper(
                        p.proallargtypes, 1)) AS s(i)), ',')
        ELSE
            pg_catalog.array_to_string(ARRAY(
                SELECT
                    pg_catalog.format_type(p.proargtypes[s.i], NULL)
                FROM
                    pg_catalog.generate_series(0, pg_catalog.array_upper(
                        p.proargtypes, 1)) AS s(i)), ',')
        END AS proargtypenames,
    CASE WHEN proallargtypes IS NOT NULL THEN
            pg_catalog.array_to_string(ARRAY(
                SELECT proallargtypes[s.i] FROM
                    pg_catalog.generate_series(0, pg_catalog.array_upper(proallargtypes, 1)) s(i)), ',')
        ELSE
            pg_catalog.array_to_string(ARRAY(
                SELECT proargtypes[s.i] FROM
                    pg_catalog.generate_series(0, pg_catalog.array_upper(proargtypes, 1)) s(i)), ',')
        END AS proargtypes,
    pg_catalog.array_to_string(p.proargnames, ',') AS proargnames,
    pg_catalog.array_to_string(proargmodes, ',') AS proargmodes,

	{% if is_ppas_database %}
        CASE WHEN n.nspparent <> 0 THEN n.oid ELSE 0 END AS pkg,
        CASE WHEN n.nspparent <> 0 THEN n.nspname ELSE '' END AS pkgname,
        CASE WHEN n.nspparent <> 0 THEN (SELECT oid FROM pg_proc WHERE pronamespace=n.oid AND proname='cons') ELSE 0 END AS pkgconsoid,
        CASE WHEN n.nspparent <> 0 THEN g.oid ELSE n.oid END AS schema,
        CASE WHEN n.nspparent <> 0 THEN g.nspname ELSE n.nspname END AS schemaname,
        NOT (l.lanname = 'edbspl' AND protype = '1') AS isfunc,
	{%else%}
        0 AS pkg,
        '' AS pkgname,
        0 AS pkgconsoid,
        n.oid     AS schema,
        n.nspname AS schemaname,
        true AS isfunc,
	{%endif%}
	pg_catalog.pg_get_function_identity_arguments(p.oid) AS signature,

	{% if hasFeatureFunctionDefaults %}
        pg_catalog.pg_get_expr(p.proargdefaults, 'pg_catalog.pg_class'::regclass, false) AS proargdefaults,
        p.pronargdefaults
	{%else%}
		 '' AS proargdefaults, 0 AS pronargdefaults
	{%endif%}
FROM
    pg_catalog.pg_proc p
    LEFT JOIN pg_catalog.pg_namespace n ON p.pronamespace = n.oid
    LEFT JOIN pg_catalog.pg_language l ON p.prolang = l.oid
    LEFT JOIN pg_catalog.pg_type y ON p.prorettype = y.oid
{% if is_ppas_database %}
    LEFT JOIN pg_catalog.pg_namespace g ON n.nspparent = g.oid
{% endif %}
{% if fid %}
WHERE p.oid = {{fid}}::int;
{% endif %}