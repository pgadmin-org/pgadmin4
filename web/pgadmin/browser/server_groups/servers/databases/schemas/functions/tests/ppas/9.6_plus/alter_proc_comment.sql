-- PROCEDURE: public.Proc1_$%{}[]()&*^!@"'`\/#(integer)

-- DROP PROCEDURE IF EXISTS public."Proc1_$%{}[]()&*^!@""'`\/#"(integer);

CREATE OR REPLACE PROCEDURE public."Proc1_$%{}[]()&*^!@""'`\/#"(
	i1 integer)
    VOLATILE SECURITY DEFINER PARALLEL UNSAFE
    COST 100
AS  begin
select 1;
end;

ALTER PROCEDURE public."Proc1_$%{}[]()&*^!@""'`\/#"
    OWNER TO enterprisedb;

COMMENT ON PROCEDURE public."Proc1_$%{}[]()&*^!@""'`\/#"
    IS 'some comment';
