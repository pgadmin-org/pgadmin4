########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2025, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

SHELL = /bin/sh

APP_NAME := $(shell grep ^APP_NAME web/branding.py | awk -F"=" '{print $$NF}' | tr -d '[:space:]' | tr -d "'" | awk '{print tolower($$0)}')
APP_RELEASE := $(shell grep ^APP_RELEASE web/version.py | awk -F"=" '{print $$NF}' | tr -d '[:space:]')
APP_REVISION := $(shell grep ^APP_REVISION web/version.py | awk -F"=" '{print $$NF}' | tr -d '[:space:]')

#########################################################################
# High-level targets
#########################################################################

# Include only platform-independent builds in all
all: docs pip src

appbundle:
	./pkg/mac/build.sh

install-node:
	cd web && yarn install

install-python:
	./tools/setup-python-env.sh

install-python-testing:
	./tools/setup-python-env.sh --test

bundle:
	cd web && yarn run bundle

bundle-dev:
	cd web && yarn run bundle:dev

linter:
	cd web && yarn run linter

check: install-node bundle linter check-pep8
	cd web && yarn run test:js-once && python regression/runtests.py

check-audit:
	cd web && yarn run audit

check-auditjs:
# Commented the below line to avoid vulnerability in decompress package and
# audit only dependencies folder. Refer https://www.npmjs.com/advisories/1217.
# Pull request is already been send https://github.com/kevva/decompress/pull/73,
# once fixed we will uncomment it.
#	cd web && yarn run auditjs
	cd web && yarn run auditjs --groups dependencies

check-auditjs-html:
	cd web && yarn run auditjs-html

check-auditpy:
	cd web && yarn run auditpy

check-pep8:
	pycodestyle --config=.pycodestyle docs/
	pycodestyle --config=.pycodestyle pkg/
	pycodestyle --config=.pycodestyle web/
	pycodestyle --config=.pycodestyle tools/

check-python:
	cd web && python regression/runtests.py --exclude feature_tests

check-resql:
	cd web && python regression/runtests.py --pkg resql --exclude feature_tests

check-feature: install-node bundle
	cd web && python regression/runtests.py --pkg feature_tests

check-js: install-node linter
	cd web && yarn run test:js-once

check-js-coverage:
    cd web && yarn run test:js-coverage

# Include all clean sub-targets in clean
clean: clean-appbundle clean-debian clean-dist clean-docs clean-node clean-pip clean-redhat clean-src
	rm -rf web/pgadmin/static/js/generated/*
	rm -rf web/pgadmin/static/js/generated/.cache
	rm -rf web/pgadmin/static/css/generated/*
	rm -rf web/pgadmin/static/css/generated/.cache

clean-appbundle:
	rm -rf mac-build/

clean-debian:
	rm -rf debian-build/

clean-dist:
	rm -rf dist/

clean-docs:
	LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 $(MAKE) -C docs/en_US -f Makefile.sphinx clean

clean-node:
	rm -rf web/node-modules/

clean-pip:
	rm -rf pip-build/

clean-redhat:
	rm -rf redhat-build/

clean-src:
	rm -rf src-build/

debian:
	./pkg/debian/build.sh

docker:
	echo $(APP_NAME)
	git checkout HEAD
	docker build --pull -t ${APP_NAME} -t $(APP_NAME):latest -t $(APP_NAME):$(APP_RELEASE) -t $(APP_NAME):$(APP_RELEASE).$(APP_REVISION) .

docs:
	LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 $(MAKE) -C docs/en_US -f Makefile.sphinx html

docs-pdf:
	LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 $(MAKE) -C docs/en_US -f Makefile.sphinx latexpdf

docs-epub:
	LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 $(MAKE) -C docs/en_US -f Makefile.sphinx epub

messages: msg-extract msg-update msg-compile

msg-compile:
	cd web && pybabel compile --statistics -d pgadmin/translations

msg-extract:
	cd web && pybabel extract -F babel.cfg -o pgadmin/messages.pot pgadmin

msg-update:
	cd web && pybabel update --no-fuzzy-matching -i pgadmin/messages.pot -d pgadmin/translations

.PHONY: docs

pip: docs
	./pkg/pip/build.sh

redhat:
	./pkg/redhat/build.sh

src:
	./pkg/src/build.sh
