{# Get OID for CAST #}
{% if srctyp and trgtyp %}
    SELECT
        ca.oid
    FROM pg_cast ca
    WHERE ca.castsource = (SELECT t.oid FROM pg_type t WHERE format_type(t.oid, NULL) = {{srctyp|qtLiteral}})
    AND ca.casttarget = (SELECT t.oid FROM pg_type t WHERE format_type(t.oid, NULL) = {{trgtyp|qtLiteral}})
    {% if datlastsysoid %}
     AND ca.oid > {{datlastsysoid}}::OID
    {% endif %}

{# FETCH properties for CAST #}
{% else %}
    SELECT
        ca.oid,
    CASE
        WHEN {{datlastsysoid}}::OID > ca.oid then True ELSE False
    END AS syscast,
    CASE
        WHEN ca.castcontext = 'a' THEN 'ASSIGNMENT'
        WHEN ca.castcontext = 'i' THEN 'IMPLICIT'
        WHEN ca.castcontext = 'e' THEN 'EXPLICIT'
    END AS castcontext,
    CASE
        WHEN proname IS NULL THEN 'binary compatible'
        ELSE proname || '(' || pg_catalog.pg_get_function_identity_arguments(pr.oid) || ')'
    END AS proname,
        ca.castfunc,
        format_type(st.oid,NULL) AS srctyp,
        format_type(tt.oid,tt.typtypmod) AS trgtyp,
        ns.nspname AS srcnspname,
        nt.nspname AS trgnspname,
        np.nspname AS pronspname,
        description,
        concat(format_type(st.oid,NULL),'->',format_type(tt.oid,tt.typtypmod)) as name
    FROM pg_cast ca
    JOIN pg_type st ON st.oid=castsource
    JOIN pg_namespace ns ON ns.oid=st.typnamespace
    JOIN pg_type tt ON tt.oid=casttarget
    JOIN pg_namespace nt ON nt.oid=tt.typnamespace
    LEFT JOIN pg_proc pr ON pr.oid=castfunc
    LEFT JOIN pg_namespace np ON np.oid=pr.pronamespace
    LEFT OUTER JOIN pg_description des ON (des.objoid=ca.oid AND des.objsubid=0 AND des.classoid='pg_cast'::regclass)

    {% if cid %}
        WHERE ca.oid={{cid}}::int
    {% endif %}

    {# Check for Show system object #}
    {% if (not showsysobj) and datlastsysoid %}
        {% if cid %}
            AND
        {% else %}
            WHERE
        {% endif %}
        ca.oid > {{datlastsysoid}}::OID
    {% endif %}
    ORDER BY st.typname, tt.typname
{% endif %}