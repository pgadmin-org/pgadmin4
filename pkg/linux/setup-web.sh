#!/bin/bash

#
# Setup pgadmin4 in server mode
#

if [ "$EUID" -ne 0 ]
  then echo "This script must be run as root"
  exit 1
fi

# Get the distro
IS_REDHAT=0
IS_DEBIAN=0
UNAME=$(uname -a)

if [ -f /etc/redhat-release ]; then
    IS_REDHAT=1
    APACHE=httpd
    echo "Setting up pgAdmin 4 in web mode on a Redhat platform..."
elif [[ ${UNAME} =~ "Ubuntu" ]] || [[ ${UNAME} =~ "debian" ]]; then
    IS_DEBIAN=1
    APACHE=apache2
    echo "Setting up pgAdmin 4 in web mode on a Debian platform..."
fi

# Run setup script first:
echo "Creating configuration database..."
/usr/pgadmin4/venv/bin/python3 /usr/pgadmin4/web/setup.py 

if [ $? != 0 ]
then
	echo "Error setting up server mode. Please examine the output above."
	exit 1
fi

# Create and own directories:
echo "Creating storage and log directories..."
mkdir -p /var/log/pgadmin /var/lib/pgadmin

if [ ${IS_REDHAT} == 1 ]; then
    chown apache: /var/log/pgadmin /var/lib/pgadmin -R
else
    chown www-data: /var/log/pgadmin /var/lib/pgadmin -R
fi

# Set SELinux up:
if [ ${IS_REDHAT} == 1 ]; then
    echo "Configuring SELinux..."
    setsebool -P httpd_can_network_connect 1
    setsebool -P httpd_can_network_connect_db 1
    semanage fcontext -a -t httpd_var_lib_t '/var/lib/pgadmin(/.*)?'
    restorecon -R -v /var/lib/pgadmin
    semanage fcontext -a -t httpd_log_t '/var/log/pgadmin(/.*)?'
    restorecon -R -v /var/log/pgadmin
fi

# Setup Apache
read -p "We can now configure the Apache Web server for you. This involves enabling the wsgi module and configuring the pgAdmin 4 application to mount at /pgadmin4. Do you wish to continue (y/n)? " RESPONSE
case ${RESPONSE} in
    y|Y )
        if [ ${IS_REDHAT} == 1 ]; then
	    # TODO
            true
        else
            a2enmod wsgi 1> /dev/null
            a2enconf pgadmin4 1> /dev/null
        fi;;
    * ) 
        exit 1;;
esac

APACHE_STATUS=`ps cax | grep ${APACHE}`
if [ $? -eq 0 ]; then
    read -p "The Apache web server is running. A restart is required for the pgAdmin 4 installation to complete. Would you like to continue (y/n)? " RESPONSE
    case ${RESPONSE} in
        y|Y )
	    systemctl restart ${APACHE}
            if [ $? != 0 ]; then
                echo "Error restarting ${APACHE}. Please check the systemd logs"
            else
                echo "Apache successfully restarted. You can now start using pgAdmin 4 in web mode"
            fi;;
        * ) 
            exit 1;;
    esac
else
    read -p "The Apache web server is not running. We can enable and start the web server for you to finish pgAdmin 4 installation. Would you like to continue (y/n)? " RESPONSE
    case ${RESPONSE} in
        y|Y )
            systemctl enable ${APACHE}
            if [ $? != 0 ]; then
                echo "Error enabling ${APACHE}. Please check the systemd logs"
            else
                echo "Apache successfully enabled."
            fi

            systemctl start ${APACHE}
            if [ $? != 0 ]; then
                echo "Error starting ${APACHE}. Please check the systemd logs"
            else
                echo "Apache successfully started. You can now start using pgAdmin 4 in web mode"
            fi;;
        * ) 
            exit 1;;
    esac
fi

exit 0
