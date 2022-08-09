ALTER FOREIGN TABLE IF EXISTS public."FT1_$%{}[]()&*^!@""'`\/#"
    DROP CONSTRAINT cons1;

ALTER FOREIGN TABLE IF EXISTS public."FT1_$%{}[]()&*^!@""'`\/#"
    OPTIONS ( DROP schema_name);

REVOKE ALL ON TABLE public."FT1_$%{}[]()&*^!@""'`\/#" FROM PUBLIC;
