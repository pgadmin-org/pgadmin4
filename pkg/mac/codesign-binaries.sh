#!/bin/sh

BUNDLE="$1"

if ! test -d "${BUNDLE}" ; then
	echo "${BUNDLE} is no bundle!" >&2
	exit 1
fi

# Get the config
source codesign.conf

if [ -z "${DEVELOPER_ID}" ] ; then
	echo "Developer ID Application not found in codesign.conf" >&2
	exit 1
fi

if [ -z "${DEVELOPER_BUNDLE_ID}" ]; then
	echo "Developer Bundle Identifier not found in codesign.conf" >&2
fi

echo Signing ${BUNDLE} binaries
IFS=$'\n'
for i in $(find "${BUNDLE}" -type f)
do
	file "${i}" | grep -E "Mach-O executable|Mach-O 64-bit executable|Mach-O 64-bit bundle"
	if [ $? -eq 0 ] ; then
		codesign --deep -f -i "${DEVELOPER_BUNDLE_ID}" -s "${DEVELOPER_ID}" --options runtime ${i}
	fi
done

echo Signing ${BUNDLE} libraries
for i in $(find "${BUNDLE}" -type f -name "*.dylib*")
do
	codesign --deep -f -i "${DEVELOPER_BUNDLE_ID}" -s "${DEVELOPER_ID}" --options runtime ${i}
done

