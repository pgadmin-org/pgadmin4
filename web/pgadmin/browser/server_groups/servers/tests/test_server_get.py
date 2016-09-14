# ##########################################################################
#
# #pgAdmin 4 - PostgreSQL Tools
#
# #Copyright (C) 2013 - 2016, The pgAdmin Development Team
# #This software is released under the PostgreSQL Licence
#
# ##########################################################################

from pgadmin.utils.route import BaseTestGenerator
from regression import test_utils as utils
from regression import test_server_dict


class ServersGetTestCase(BaseTestGenerator):
    """
    This class will fetch added servers under default server group
    by response code.
    """

    scenarios = [
        # Fetch the default url for server node
        ('Default Server Node url', dict(url='/browser/server/obj/'))
    ]

    def runTest(self):
        """ This function will fetch the added servers to object browser. """
        server_id = test_server_dict["server"][0]["server_id"]
        if not server_id:
            raise Exception("Server not found to test GET API")
        response = self.tester.get(self.url + str(utils.SERVER_GROUP) + '/' +
                                   str(server_id),
                                   follow_redirects=True)
        self.assertEquals(response.status_code, 200)

