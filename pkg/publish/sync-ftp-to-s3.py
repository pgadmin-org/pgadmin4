#!/usr/bin/python3

import argparse
import json
import os
import shutil
import subprocess
import tempfile

# Where does the content live?
BUCKET_NAME = 'pgadmin-archive.postgresql.org'


# Format file sizes etc
def format_bits(size):
    n = 0
    labels = {0: 'b', 1: 'Kb', 2: 'Mb', 3: 'Gb'}
    while size > 1000:
        size /= 1000
        n += 1
    return '{}{}'.format(round(size, 3), labels[n])


# Create an index.html file
def gen_index(path, dirs, files, output_dir):
    os.makedirs(os.path.join(output_dir, path), exist_ok=True)

    index = os.path.join(output_dir, path, 'index.html')
    f = open(index, "a")

    f.write('<html>\n')
    f.write('<head>\n')
    f.write('<title>pgAdmin Download Archive: {}</title>\n'.format(path))
    f.write('</head>\n')

    f.write('<body>\n')
    f.write('<h1>pgAdmin Download Archive: {}</h1>\n'.format(path))

    if len(dirs) > 0:
        f.write('<h2>Sub directories</h2>\n')
        f.write('<ul>\n')

        dirs.sort()
        for dir in dirs:
            if os.path.basename(dir) != 'snapshots' \
                    and os.path.basename(dir) != 'redmine':
                f.write('<li><a href="{}/index.html">{}</a></li>\n'
                        .format(dir, os.path.basename(dir)))

        f.write('</ul>\n')

    if len(files) > 0:
        f.write('<h2>Files</h2>\n')
        f.write('<ul>\n')

        files.sort()
        for file in files:
            f.write('<li><a href="{}">{}</a> ({})</li>\n'
                    .format(file[0], os.path.basename(file[0]),
                            format_bits(file[1])))

        f.write('</ul>\n')

    f.write('</body>\n')
    f.write('</html>\n')

    f.close()


# Get all the objects to process
def get_objects(BUCKET_NAME):
    cmd = ['/usr/bin/aws', 's3api', 'list-objects',
           '--bucket', BUCKET_NAME,
           '--query', 'Contents[].{Key: Key, Size: Size}']

    result = subprocess.run(cmd, stdout=subprocess.PIPE)

    objects = json.loads(result.stdout)
    paths = {}

    for o in objects:
        if o['Key'].startswith('redmine'):
            continue

        path = os.path.dirname(o['Key'])
        file = os.path.basename(o['Key'])

        if file != 'index.html':
            if path not in paths:
                paths[path] = []

            if file not in paths[path]:
                paths[path].append([file, o['Size']])

    return paths


# Process each path in the data set
def process_paths(paths, output_dir):
    # Make sure we have all possible paths in the structure
    # At the moment we only have paths that contain files
    new = {}
    for path in paths:
        while path != '':
            path = os.path.dirname(path)
            if path not in paths and path not in new:
                new[path] = {}

    paths.update(new)

    # Get a list of subdirectories for each path
    for path in paths:
        dirs = []

        for subdir in paths:
            if subdir[:len(path) + 1] == path + '/' or path == '':
                base = os.path.basename(subdir)
                immediate_child = '/' not in subdir[len(path) + 1:]
                if immediate_child and base and base not in dirs:
                    dirs.append(base)

        gen_index(path, dirs, paths[path], output_dir)


# Command line arguments
parser = argparse.ArgumentParser(
    description='Sync pgAdmin downloads to the archive site.')
parser.add_argument('cf_dist_id', metavar='<CloudFront Distribution ID>',
                    nargs=1,
                    help='the CloudFront distribution ID to invalidate')

args = parser.parse_args()

# Temp directory for the output
output_dir = tempfile.mkdtemp(prefix='pgadmin-archive-')

# Sync content to s3
sync_cmd = ('/usr/bin/aws s3 sync /usr/local/ftp.pgadmin.org/'
            ' s3://pgadmin-archive.postgresql.org/ --exclude "*/snapshots/*"')
os.system(sync_cmd)

# Get all the objects to process
data = get_objects(BUCKET_NAME)

# Process each path
process_paths(data, output_dir)

# Sync indexes to s3
sync_cmd = ('/usr/bin/aws s3 sync {}'
            ' s3://pgadmin-archive.postgresql.org/').format(output_dir)
os.system(sync_cmd)

# Invalidate CloudFront
sync_cmd = ('/usr/bin/aws cloudfront create-invalidation'
            ' --distribution-id {} --paths "/*"').format(args.cf_dist_id[0])
os.system(sync_cmd)

# Be a little careful here
if output_dir[:5] == '/tmp/' and len(output_dir) > 6:
    shutil.rmtree(output_dir)
