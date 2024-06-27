SELECT CASE WHEN datlocprovider = 'i' THEN
	(SELECT datlocale as cname FROM pg_database WHERE datname = current_database())
ELSE
    (SELECT datcollate as cname FROM pg_database WHERE datname = current_database()
    UNION
    SELECT datctype as cname FROM pg_database WHERE datname = current_database())
END
FROM pg_database WHERE datname = current_database();
