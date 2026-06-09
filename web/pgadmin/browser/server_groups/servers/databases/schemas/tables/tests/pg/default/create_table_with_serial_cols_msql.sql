CREATE TABLE public.table_with_serial_cols
(
    id_serial serial NOT NULL,
    id_bigserial bigserial NOT NULL,
    id_smallserial smallserial NOT NULL,
    payload text
);

ALTER TABLE IF EXISTS public.table_with_serial_cols
    OWNER to <OWNER>;

COMMENT ON TABLE public.table_with_serial_cols
    IS 'round-trip SERIAL columns (issue #9896)';
