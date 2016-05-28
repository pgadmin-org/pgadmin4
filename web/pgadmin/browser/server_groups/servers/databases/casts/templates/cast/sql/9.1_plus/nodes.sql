    SELECT
        ca.oid,
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