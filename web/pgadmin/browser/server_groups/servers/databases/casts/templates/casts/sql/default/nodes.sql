    SELECT
        ca.oid,
        pg_catalog.concat(pg_catalog.format_type(st.oid,NULL),'->',pg_catalog.format_type(tt.oid,tt.typtypmod)) as name
    FROM pg_catalog.pg_cast ca
    JOIN pg_catalog.pg_type st ON st.oid=castsource
    JOIN pg_catalog.pg_namespace ns ON ns.oid=st.typnamespace
    JOIN pg_catalog.pg_type tt ON tt.oid=casttarget
    JOIN pg_catalog.pg_namespace nt ON nt.oid=tt.typnamespace
    LEFT JOIN pg_catalog.pg_proc pr ON pr.oid=castfunc
    LEFT JOIN pg_catalog.pg_namespace np ON np.oid=pr.pronamespace
    LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=ca.oid AND des.objsubid=0 AND des.classoid='pg_cast'::regclass)
    {% if cid %}
        WHERE ca.oid={{cid}}::oid
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
    {% if schema_diff %}
        AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
            WHERE objid = ca.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
    {% endif %}
    ORDER BY st.typname, tt.typname
