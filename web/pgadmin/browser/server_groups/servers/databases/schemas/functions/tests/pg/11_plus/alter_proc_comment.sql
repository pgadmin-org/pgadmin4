-- PROCEDURE: public.Proc1_$%{}[]()&*^!@"'`\/#(integer)

-- DROP PROCEDURE public."Proc1_$%{}[]()&*^!@""'`\/#"(integer);

CREATE OR REPLACE PROCEDURE public."Proc1_$%{}[]()&*^!@""'`\/#"(
	i1 integer)
LANGUAGE 'plpgsql'
AS $BODY$
begin
select 1;
end;
$BODY$;

COMMENT ON PROCEDURE public."Proc1_$%{}[]()&*^!@""'`\/#"(integer)
    IS 'some comment';
