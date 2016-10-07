# ##########################################################################
#
# #pgAdmin 4 - PostgreSQL Tools
#
# #Copyright (C) 2013 - 2016, The pgAdmin Development Team
# #This software is released under the PostgreSQL Licence
#
# ##########################################################################


def change_password(self):
    response = self.tester.get('/change', follow_redirects=True)
    self.assertTrue('pgAdmin 4 Password Change' in response.data.decode(
        'utf-8'))

    response = self.tester.post('/change', data=dict(
        password=self.password,
        new_password=self.new_password,
        new_password_confirm=self.new_password_confirm),
                                follow_redirects=True)
    self.assertTrue(self.respdata in response.data.decode('utf-8'))
