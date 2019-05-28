########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

# First of all, build frontend with NodeJS in a separate builder container
# Node-8 is supported by all needed C++ packages
FROM node:8 AS node-builder

COPY ./pgadmin4/web/ /pgadmin4/web/
WORKDIR /pgadmin4/web

RUN yarn install --cache-folder ./ycache --verbose && \
    yarn run bundle && \
    rm -rf ./ycache ./pgadmin/static/js/generated/.cache

# Build Sphinx documentation in separate container
FROM python:3.7-alpine3.9 as docs-builder

# Install only dependencies absolutely required for documentation building
RUN apk add --no-cache make build-base libffi-dev && \
    pip install --no-cache-dir sphinx flask_security flask_paranoid python-dateutil flask_sqlalchemy flask_gravatar flask_migrate simplejson cryptography

COPY ./pgadmin4/ /pgadmin4

# Build the docs
RUN LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 make -C /pgadmin4/docs/en_US -f Makefile.sphinx html

# Get the PG binaries
FROM postgres:9.4-alpine as pg94-builder
FROM postgres:9.5-alpine as pg95-builder
FROM postgres:9.6-alpine as pg96-builder
FROM postgres:10-alpine as pg10-builder
FROM postgres:11-alpine as pg11-builder

# Then install backend, copy static files and set up entrypoint
FROM python:3.7-alpine3.9

# Copy the PG binaries
COPY --from=pg94-builder /usr/local/bin/pg_dump /usr/local/pgsql-9.4/
COPY --from=pg94-builder /usr/local/bin/pg_dumpall /usr/local/pgsql-9.4/
COPY --from=pg94-builder /usr/local/bin/pg_restore /usr/local/pgsql-9.4/
COPY --from=pg94-builder /usr/local/bin/psql /usr/local/pgsql-9.4/

COPY --from=pg95-builder /usr/local/bin/pg_dump /usr/local/pgsql-9.5/
COPY --from=pg95-builder /usr/local/bin/pg_dumpall /usr/local/pgsql-9.5/
COPY --from=pg95-builder /usr/local/bin/pg_restore /usr/local/pgsql-9.5/
COPY --from=pg95-builder /usr/local/bin/psql /usr/local/pgsql-9.5/

COPY --from=pg96-builder /usr/local/bin/pg_dump /usr/local/pgsql-9.6/
COPY --from=pg96-builder /usr/local/bin/pg_dumpall /usr/local/pgsql-9.6/
COPY --from=pg96-builder /usr/local/bin/pg_restore /usr/local/pgsql-9.6/
COPY --from=pg96-builder /usr/local/bin/psql /usr/local/pgsql-9.6/

COPY --from=pg10-builder /usr/local/bin/pg_dump /usr/local/pgsql-10/
COPY --from=pg10-builder /usr/local/bin/pg_dumpall /usr/local/pgsql-10/
COPY --from=pg10-builder /usr/local/bin/pg_restore /usr/local/pgsql-10/
COPY --from=pg10-builder /usr/local/bin/psql /usr/local/pgsql-10/

COPY --from=pg11-builder /usr/local/bin/pg_dump /usr/local/pgsql-11/
COPY --from=pg11-builder /usr/local/bin/pg_dumpall /usr/local/pgsql-11/
COPY --from=pg11-builder /usr/local/bin/pg_restore /usr/local/pgsql-11/
COPY --from=pg11-builder /usr/local/bin/psql /usr/local/pgsql-11/

WORKDIR /pgadmin4
ENV PYTHONPATH=/pgadmin4

#Copy in the docs and JS/CSS bundles
COPY --from=node-builder /pgadmin4/web/pgadmin/static/js/generated/ /pgadmin4/pgadmin/static/js/generated/
COPY --from=docs-builder /pgadmin4/docs/en_US/_build/html/ /pgadmin4/docs/

# Install build-dependencies, build & install C extensions and purge deps in one RUN step
# so that deps do not increase the size of resulting image by remaining in layers
COPY ./pgadmin4/requirements.txt /pgadmin4
RUN apk add --no-cache --virtual build-deps build-base postgresql-dev libffi-dev linux-headers && \
    apk add postfix postgresql-client postgresql-libs && \
    pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn && \
    apk del --no-cache build-deps

# Copy the code
COPY ./pgadmin4/web /pgadmin4
COPY ./run_pgadmin.py /pgadmin4
COPY ./config_distro.py /pgadmin4
COPY ./entrypoint.sh /entrypoint.sh

# Precompile and optimize python code to save time and space on startup
RUN python -O -m compileall /pgadmin4

# Finish up
VOLUME /var/lib/pgadmin
EXPOSE 80 443

ENTRYPOINT ["/entrypoint.sh"]
