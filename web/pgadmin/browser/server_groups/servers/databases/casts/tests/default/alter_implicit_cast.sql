-- Cast: money -> bigint

-- DROP CAST (money AS bigint);

CREATE CAST (money AS bigint)
	WITHOUT FUNCTION
	AS IMPLICIT;

COMMENT ON CAST (money AS bigint) IS 'Cast from money to bigint';
