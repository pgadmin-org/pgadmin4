##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################


def change_password(self):
    response = self.tester.get(
        '/browser/change_password', follow_redirects=True
    )
    self.assertIn('Password Change', response.data.decode('utf-8'))

    csrf_token = self.tester.fetch_csrf(response)

    response = self.tester.post(
        '/browser/change_password',
        data=dict(
            password=self.password,
            new_password=self.new_password,
            new_password_confirm=self.new_password_confirm,
            csrf_token=csrf_token,
        ),
        follow_redirects=True
    )
    self.assertIn(self.respdata, response.data.decode('utf-8'))
