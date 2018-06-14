#!/bin/sh

bundle="$1"

if ! test -d "$bundle" ; then
	echo "$bundle is no bundle!" >&2
	exit 1
fi

if test -z $QTDIR ; then
	echo "QTDIR environment variable not set"
	exit 1
else
	echo "QTDIR=$QTDIR"
fi

test -d "$bundle/Contents/Resources" || mkdir -p "$bundle/Contents/Resources" || exit 1
# Create qt.conf so that app knows where the Plugins are present
cat >> "$bundle/Contents/Resources/qt.conf" << EOF
[Paths]
Plugins = PlugIns
EOF

test -d "$bundle/Contents/Frameworks" || mkdir -p "$bundle/Contents/Frameworks" || exit 1
test -d "$bundle/Contents/PlugIns/platforms" || mkdir -p "$bundle/Contents/PlugIns/platforms" || exit 1
cp -f $QTDIR/plugins/platforms/libqcocoa.dylib "$bundle/Contents/PlugIns/platforms" || { echo libqcocoa.dylib not found in $QTDIR/plugins/platforms; exit 1; }
cp -f $PGDIR/lib/libpq.5.dylib "$bundle/Contents/Frameworks" || { echo libpq.5.dylib not found in $PGDIR; exit 1; }

function CompleteSingleApp() {
	local bundle=$1 tag=$(basename "$1") todo todo_old fw_relpath lib lib_bn nested_app na_relpath

	echo "Completing app: $bundle"
	pushd "$bundle" > /dev/null

	#We skip nested apps here - those are treated specially
	todo=$(file `find ./ -perm +0111 ! -type d ! -path "*.app/*" ! -name "*.app"` | grep -E "Mach-O 64-bit" | awk -F ':| ' '{ORS=" "; print $1}')

	echo "App: $tag: Found executables: $todo"
	while test "$todo" != ""; do
		todo_old=$todo ;
		todo="" ;
		for todo_obj in $todo_old; do
			echo "App: $tag: Post-processing: $todo_obj"

			#Figure out the relative path from todo_obj to Contents/Frameworks
			fw_relpath=$(echo "$todo_obj" |\
				sed -n 's|^\(\.//*\)\(\([^/][^/]*/\)*\)[^/][^/]*$|\2|gp' | \
				sed -n 's|[^/][^/]*/|../|gp' \
			)"Contents/Frameworks"
			fw_relpath_old=$fw_relpath

			fw_loc="Contents/Frameworks"

			#Find all libraries $todo_obj depends on, but skip system libraries
			for lib in $(
				otool -L $todo_obj | \
				grep "Qt\|dylib\|Frameworks\|PlugIns" | grep -v ":" | sed 's/(.*//' | egrep -v '(/usr/lib)|(/System)|@executable_path@' \
			) $(otool -L $todo_obj | grep "Python" | grep -v ":" | sed 's/(.*//' \
			); do
				if echo $lib | grep "PlugIns\|libqcocoa"  > /dev/null; then
					lib_loc="Contents/PlugIns/platforms"
				elif echo $lib | grep "Qt" > /dev/null; then
					qtfw_path="$(dirname $lib | sed 's|.*\(Qt.*framework\)|\1|')"
					lib_loc="Contents/Frameworks/$qtfw_path"
					if [ "$(basename $todo_obj)" = "$lib" ]; then
						lib_loc="$(dirname $todo_obj)"
						qtfw_path=$(echo $lib_loc | sed 's/Contents\/Frameworks\///')
					fi
				elif echo $lib | grep "Python" > /dev/null; then
					pyfw_path="$(dirname $lib | sed 's|.*\(Python.*framework\)|\1|')"
					lib_loc="Contents/Frameworks/$pyfw_path"
					if [ "$(basename $todo_obj)" = "$lib" ]; then
						lib_loc="$(dirname $todo_obj)"
						pyfw_path=$(echo $lib_loc | sed 's/Contents\/Frameworks\///')
					fi
				else
					lib_loc="Contents/Frameworks"
				fi
				lib_bn="$(basename "$lib")" ;
				if ! test -f "$lib_loc/$lib_bn"; then
                                        target_file=""
					target_path=""
					echo "App: $tag: Adding symlink: $lib_bn (because of: $todo_obj)"
					# Copy the QT and Python framework
					if echo $lib | grep Qt > /dev/null ; then
						test -d $lib_loc || mkdir -p $lib_loc
						echo Copying -R $QTDIR/lib/$qtfw_path/$lib_bn to $lib_loc/
						cp $QTDIR/lib/$qtfw_path/$lib_bn $lib_loc/
					elif echo $lib | grep Python > /dev/null ; then
						test -d $lib_loc || mkdir -p $lib_loc
						cp -R "$lib" "$lib_loc/$lib_bn"
					else
						cp -R "$lib" "$lib_loc/$lib_bn"
					fi
					if ! test -L "$lib_loc/$lib_bn"; then
						chmod 755 "$lib_loc/$lib_bn"
					else
						target_file=$(readlink "$lib")
						target_path=$(dirname "$lib")/$target_file
					        echo "App: $tag: Adding symlink target: $target_path"
						cp "$target_path" "$lib_loc/$target_file"
						chmod 755 "$lib_loc/$target_file"
					fi
					echo "Rewriting ID in $lib_loc/$lib_bn to $lib_bn"
                                        echo install_name_tool -id "$lib_bn" "$lib_loc/$lib_bn"
                                        install_name_tool \
                                                -id "$lib_bn" \
                                                "$lib_loc/$lib_bn" || exit 1
					todo="$todo ./$lib_loc/$lib_bn"
				fi
				if echo $lib | grep Qt > /dev/null ; then
					fw_relpath="$fw_relpath/$qtfw_path"
				fi
				if echo $lib | grep Python > /dev/null ; then
					fw_relpath="$fw_relpath/$pyfw_path"
				fi
				chmod +w $todo_obj
				echo "Rewriting library $lib to @loader_path/$fw_relpath/$lib_bn in $todo_obj"
                                        echo install_name_tool -change "$lib" "@loader_path/$fw_relpath/$lib_bn" "$todo_obj"
				install_name_tool -change \
					"$lib" \
					"@loader_path/$fw_relpath/$lib_bn" \
					"$todo_obj" || exit 1
                                install_name_tool -change \
                                        "$target_path" \
                                        "@loader_path/$fw_relpath/$target_file" \
                                        "$todo_obj" || exit 1
				fw_relpath="$fw_relpath_old"
			done
		done
	done

	# Fix the rpaths for psycopg module
	find "$bundle/Contents/Resources/venv/" -name _psycopg.so -print0 | xargs -0 install_name_tool -change libpq.5.dylib @loader_path/../../../../../../Frameworks/libpq.5.dylib
	find "$bundle/Contents/Resources/venv/" -name _psycopg.so -print0 | xargs -0 install_name_tool -change libssl.1.0.0.dylib @loader_path/../../../../../../Frameworks/libssl.1.0.0.dylib
	find "$bundle/Contents/Resources/venv/" -name _psycopg.so -print0 | xargs -0 install_name_tool -change libcrypto.1.0.0.dylib @loader_path/../../../../../../Frameworks/libcrypto.1.0.0.dylib

	echo "App completed: $bundle"
	popd > /dev/null
}

CompleteSingleApp "$bundle"
