-- FUNCTION: public.Trig1_$%{}[]()&*^!@"'`\/#()

-- DROP FUNCTION public."Trig1_$%{}[]()&*^!@""'`\/#"();

CREATE FUNCTION public."Trig1_$%{}[]()&*^!@""'`\/#"()
    RETURNS SETOF trigger
    LANGUAGE 'plpgsql'
    COST 1234
    VOLATILE LEAKPROOF STRICT SECURITY DEFINER WINDOW
    ROWS 4321
    SET application_name='appname'
    SET search_path=public, pg_temp
AS $BODY$
begin
select 1;
end;
$BODY$;

ALTER FUNCTION public."Trig1_$%{}[]()&*^!@""'`\/#"()
    OWNER TO enterprisedb;

COMMENT ON FUNCTION public."Trig1_$%{}[]()&*^!@""'`\/#"()
    IS 'some comment';
