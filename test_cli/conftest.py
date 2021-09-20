# pylint: disable=redefined-outer-name,no-member
import json
import os
import subprocess
import time
from typing import Callable, Generator, List

import pytest
from sqlalchemy import create_engine
from sqlalchemy.engine import Engine

CONTAINER_NAME_SOURCE = "pgadmin4_db_source_1"
CONTAINER_NAME_TARGET = "pgadmin4_db_target_1"


@pytest.fixture(scope="session")
def dockerize_database():
    """Manage docker-compose.yaml test fixtures"""

    # Skip if we're using github actions CI
    if not "GITHUB_SHA" in os.environ:
        subprocess.call(["docker", "compose", "up", "-d"])
        # Wait for postgres to become healthy

        for container_name in [CONTAINER_NAME_SOURCE, CONTAINER_NAME_TARGET]:
            for _ in range(10):
                out = subprocess.check_output(["docker", "inspect", container_name])
                container_info = json.loads(out)
                container_health_status = container_info[0]["State"]["Health"]["Status"]
                if container_health_status == "healthy":
                    time.sleep(1)
                    break
                else:
                    time.sleep(1)
            else:
                raise Exception(f"Container {container_name} never became healthy")
        yield
        subprocess.call(["docker", "compose", "down", "-v"])
        return
    yield


@pytest.fixture(scope="session")
def source_conn() -> str:
    """A database connection string to the source database"""
    return "postgresql://postgres:postgres@localhost:5408/postgres"


@pytest.fixture(scope="session")
def target_conn() -> str:
    """A database connection string to the target database"""
    return "postgresql://postgres:postgres@localhost:5409/postgres"


@pytest.fixture(scope="function")
def source(dockerize_database: None, source_conn: str) -> Generator[Engine, None, None]:
    """A database connection to the source database"""
    eng: Engine = create_engine(source_conn)
    yield eng
    eng.execute("rollback;")
    eng.execute("drop schema public cascade;")
    eng.execute("create schema public;")
    eng.dispose()


@pytest.fixture(scope="function")
def target(dockerize_database: None, target_conn: str) -> Generator[Engine, None, None]:
    """A database connection to the target database"""
    eng: Engine = create_engine(target_conn)
    yield eng
    eng.execute("rollback;")
    eng.execute("drop schema public cascade;")
    eng.execute("create schema public;")
    eng.dispose()


@pytest.fixture(scope="session")
def compare(source_conn: str, target_conn: str) -> Callable[[], List]:
    """A callable to compare the schemas and return a json diff of each object"""

    def collect():
        out = subprocess.check_output(
            ["python", "web/cli.py", source_conn, target_conn, "--json-diff"]
        ).decode("utf-8")

        # The output is a json list but there may be some non-json log messages prepended to
        # the output. Strip these by finding the first "["
        _, _, json_out = out.partition("[")

        diff_info = json.loads("[" + json_out)
        return diff_info

    return collect
