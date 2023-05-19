from flask import session

import hvac, os

class VaultDynamicDBCredentials:

    def __init__(self, cmd):
        self.cmd = str(cmd)

    def get(self):
        client = hvac.Client(url=os.getenv('VAULT_ADDR','http://localhost:8200'))

        client.auth.jwt.jwt_login(
            role=self.cmd.split(' ')[0],
            jwt=session['oauth2_token']['id_token'],
            path='gitlab'
        )

        dynamic_creds = client.secrets.database.get_static_credentials(
                            name=self.cmd.split(' ')[1],
                            mount_point=self.cmd.split(' ')[2]
                        )

        return dynamic_creds["data"]["password"].strip()
