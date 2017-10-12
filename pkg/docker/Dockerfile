########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

# Get the basics out of the way
FROM centos:latest

LABEL name="pgAdmin 4" \
    vendor="The pgAdmin Development Team" \
    license="PostgreSQL"

# We only need the web/ directory, and a few other things
COPY web /var/www/pgadmin
COPY requirements.txt /var/www/pgadmin

# Install everything we need. Use easy_install to get pip, to avoid setting up EPEL
RUN yum install -y python-setuptools python-devel httpd mod_wsgi mod_ssl gcc
RUN easy_install pip
RUN pip install j2cli

# Now install the Python runtime dependencies
RUN pip install -r /var/www/pgadmin/requirements.txt

# Create required directories for config


# Create required directories for running
RUN mkdir -p /var/log/pgadmin
RUN chown -R apache /var/log/pgadmin
RUN mkdir -p /var/lib/pgadmin
RUN chown -R apache /var/lib/pgadmin
RUN mkdir -p /certs
RUN chown -R apache /certs
RUN chmod 700 /certs

# Apache config time
RUN mkdir -p /templates
COPY pgadmin4.conf.j2 /templates/
COPY entry.sh /

# Finally, remove packages we only needed for building
RUN yum -y remove gcc cpp glibc-devel glibc-headers kernel-headers libgomp libmpc mpfr

# Default config options
ENV PGADMIN_DEFAULT_EMAIL container@pgadmin.org
ENV PGADMIN_DEFAULT_PASSWORD Conta1ner
ENV PGADMIN_ENABLE_TLS False
ENV PGADMIN_SERVER_NAME pgadmin4

EXPOSE 80 443

# Start the service
ENTRYPOINT ["/bin/bash", "/entry.sh"]
