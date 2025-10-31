-- PROCEDURE: public.Proc1_$%{}[]()&*^!@"'`\/#(integer)

-- DROP PROCEDURE IF EXISTS public."Proc1_$%{}[]()&*^!@""'`\/#"(integer);

CREATE OR REPLACE PROCEDURE public."Proc1_$%{}[]()&*^!@""'`\/#"(
	IN i1 integer)
LANGUAGE 'plpgsql'
AS $BODY$
begin
select 1;
end;
$BODY$;
ALTER PROCEDURE public."Proc1_$%{}[]()&*^!@""'`\/#"(integer)
    OWNER TO postgres;

ALTER PROCEDURE public."Proc1_$%{}[]()&*^!@""'`\/#"(integer)
    DEPENDS ON EXTENSION plpgsql;

ALTER PROCEDURE public."Proc1_$%{}[]()&*^!@""'`\/#"(integer)
    DEPENDS ON EXTENSION postgres_fdw;