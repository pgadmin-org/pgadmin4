

CREATE TABLE public.newtable1
(
    id integer,
    col1 character varying(50),
    PRIMARY KEY (id)
)
WITH (
    OIDS = FALSE
);

CREATE TABLE public.newtable2
(
    table1_id integer,
    col2 character varying(50),
    PRIMARY KEY (id)
)
WITH (
    OIDS = FALSE
);

CREATE TABLE public.newtable3
(
)

WITH (
    OIDS = FALSE
);

ALTER TABLE public.newtable2
    ADD FOREIGN KEY (table1_id)
    REFERENCES public.newtable1 (id)
    NOT VALID;
