########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

#########################################################################
# Create a Node container which will be used to build the JS components
# and clean up the web/ source code
#########################################################################

FROM node:8-alpine AS app-builder

RUN apk add --no-cache \
    autoconf \
    automake \
    bash \
    g++ \
    libc6-compat \
    libjpeg-turbo-dev \
    libpng-dev \
    make \
    nasm \
    git \
    zlib-dev

# Create the /pgadmin4 directory and copy the source into it. Explicitly
# remove the node_modules directory as we'll recreate a clean version, as well
# as various other files we don't want
COPY web /pgadmin4/web
RUN rm -rf /pgadmin4/web/*.log \
           /pgadmin4/web/config_*.py \
           /pgadmin4/web/node_modules \
           /pgadmin4/web/regression \
           `find /pgadmin4/web -type d -name tests` \
           `find /pgadmin4/web -type f -name .DS_Store`

WORKDIR /pgadmin4/web

# Build the JS vendor code in the app-builder, and then remove the vendor source.
RUN npm install && \
	npm audit fix && \
	rm -f yarn.lock && \
	yarn import && \
	yarn audit && \
	rm -f package-lock.json && \
    yarn run bundle && \
    rm -rf node_modules \
           yarn.lock \
           package.json \
           .[^.]* \
           babel.cfg \
           webpack.* \
           karma.conf.js \
           ./pgadmin/static/js/generated/.cache

#########################################################################
# Now, create a documentation build container for the Sphinx docs
#########################################################################

FROM python:3.7-alpine3.10 as docs-builder

# Install only dependencies absolutely required for documentation building
RUN apk add --no-cache \
        make \
        build-base \
        openssl-dev \
        libffi-dev && \
    pip install --no-cache-dir \
        sphinx \
        flask_security \
        flask_paranoid \
        python-dateutil \
        flask_sqlalchemy \
        flask_gravatar \
        flask_migrate \
        simplejson \
        cryptography

# Copy the docs from the local tree. Explicitly remove any existing builds that
# may be present
COPY docs /pgadmin4/docs
COPY web /pgadmin4/web
RUN rm -rf /pgadmin4/docs/en_US/_build

# Build the docs
RUN LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 make -C /pgadmin4/docs/en_US -f Makefile.sphinx html

#########################################################################
# Create additional builders to get all of the PostgreSQL utilities
#########################################################################

FROM postgres:9.4-alpine as pg94-builder
FROM postgres:9.5-alpine as pg95-builder
FROM postgres:9.6-alpine as pg96-builder
FROM postgres:10-alpine as pg10-builder
FROM postgres:11-alpine as pg11-builder
FROM postgres:12-alpine as pg12-builder

FROM alpine:3.10 as tool-builder

# Copy the PG binaries
COPY --from=pg94-builder /usr/local/bin/pg_dump /usr/local/pgsql/pgsql-9.4/
COPY --from=pg94-builder /usr/local/bin/pg_dumpall /usr/local/pgsql/pgsql-9.4/
COPY --from=pg94-builder /usr/local/bin/pg_restore /usr/local/pgsql/pgsql-9.4/
COPY --from=pg94-builder /usr/local/bin/psql /usr/local/pgsql/pgsql-9.4/

COPY --from=pg95-builder /usr/local/bin/pg_dump /usr/local/pgsql/pgsql-9.5/
COPY --from=pg95-builder /usr/local/bin/pg_dumpall /usr/local/pgsql/pgsql-9.5/
COPY --from=pg95-builder /usr/local/bin/pg_restore /usr/local/pgsql/pgsql-9.5/
COPY --from=pg95-builder /usr/local/bin/psql /usr/local/pgsql/pgsql-9.5/

COPY --from=pg96-builder /usr/local/bin/pg_dump /usr/local/pgsql/pgsql-9.6/
COPY --from=pg96-builder /usr/local/bin/pg_dumpall /usr/local/pgsql/pgsql-9.6/
COPY --from=pg96-builder /usr/local/bin/pg_restore /usr/local/pgsql/pgsql-9.6/
COPY --from=pg96-builder /usr/local/bin/psql /usr/local/pgsql/pgsql-9.6/

COPY --from=pg10-builder /usr/local/bin/pg_dump /usr/local/pgsql/pgsql-10/
COPY --from=pg10-builder /usr/local/bin/pg_dumpall /usr/local/pgsql/pgsql-10/
COPY --from=pg10-builder /usr/local/bin/pg_restore /usr/local/pgsql/pgsql-10/
COPY --from=pg10-builder /usr/local/bin/psql /usr/local/pgsql/pgsql-10/

COPY --from=pg11-builder /usr/local/bin/pg_dump /usr/local/pgsql/pgsql-11/
COPY --from=pg11-builder /usr/local/bin/pg_dumpall /usr/local/pgsql/pgsql-11/
COPY --from=pg11-builder /usr/local/bin/pg_restore /usr/local/pgsql/pgsql-11/
COPY --from=pg11-builder /usr/local/bin/psql /usr/local/pgsql/pgsql-11/

COPY --from=pg12-builder /usr/local/bin/pg_dump /usr/local/pgsql/pgsql-12/
COPY --from=pg12-builder /usr/local/bin/pg_dumpall /usr/local/pgsql/pgsql-12/
COPY --from=pg12-builder /usr/local/bin/pg_restore /usr/local/pgsql/pgsql-12/
COPY --from=pg12-builder /usr/local/bin/psql /usr/local/pgsql/pgsql-12/

#########################################################################
# Assemble everything into the final container.
#########################################################################

FROM python:3.7-alpine3.10

COPY --from=tool-builder /usr/local/pgsql /usr/local/

WORKDIR /pgadmin4
ENV PYTHONPATH=/pgadmin4

# Copy in the code and docs
COPY --from=app-builder /pgadmin4/web /pgadmin4
COPY --from=docs-builder /pgadmin4/docs/en_US/_build/html/ /pgadmin4/docs
COPY requirements.txt /pgadmin4/requirements.txt

# Install build-dependencies, build & install C extensions and purge deps in
# one RUN step
RUN apk add --no-cache --virtual \
        build-deps \
        build-base \
        postgresql-dev \
        libffi-dev \
        linux-headers && \
    apk add \
        postfix \
        postgresql-client \
        postgresql-libs \
        shadow \
        libcap && \
    pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir gunicorn==19.9.0 && \
    apk del --no-cache build-deps

# We need the v12 libpq, which is only in the 'edge' build of Alpine at present
COPY --from=pg12-builder /usr/local/lib/libpq.so.5.12 /usr/lib/
RUN ln -sf /usr/lib/libpq.so.5.12 /usr/lib/libpq.so.5

# Copy the runner script
COPY pkg/docker/run_pgadmin.py /pgadmin4
COPY pkg/docker/entrypoint.sh /entrypoint.sh

# Precompile and optimize python code to save time and space on startup
RUN python -O -m compileall -x node_modules /pgadmin4

RUN groupadd -g 5050 pgadmin && \
    useradd -r -u 5050 -g pgadmin pgadmin && \
    mkdir -p /var/lib/pgadmin && \
    chown pgadmin:pgadmin /var/lib/pgadmin && \
    mkdir -p /var/log/pgadmin && \
    chown pgadmin:pgadmin /var/log/pgadmin && \
    touch /pgadmin4/config_distro.py && \
    chown pgadmin:pgadmin /pgadmin4/config_distro.py && \
    setcap CAP_NET_BIND_SERVICE=+eip /usr/local/bin/python3.7
USER pgadmin

# Finish up
VOLUME /var/lib/pgadmin
EXPOSE 80 443

ENTRYPOINT ["/entrypoint.sh"]
