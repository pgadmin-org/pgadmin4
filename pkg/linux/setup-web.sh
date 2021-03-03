#!/bin/bash

#
# Setup pgadmin4 in server mode
#

if [ "$EUID" -ne 0 ]
  then echo "This script must be run as root"
  exit 1
fi

if [[ "$#" -ne 0 ]] && ([[ "$#" -eq 1 ]] && [[ "$1" != "--yes" ]]); then
    echo "Usage: $0 [--yes]"
    exit 1
fi

IS_REDHAT=0
IS_DEBIAN=0
UNAME=$(uname -a)

# Get the distro from the environment
if [ "x${PGADMIN_PLATFORM_TYPE}" == "x" ]; then
    if [ -f /etc/redhat-release ]; then
        PLATFORM_TYPE=redhat
    elif [[ ${UNAME} =~ "Ubuntu" ]] || [[ ${UNAME} =~ "Debian" ]] || [ -f /etc/apt/sources.list ]; then
        PLATFORM_TYPE=debian
    else
        echo "Failed to detect the platform. This may mean you're running on a Linux distribution that isn't supported by pgAdmin."
        echo "Please set the PGADMIN_PLATFORM_TYPE environment variable to one of 'redhat' or 'debian' and try again."
        exit 1
    fi
else
    PLATFORM_TYPE=${PGADMIN_PLATFORM_TYPE}
fi

case ${PLATFORM_TYPE} in
    redhat)
        echo "Setting up pgAdmin 4 in web mode on a Redhat based platform..."
        IS_REDHAT=1
        APACHE=httpd
        ;;

    debian)
        echo "Setting up pgAdmin 4 in web mode on a Debian based platform..."
        IS_DEBIAN=1
        APACHE=apache2
        ;;

    *)
        echo "Invalid value for the PGADMIN_PLATFORM_TYPE environment variable. Please set it to one of 'redhat' or 'debian' and try again."
        exit 1
        ;;
esac

# Is this an automated install?
AUTOMATED=0
if [ "$#" -eq 1 ]; then
    AUTOMATED=1
    echo "Running in non-interactive mode..."
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
    setsebool -P httpd_can_network_connect 1 1> /dev/null
    setsebool -P httpd_can_network_connect_db 1 1> /dev/null
    semanage fcontext -a -t httpd_var_lib_t '/var/lib/pgadmin(/.*)?' 1> /dev/null
    restorecon -R -v /var/lib/pgadmin 1> /dev/null
    semanage fcontext -a -t httpd_log_t '/var/log/pgadmin(/.*)?' 1> /dev/null
    restorecon -R -v /var/log/pgadmin 1> /dev/null
fi

# Setup Apache on Debian/Ubuntu
if [ ${IS_DEBIAN} == 1 ]; then
    if [ ${AUTOMATED} == 1 ]; then
	      RESPONSE=Y
    else
        read -p "We can now configure the Apache Web server for you. This involves enabling the wsgi module and configuring the pgAdmin 4 application to mount at /pgadmin4. Do you wish to continue (y/n)? " RESPONSE
    fi

    case ${RESPONSE} in
        y|Y )
            a2enmod wsgi 1> /dev/null
            a2enconf pgadmin4 1> /dev/null
            ;;
        * )
            exit 1;;
    esac
fi

APACHE_STATUS=`ps cax | grep ${APACHE}`
if [ $? -eq 0 ]; then
    if [ ${AUTOMATED} == 1 ]; then
        RESPONSE=Y
    else
        read -p "The Apache web server is running and must be restarted for the pgAdmin 4 installation to complete. Continue (y/n)? " RESPONSE
    fi

    case ${RESPONSE} in
        y|Y )
	          systemctl restart ${APACHE}
            if [ $? != 0 ]; then
                echo "Error restarting ${APACHE}. Please check the systemd logs"
            else
                echo "Apache successfully restarted. You can now start using pgAdmin 4 in web mode at http://127.0.0.1/pgadmin4"
            fi;;
        * ) 
            exit 1;;
    esac
else
    if [ ${AUTOMATED} == 1 ]; then
        RESPONSE=Y
    else
        read -p "The Apache web server is not running. We can enable and start the web server for you to finish pgAdmin 4 installation. Continue (y/n)? " RESPONSE
    fi

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
                echo "Apache successfully started."
                echo "You can now start using pgAdmin 4 in web mode at http://127.0.0.1/pgadmin4"
            fi;;
        * ) 
            exit 1;;
    esac
fi

exit 0
