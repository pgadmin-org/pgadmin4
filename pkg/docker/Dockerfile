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
FROM python:3.6-alpine3.7 as docs-builder

# Install only dependencies absolutely required for documentation building
RUN apk add --no-cache make
RUN pip install --no-cache-dir \
    sphinx flask_security flask_paranoid python-dateutil flask_sqlalchemy \
    flask_gravatar flask_migrate simplejson

COPY ./pgadmin4/ /pgadmin4

RUN LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 make -C /pgadmin4/docs/en_US -f Makefile.sphinx html

# Then install backend, copy static files and set up entrypoint
# Need alpine3.7 to get pg_dump and friends in postgresql-client package
FROM python:3.6-alpine3.7

RUN pip --no-cache-dir install gunicorn
RUN apk add --no-cache postfix postgresql-client postgresql-libs

WORKDIR /pgadmin4
ENV PYTHONPATH=/pgadmin4

# Install build-dependencies, build & install C extensions and purge deps in one RUN step
# so that deps do not increase the size of resulting image by remaining in layers
COPY ./pgadmin4/requirements.txt /pgadmin4
RUN set -ex && \
    apk add --no-cache --virtual build-deps build-base postgresql-dev libffi-dev linux-headers && \
    pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt && \
    apk del --no-cache build-deps

COPY --from=node-builder /pgadmin4/web/pgadmin/static/js/generated/ /pgadmin4/pgadmin/static/js/generated/
COPY --from=docs-builder /pgadmin4/docs/en_US/_build/html/ /pgadmin4/docs/

COPY ./pgadmin4/web /pgadmin4
COPY ./run_pgadmin.py /pgadmin4
COPY ./config_distro.py /pgadmin4

RUN pip install --no-cache-dir -r requirements.txt

# Precompile and optimize python code to save time and space on startup
RUN python -O -m compileall /pgadmin4

COPY ./entrypoint.sh /entrypoint.sh

VOLUME /var/lib/pgadmin
EXPOSE 80 443

ENTRYPOINT ["/entrypoint.sh"]
