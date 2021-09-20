from typing import Callable, List


def test_no_diff(compare: Callable[[], List]) -> None:
    result = compare()
    diff = [x for x in result if x["status"] != "Identical"]
    assert len(diff) == 0
