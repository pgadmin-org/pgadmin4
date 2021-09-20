from typing import Callable, List

from sqlalchemy.engine import Engine


def test_add_table(source: Engine, compare: Callable[[], List]):
    source.execute(
        """
create table book(
    id serial primary key,
    title text
);
    """
    )

    result = compare()
    diff = [x for x in result if x["status"] != "Identical"]

    expected_diffs = [
        {
            "id": 3,
            "type": "sequence",
            "label": "Sequences",
            "title": "book_id_seq",
            "oid": 16384,
            "status": "Source Only",
            "source_ddl": "CREATE SEQUENCE IF NOT EXISTS public.book_id_seq\n    INCREMENT 1\n    START 1\n    MINVALUE 1\n    MAXVALUE 2147483647\n    CACHE 1\n    OWNED BY book.id;\n\nALTER SEQUENCE public.book_id_seq\n    OWNER TO postgres;",
            "target_ddl": "",
            "diff_ddl": "CREATE SEQUENCE IF NOT EXISTS public.book_id_seq\n    INCREMENT 1\n    START 1\n    MINVALUE 1\n    MAXVALUE 2147483647\n    CACHE 1\n    OWNED BY book.id;\n\nALTER SEQUENCE public.book_id_seq\n    OWNER TO postgres;",
            "group_name": "public",
            "dependencies": [
                {"type": "column", "name": "public.book.id", "oid": 16386}
            ],
            "source_schema_name": None,
        },
        {
            "id": 4,
            "type": "table",
            "label": "Tables",
            "title": "book",
            "oid": 16386,
            "status": "Source Only",
            "source_ddl": "CREATE TABLE IF NOT EXISTS public.book\n(\n    id integer NOT NULL DEFAULT nextval('book_id_seq'::regclass),\n    title text COLLATE pg_catalog.\"default\",\n    CONSTRAINT book_pkey PRIMARY KEY (id)\n)\n\nTABLESPACE pg_default;\n\nALTER TABLE IF EXISTS public.book\n    OWNER to postgres;",
            "target_ddl": "",
            "diff_ddl": "CREATE TABLE IF NOT EXISTS public.book\n(\n    id integer NOT NULL DEFAULT nextval('book_id_seq'::regclass),\n    title text COLLATE pg_catalog.\"default\",\n    CONSTRAINT book_pkey PRIMARY KEY (id)\n)\n\nTABLESPACE pg_default;\n\nALTER TABLE IF EXISTS public.book\n    OWNER to postgres;",
            "group_name": "public",
            "dependencies": [],
            "source_schema_name": None,
        },
    ]

    for expected_diff in expected_diffs:
        assert expected_diff in diff
