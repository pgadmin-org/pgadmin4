-- FUNCTION: public.Function4_$%{}[]()&*^!@"'`\/#()

-- DROP FUNCTION IF EXISTS public."Function4_$%{}[]()&*^!@""'`\/#"();

CREATE OR REPLACE FUNCTION public."Function4_$%{}[]()&*^!@""'`\/#"(
	)
    RETURNS numeric
    LANGUAGE 'sql'
    COST 100
    VOLATILE LEAKPROOF STRICT SECURITY DEFINER WINDOW PARALLEL UNSAFE

BEGIN ATOMIC
 SELECT 1;
END;

ALTER FUNCTION public."Function4_$%{}[]()&*^!@""'`\/#"()
    OWNER TO postgres;
