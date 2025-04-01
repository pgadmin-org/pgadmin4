########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

#########################################################################
# Create a Node container which will be used to build the JS components
# and clean up the web/ source code
#########################################################################

FROM alpine:latest AS app-builder

RUN apk add --no-cache \
    autoconf \
    automake \
    bash \
    g++ \
    git \
    libc6-compat \
    libjpeg-turbo-dev \
    libpng-dev \
    libtool \
    make \
    nasm \
    nodejs \
    npm \
    yarn \
    zlib-dev

COPY .git .git
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
RUN export CPPFLAGS="-DPNG_ARM_NEON_OPT=0" && \
    npm install -g corepack && \
    corepack enable && \
    yarn set version berry && \
    yarn set version 3 && \
    yarn install && \
    yarn run bundle && \
    rm -rf node_modules \
           yarn.lock \
           package.json \
           .[^.]* \
           babel.cfg \
           webpack.* \
           jest.config.js \
           babel.* \
           ./pgadmin/static/js/generated/.cache \
           /pgadmin4/.git

#########################################################################
# Next, create the base environment for Python
#########################################################################

FROM alpine:latest AS env-builder

# Install dependencies
COPY requirements.txt /
RUN apk add --no-cache \
        make \
        python3 \
        py3-pip && \
    apk add --no-cache --virtual build-deps \
        build-base \
        openssl-dev \
        libffi-dev \
        postgresql-dev \
        krb5-dev \
        rust \
        cargo \
        zlib-dev \
        libjpeg-turbo-dev \
        libpng-dev \
        python3-dev && \
    python3 -m venv --system-site-packages --without-pip /venv && \
    /venv/bin/python3 -m pip install --no-cache-dir -r requirements.txt && \
    apk del --no-cache build-deps

#########################################################################
# Now, create a documentation build container for the Sphinx docs
#########################################################################

FROM env-builder AS docs-builder

# Install Sphinx
RUN /venv/bin/python3 -m pip install --no-cache-dir sphinx
RUN /venv/bin/python3 -m pip install --no-cache-dir sphinxcontrib-youtube

# Copy the docs from the local tree. Explicitly remove any existing builds that
# may be present
COPY docs /pgadmin4/docs
COPY web /pgadmin4/web
RUN rm -rf /pgadmin4/docs/en_US/_build

# Build the docs
RUN LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 /venv/bin/sphinx-build /pgadmin4/docs/en_US /pgadmin4/docs/en_US/_build/html

