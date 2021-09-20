from sqlalchemy.engine import Engine


def test_source_connection(source: Engine):
    (x,) = source.execute("select 1").fetchone()
    assert x == 1


def test_target_connection(target: Engine):
    (x,) = target.execute("select 1").fetchone()
    assert x == 1
