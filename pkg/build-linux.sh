#!/usr/bin/env bash

set -e

dir=$(cd `dirname $0` && cd .. && pwd)
tmp_dir=$(mktemp -d)

function fastcp() {
  src_dir=${1}
  parent_dir=$(dirname ${src_dir})
  src_folder=$(basename ${src_dir})
  dest_dir=${2}

  tar \
    --exclude=node_modules \
    --exclude=out \
    --exclude=dist \
    --exclude=venv \
    --exclude=__pycache__ \
    --exclude=regression \
    --exclude='pgadmin/static/js/generated/.cache' \
    --exclude='.cache' \
    -C ${parent_dir} \
    -cf - ${src_folder} | tar -C ${dest_dir} -xf -
}

echo "## Copying Electron Folder to the temporary directory..."
fastcp ${dir}/electron ${tmp_dir}

pushd ${tmp_dir}/electron > /dev/null
  echo "## Copying pgAdmin folder to the temporary directory..."
  rm -rf web; fastcp ${dir}/web ${tmp_dir}/electron

  echo "## Creating Virtual Environment..."
  rm -rf venv; mkdir -p venv
  python3 -m venv --copies ./venv

  # Hack: Copies all python installation files to the virtual environment
  # This was done because virtualenv does not copy all of the files
  # Looks like it assumes that they are not needed or that they should be installed in the system
  echo "  ## Copy all python libraries to the newly created virtual environment"
  python_libraries_path=`dirname $(python3 -c "import logging;print(logging.__file__)")`/../
  cp -r ${python_libraries_path}* venv/lib/python3.6/
  mkdir -p venv/lib/x86_64-linux-gnu/
  cp /usr/lib/x86_64-linux-gnu/libpython3.6m.so.1.0 venv/lib/x86_64-linux-gnu/
  pushd venv/lib/x86_64-linux-gnu > /dev/null
      ln -s libpython3.6m.so.1.0 libpython3.6m.so.1
  popd > /dev/null

  source ./venv/bin/activate
  pip3 install --no-cache-dir --no-binary psycopg2 -r ${dir}/requirements.txt

  echo "## Building the Javascript of the application..."
  pushd web > /dev/null
    rm -rf node_modules
    yarn bundle-app-js
  popd > /dev/null

  echo "## Creating the deb file..."
  yarn install
  yarn dist:linux
popd > /dev/null

destination_folder=${dir}/dist/debian/
rm -f ${destination_folder}/*.deb
mkdir -p ${destination_folder}
mv ${tmp_dir}/electron/out/make/*.deb ${destination_folder}
