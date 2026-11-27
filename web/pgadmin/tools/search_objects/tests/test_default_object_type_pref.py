##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################

import json

from pgadmin.tools.search_objects.utils import ALL_NODE_TYPES
from pgadmin.utils.route import BaseTestGenerator


class SearchObjectsDefaultObjectTypePrefTest(BaseTestGenerator):
    """
    The default object type preference offers All types plus every type
    the Search Objects dialog can search for, and defaults to All types.
    """
    scenarios = [
        ('Default object type preference',
         dict(url='/preferences/search_objects/default_object_type'))
    ]

    def runTest(self):
        response = self.tester.get(self.url)
        self.assertEqual(response.status_code, 200)

        pref = json.loads(response.data.decode('utf-8'))
        self.assertEqual(pref['type'], 'options')
        self.assertEqual(pref['value'], 'all')

        values = [opt['value'] for opt in pref['options']]
        self.assertEqual(values[0], 'all')
        self.assertIn('function', values)
        self.assertEqual(len(values), len(set(values)))
        self.assertTrue(set(values[1:]).issubset(ALL_NODE_TYPES))
        for opt in pref['options']:
            self.assertTrue(opt['label'],
                            '{0} has no label'.format(opt['value']))
