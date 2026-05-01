##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2026, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


def change_password(self):
    # Modern pgAdmin's change_password endpoint is JSON-only:
    # GET returns {"csrf_token": "..."}; POST expects a JSON body.
    import json as _json

    response = self.tester.get(
        '/browser/change_password', follow_redirects=True
    )
    self.assertEqual(response.status_code, 200)
    csrf_token = self.tester.fetch_csrf(response)
    self.assertIsNotNone(
        csrf_token,
        "Expected csrf_token in change_password GET JSON response")

    response = self.tester.post(
        '/browser/change_password',
        data=_json.dumps(dict(
            password=self.password,
            new_password=self.new_password,
            new_password_confirm=self.new_password_confirm,
            csrf_token=csrf_token,
        )),
        content_type='application/json',
        follow_redirects=True
    )
    self.assertIn(self.respdata, response.data.decode('utf-8'))
