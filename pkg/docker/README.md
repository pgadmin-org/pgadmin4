# pgAdmin Docker Container Builds

This directory contains the files required to create a docker container running
pgAdmin.

## Building

From the top level directory of the pgAdmin source tree, simply run:

    docker build .

You can also run *make docker*, which will call *docker build .* but also tag
the image like:

    pgadmin4 pgadmin4:latest pgadmin4:4 pgadmin4:4.12

### WARNING 

The build should be run in a CLEAN source tree. Whilst some potentially
dangerous files such as config_local.py or log files will be explicitly
excluded from the final image, other files will not be.

## Running

See the documentation at *docs/en_US/container_deployment.rst* for information on
running the container.