# Cleanup unwanted files
RUN rm -rf /pgadmin4/docs/en_US/_build/html/.doctrees
RUN rm -rf /pgadmin4/docs/en_US/_build/html/_sources
RUN rm -rf /pgadmin4/docs/en_US/_build/html/_static/*.png

#########################################################################
# Create additional builders to get all of the PostgreSQL utilities
#########################################################################

FROM postgres:12-alpine AS pg12-builder
FROM postgres:13-alpine AS pg13-builder
FROM postgres:14-alpine AS pg14-builder
FROM postgres:15-alpine AS pg15-builder
FROM postgres:16-alpine AS pg16-builder
FROM postgres:17-alpine AS pg17-builder

FROM alpine:latest AS tool-builder

# Copy the PG binaries
COPY --from=pg12-builder /usr/local/bin/pg_dump /usr/local/pgsql/pgsql-12/
COPY --from=pg12-builder /usr/local/bin/pg_dumpall /usr/local/pgsql/pgsql-12/
COPY --from=pg12-builder /usr/local/bin/pg_restore /usr/local/pgsql/pgsql-12/
COPY --from=pg12-builder /usr/local/bin/psql /usr/local/pgsql/pgsql-12/

COPY --from=pg13-builder /usr/local/bin/pg_dump /usr/local/pgsql/pgsql-13/
COPY --from=pg13-builder /usr/local/bin/pg_dumpall /usr/local/pgsql/pgsql-13/
COPY --from=pg13-builder /usr/local/bin/pg_restore /usr/local/pgsql/pgsql-13/
COPY --from=pg13-builder /usr/local/bin/psql /usr/local/pgsql/pgsql-13/

COPY --from=pg14-builder /usr/local/bin/pg_dump /usr/local/pgsql/pgsql-14/
COPY --from=pg14-builder /usr/local/bin/pg_dumpall /usr/local/pgsql/pgsql-14/
COPY --from=pg14-builder /usr/local/bin/pg_restore /usr/local/pgsql/pgsql-14/
COPY --from=pg14-builder /usr/local/bin/psql /usr/local/pgsql/pgsql-14/

COPY --from=pg15-builder /usr/local/bin/pg_dump /usr/local/pgsql/pgsql-15/
COPY --from=pg15-builder /usr/local/bin/pg_dumpall /usr/local/pgsql/pgsql-15/
COPY --from=pg15-builder /usr/local/bin/pg_restore /usr/local/pgsql/pgsql-15/
COPY --from=pg15-builder /usr/local/bin/psql /usr/local/pgsql/pgsql-15/

COPY --from=pg16-builder /usr/local/bin/pg_dump /usr/local/pgsql/pgsql-16/
COPY --from=pg16-builder /usr/local/bin/pg_dumpall /usr/local/pgsql/pgsql-16/
COPY --from=pg16-builder /usr/local/bin/pg_restore /usr/local/pgsql/pgsql-16/
COPY --from=pg16-builder /usr/local/bin/psql /usr/local/pgsql/pgsql-16/

COPY --from=pg17-builder /usr/local/bin/pg_dump /usr/local/pgsql/pgsql-17/
COPY --from=pg17-builder /usr/local/bin/pg_dumpall /usr/local/pgsql/pgsql-17/
COPY --from=pg17-builder /usr/local/bin/pg_restore /usr/local/pgsql/pgsql-17/
COPY --from=pg17-builder /usr/local/bin/psql /usr/local/pgsql/pgsql-17/

#########################################################################
# Assemble everything into the final container.
#########################################################################

FROM alpine:latest

# Copy in the Python packages
COPY --from=env-builder /venv /venv

# Copy in the tools
COPY --from=tool-builder /usr/local/pgsql /usr/local/
COPY --from=pg17-builder /usr/local/lib/libpq.so.5.17 /usr/lib/
COPY --from=pg17-builder /usr/lib/libzstd.so.1.5.6 /usr/lib/
COPY --from=pg17-builder /usr/lib/liblz4.so.1.10.0 /usr/lib/

RUN ln -s libpq.so.5.17 /usr/lib/libpq.so.5 && \
    ln -s libpq.so.5.17 /usr/lib/libpq.so && \
    ln -s libzstd.so.1.5.6 /usr/lib/libzstd.so.1 && \
    ln -s liblz4.so.1.10.0 /usr/lib/liblz4.so.1

WORKDIR /pgadmin4
ENV PYTHONPATH=/pgadmin4

# Copy in the code and docs
COPY --from=app-builder /pgadmin4/web /pgadmin4
COPY --from=docs-builder /pgadmin4/docs/en_US/_build/html/ /pgadmin4/docs
COPY pkg/docker/run_pgadmin.py /pgadmin4
COPY pkg/docker/gunicorn_config.py /pgadmin4
COPY pkg/docker/entrypoint.sh /entrypoint.sh

# License files
COPY LICENSE /pgadmin4/LICENSE
COPY DEPENDENCIES /pgadmin4/DEPENDENCIES

# Install runtime dependencies and configure everything in one RUN step
RUN apk add --no-cache \
        python3 \
        bash \
        py3-pip \
        postfix \
        krb5-libs \
        libjpeg-turbo \
        shadow \
        sudo \
        tzdata \
        libedit \
        libldap \
        libcap && \
    /venv/bin/python3 -m pip install --no-cache-dir gunicorn==22.0.0 && \
    find / -type d -name '__pycache__' -exec rm -rf {} + && \
    useradd -r -u 5050 -g root -s /sbin/nologin pgadmin && \
    mkdir -p /run/pgadmin /var/lib/pgadmin && \
    chown pgadmin:root /run/pgadmin /var/lib/pgadmin && \
    chmod g=u /var/lib/pgadmin && \
    touch /pgadmin4/config_distro.py && \
    chown pgadmin:root /pgadmin4/config_distro.py && \
    chmod g=u /pgadmin4/config_distro.py && \
    chmod g=u /etc/passwd && \
    setcap CAP_NET_BIND_SERVICE=+eip /usr/bin/python3.12 && \
    echo "pgadmin ALL = NOPASSWD: /usr/sbin/postfix start" > /etc/sudoers.d/postfix && \
    echo "pgadminr ALL = NOPASSWD: /usr/sbin/postfix start" >> /etc/sudoers.d/postfix

USER pgadmin

# Finish up
VOLUME /var/lib/pgadmin
EXPOSE 80 443

ENTRYPOINT ["/entrypoint.sh"]
