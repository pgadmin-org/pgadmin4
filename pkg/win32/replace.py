import getopt
import sys

# Store input and output file names
infile = ''
outfile = ''
searchExp = ''
replaceExp = ''

# Read command line args
myopts, args = getopt.getopt(sys.argv[1:], "i:o:s:r:")

###############################
# o == option
# a == argument passed to the o
###############################
for o, a in myopts:
    if o == '-i':
        infile = a
    elif o == '-o':
        outfile = a
    elif o == '-s':
        searchExp = a
    elif o == '-r':
        replaceExp = a
    else:
        print("Usage: %s -i input -o output" % sys.argv[0])

# Display input and output file name passed as the args

f1 = open(infile, 'r')
f2 = open(outfile, 'w')
for line in f1:
    f2.write(line.replace(searchExp, replaceExp))
f1.close()
f2.close()
