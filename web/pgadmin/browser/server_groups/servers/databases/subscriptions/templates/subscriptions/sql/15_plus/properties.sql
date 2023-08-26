SELECT  sub.oid as oid,
        subname as name,
        subpublications as pub,
        subpublications as proppub,
        sub.subsynccommit as sync,
        pga.rolname as subowner,
        subslotname as slot_name,
        subenabled as enabled,
        subbinary as binary,
        substream as streaming,
        subtwophasestate as two_phase,
        subdisableonerr as disable_on_error,
		pg_catalog.SPLIT_PART(pg_catalog.SPLIT_PART(subconninfo,' port',1), '=',2) as host,
		pg_catalog.SPLIT_PART(pg_catalog.SPLIT_PART(subconninfo,'port=',2), ' ',1) as port,
		pg_catalog.SPLIT_PART(pg_catalog.SPLIT_PART(subconninfo,'user=',2), ' ',1) as username,
		pg_catalog.SPLIT_PART(pg_catalog.SPLIT_PART(subconninfo,'dbname=',2), ' ',1) as db,
		pg_catalog.SPLIT_PART(pg_catalog.SPLIT_PART(subconninfo,'connect_timeout=',2), ' ',1) as connect_timeout,
		pg_catalog.SPLIT_PART(pg_catalog.SPLIT_PART(subconninfo,'passfile=',2), ' ',1) as passfile,
		pg_catalog.SPLIT_PART(pg_catalog.SPLIT_PART(subconninfo,'sslmode=',2), ' ',1) as sslmode,
		pg_catalog.SPLIT_PART(pg_catalog.SPLIT_PART(subconninfo,'sslcompression=',2), ' ',1) as sslcompression,
		pg_catalog.SPLIT_PART(pg_catalog.SPLIT_PART(subconninfo,'sslcert=',2), ' ',1) as sslcert,
		pg_catalog.SPLIT_PART(pg_catalog.SPLIT_PART(subconninfo,'sslkey=',2), ' ',1) as sslkey,
		pg_catalog.SPLIT_PART(pg_catalog.SPLIT_PART(subconninfo,'sslrootcert=',2), ' ',1) as sslrootcert,
		pg_catalog.SPLIT_PART(pg_catalog.SPLIT_PART(subconninfo,'sslcrl=',2), ' ',1) as sslcrl
FROM pg_catalog.pg_subscription sub join pg_catalog.pg_roles pga on sub.subowner= pga.oid
WHERE
{% if subid %}
    sub.oid = {{ subid }};
{% else %}
    sub.subdbid = {{ did }};
{% endif %}
