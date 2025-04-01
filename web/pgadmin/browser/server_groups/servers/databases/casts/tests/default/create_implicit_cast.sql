-- Cast: money -> bigint

-- DROP CAST (money AS bigint);

CREATE CAST (money AS bigint)
	WITHOUT FUNCTION
	AS IMPLICIT;
