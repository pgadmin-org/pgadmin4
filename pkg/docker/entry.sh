#!/usr/bin/env bash

########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

export PGADMIN_SETUP_EMAIL=${PGADMIN_DEFAULT_EMAIL}
export PGADMIN_SETUP_PASSWORD=${PGADMIN_DEFAULT_PASSWORD}

if [ ${PGADMIN_ENABLE_TLS} != "True" ]; then
    if [ -f /etc/httpd/conf.d/ssl.conf ]; then
        mv /etc/httpd/conf.d/ssl.conf /etc/httpd/conf.d/ssl.conf.disabled
    fi
else
    if [ -f /etc/httpd/conf.d/ssl.conf.disabled ]; then
        mv /etc/httpd/conf.d/ssl.conf.disabled /etc/httpd/conf.d/ssl.conf
    fi
fi

j2 /templates/pgadmin4.conf.j2 > /etc/httpd/conf.d/pgadmin4.conf

rm -f /run/httpd/httpd.pid

/usr/sbin/httpd -D FOREGROUND
