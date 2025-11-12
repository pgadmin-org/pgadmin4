

CREATE TABLE IF NOT EXISTS public.newtable1
(
    id integer,
    col1 character varying(50),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.newtable2
(
    table1_id integer,
    col2 character varying(50),
    PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS public.newtable3
(
)
;

ALTER TABLE IF EXISTS public.newtable2
    ADD FOREIGN KEY (table1_id)
    REFERENCES public.newtable1 (id)
    NOT VALID;
