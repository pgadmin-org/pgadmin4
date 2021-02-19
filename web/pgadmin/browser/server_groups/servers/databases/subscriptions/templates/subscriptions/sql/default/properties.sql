SELECT  sub.oid as oid,
        subname as name,
        subpublications as pub,
        sub.subsynccommit as sync,
        subpublications as cur_pub,
        pga.rolname as subowner,
        subslotname as slot_name,
        subenabled as enabled,
		SPLIT_PART(SPLIT_PART(subconninfo,' port',1), '=',2) as host,
		SPLIT_PART(SPLIT_PART(subconninfo,'port=',2), ' ',1) as port,
		SPLIT_PART(SPLIT_PART(subconninfo,'user=',2), ' ',1) as username,
		SPLIT_PART(SPLIT_PART(subconninfo,'dbname=',2), ' ',1) as db,
		SPLIT_PART(SPLIT_PART(subconninfo,'connect_timeout=',2), ' ',1) as connect_timeout,
		SPLIT_PART(SPLIT_PART(subconninfo,'passfile=',2), ' ',1) as passfile,
		SPLIT_PART(SPLIT_PART(subconninfo,'sslmode=',2), ' ',1) as sslmode,
		SPLIT_PART(SPLIT_PART(subconninfo,'sslcompression=',2), ' ',1) as sslcompression,
		SPLIT_PART(SPLIT_PART(subconninfo,'sslcert=',2), ' ',1) as sslcert,
		SPLIT_PART(SPLIT_PART(subconninfo,'sslkey=',2), ' ',1) as sslkey,
		SPLIT_PART(SPLIT_PART(subconninfo,'sslrootcert=',2), ' ',1) as sslrootcert,
		SPLIT_PART(SPLIT_PART(subconninfo,'sslcrl=',2), ' ',1) as sslcrl
FROM pg_subscription sub join pg_roles pga on sub.subowner= pga.oid
WHERE
{% if subid %}
    sub.oid = {{ subid }};
{% else %}
    sub.subdbid = {{ did }};
{% endif %}
