-- FUNCTION: public.Function3_$%{}[]()&*^!@"'`\/#(character varying)

-- DROP FUNCTION IF EXISTS public."Function3_$%{}[]()&*^!@""'`\/#"(character varying);

CREATE OR REPLACE FUNCTION public."Function3_$%{}[]()&*^!@""'`\/#"(
	param character varying DEFAULT '1'::character varying)
    RETURNS TABLE(val character varying) 
    LANGUAGE 'plpgsql'
    COST 100
    VOLATILE LEAKPROOF STRICT SECURITY DEFINER WINDOW PARALLEL UNSAFE
    ROWS 1000

AS $BODY$
begin
  return query select '1'::character varying;
end
$BODY$;

ALTER FUNCTION public."Function3_$%{}[]()&*^!@""'`\/#"(character varying)
    OWNER TO enterprisedb;

