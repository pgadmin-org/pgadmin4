##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
import copy

from pgadmin.utils import validate_json_data
from pgadmin.utils.route import BaseTestGenerator


BASE_SERVER = {
    "Group": "Servers",
    "Name": "Test server",
    "Host": "127.0.0.1",
    "Port": 5432,
    "MaintenanceDB": "postgres"
}


def server(**kwargs):
    """Return a server definition with the given attributes merged in."""
    obj = copy.deepcopy(BASE_SERVER)
    obj.update(kwargs)
    return obj


class TestValidateJsonData(BaseTestGenerator):
    """Validate the servers.json import validation, in particular the
    username requirements for shared and non-shared servers."""

    scenarios = [
        ('A non-shared server with a username is valid',
         dict(
             servers={"1": server(Username="postgres")},
             is_admin=True,
             expected_error=None,
             expected_servers=["1"]
         )),
        ('A non-shared server without a username is rejected',
         dict(
             servers={"1": server()},
             is_admin=True,
             expected_error="'Username' attribute not found",
             expected_servers=["1"]
         )),
        ('A non-shared server with an empty username is rejected',
         dict(
             servers={"1": server(Username="")},
             is_admin=True,
             expected_error="'Username' attribute not found",
             expected_servers=["1"]
         )),
        ('A non-shared server with a null username is rejected',
         dict(
             servers={"1": server(Username=None)},
             is_admin=True,
             expected_error="'Username' attribute not found",
             expected_servers=["1"]
         )),
        ('A shared server with only a shared username is valid',
         dict(
             servers={"1": server(Shared=True, SharedUsername="postgres")},
             is_admin=True,
             expected_error=None,
             expected_servers=["1"]
         )),
        ('A shared server with only a username is valid',
         dict(
             servers={"1": server(Shared=True, Username="postgres")},
             is_admin=True,
             expected_error=None,
             expected_servers=["1"]
         )),
        ('A shared server with neither username is rejected',
         dict(
             servers={"1": server(Shared=True)},
             is_admin=True,
             expected_error="'Username' or 'SharedUsername' attribute not "
                            "found",
             expected_servers=["1"]
         )),
        ('A shared server with an empty shared username is rejected',
         dict(
             servers={"1": server(Shared=True, SharedUsername="")},
             is_admin=True,
             expected_error="'Username' or 'SharedUsername' attribute not "
                            "found",
             expected_servers=["1"]
         )),
        ('A shared server with a null shared username is rejected',
         dict(
             servers={"1": server(Shared=True, SharedUsername=None)},
             is_admin=True,
             expected_error="'Username' or 'SharedUsername' attribute not "
                            "found",
             expected_servers=["1"]
         )),
        ('A shared server with an empty username is accepted when a shared '
         'username is present',
         dict(
             servers={"1": server(Shared=True, Username="",
                                  SharedUsername="postgres")},
             is_admin=True,
             expected_error=None,
             expected_servers=["1"]
         )),
        ('A server using a service does not require any username',
         dict(
             servers={"1": {"Group": "Servers", "Name": "Test server",
                            "Service": "pgsql", "MaintenanceDB": "postgres"}},
             is_admin=True,
             expected_error=None,
             expected_servers=["1"]
         )),
        ('A non-integer port is rejected',
         dict(
             servers={"1": server(Username="postgres", Port="5432")},
             is_admin=True,
             expected_error="Port must be integer",
             expected_servers=["1"]
         )),
        ('Shared servers are skipped, not rejected, for a non-admin user',
         dict(
             servers={"1": server(Shared=True, SharedUsername="postgres"),
                      "2": server(Username="postgres")},
             is_admin=False,
             expected_error=None,
             expected_servers=["2"]
         )),
    ]

    def runTest(self):
        data = {"Servers": copy.deepcopy(self.servers)}
        errmsg = validate_json_data(data, self.is_admin)

        if self.expected_error is None:
            self.assertIsNone(errmsg)
        else:
            self.assertIsNotNone(
                errmsg, "Expected the data to be rejected, but it was not")
            self.assertIn(self.expected_error, errmsg)

        self.assertEqual(sorted(data["Servers"].keys()),
                         sorted(self.expected_servers))
