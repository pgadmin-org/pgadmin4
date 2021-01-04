##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2021, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
##########################################################################
from pgadmin.browser.server_groups.servers.databases \
    .external_tables.mapping_utils import \
    map_column_from_database, map_table_information_from_database, \
    is_web_table, format_options, map_execution_location, map_format_type
from pgadmin.utils.route import BaseTestGenerator


class TestMappingUtils(BaseTestGenerator):
    scenarios = [
        ('#map_column_from_database When retrieving columns from table, '
         'it returns only the name and type',
         dict(
             test_type='map_column_from_database',
             function_arguments=dict(column_information=dict(
                 name='some name',
                 cltype='some type',
                 other_column='some other column'
             )),
             expected_result=dict(name='some name', type='some type')
         )),

        ('#map_table_information_from_database When retrieving information '
         'from web table, '
         'it returns all fields',
         dict(
             test_type='map_table_information_from_database',
             function_arguments=dict(table_information=dict(
                 urilocation='{http://someurl.com}',
                 execlocation=['ALL_SEGMENTS'],
                 fmttype='b',
                 fmtopts='delimiter \',\' null \'\' escape \'"\' quote \'"\'',
                 command=None,
                 rejectlimit=None,
                 rejectlimittype=None,
                 errtblname=None,
                 errortofile=None,
                 pg_encoding_to_char='UTF8',
                 writable=False,
                 options=None,
                 distribution=None,
                 name='some_table_name',
                 namespace='some_name_space'
             )),
             expected_result=dict(
                 uris=['http://someurl.com'],
                 isWeb=True,
                 executionLocation=dict(type='all_segments', value=None),
                 formatType='custom',
                 formatOptions='delimiter = $$,$$,escape = $$"$$,'
                               'null = $$$$,quote = $$"$$',
                 command=None,
                 rejectLimit=None,
                 rejectLimitType=None,
                 errorTableName=None,
                 erroToFile=None,
                 pgEncodingToChar='UTF8',
                 writable=False,
                 options=None,
                 distribution=None,
                 name='some_table_name',
                 namespace='some_name_space'
             )
         )),
        ('#map_table_information_from_database When retrieving information '
         'from a web table using command instead of URIs, '
         'it returns all fields',
         dict(
             test_type='map_table_information_from_database',
             function_arguments=dict(table_information=dict(
                 urilocation=None,
                 execlocation=['ALL_SEGMENTS'],
                 fmttype='b',
                 fmtopts='delimiter \',\' null \'\' escape \'"\' quote \'"\'',
                 command='cat /tmp/places || echo \'error\'',
                 rejectlimit=None,
                 rejectlimittype=None,
                 errtblname=None,
                 errortofile=None,
                 pg_encoding_to_char='UTF8',
                 writable=False,
                 options=None,
                 distribution=None,
                 name='some_table_name',
                 namespace='some_name_space'
             )),
             expected_result=dict(
                 uris=None,
                 isWeb=True,
                 executionLocation=dict(type='all_segments', value=None),
                 formatType='custom',
                 formatOptions='delimiter = $$,$$,escape = $$"$$,'
                               'null = $$$$,quote = $$"$$',
                 command='cat /tmp/places || echo \'error\'',
                 rejectLimit=None,
                 rejectLimitType=None,
                 errorTableName=None,
                 erroToFile=None,
                 pgEncodingToChar='UTF8',
                 writable=False,
                 options=None,
                 distribution=None,
                 name='some_table_name',
                 namespace='some_name_space'
             )
         )),
        ('#map_table_information_from_database When retrieving information '
         'from a none web table, '
         'it returns all fields',
         dict(
             test_type='map_table_information_from_database',
             function_arguments=dict(table_information=dict(
                 urilocation='{gpfdist://filehost:8081/*.csv}',
                 execlocation=['ALL_SEGMENTS'],
                 fmttype='b',
                 fmtopts='delimiter \',\' null \'\' escape \'"\' quote \'"\'',
                 command=None,
                 rejectlimit=None,
                 rejectlimittype=None,
                 errtblname=None,
                 errortofile=None,
                 pg_encoding_to_char='UTF8',
                 writable=False,
                 options=None,
                 distribution=None,
                 name='some_table_name',
                 namespace='some_name_space'
             )),
             expected_result=dict(
                 uris=['gpfdist://filehost:8081/*.csv'],
                 isWeb=False,
                 executionLocation=dict(type='all_segments', value=None),
                 formatType='custom',
                 formatOptions='delimiter = $$,$$,escape = $$"$$,'
                               'null = $$$$,quote = $$"$$',
                 command=None,
                 rejectLimit=None,
                 rejectLimitType=None,
                 errorTableName=None,
                 erroToFile=None,
                 pgEncodingToChar='UTF8',
                 writable=False,
                 options=None,
                 distribution=None,
                 name='some_table_name',
                 namespace='some_name_space'
             )
         )),


        ('#is_web_table When url starts with http '
         'and command is None '
         'it returns true',
         dict(
             test_type='is_web_table',
             function_arguments=dict(
                 uris='{http://someurl.com}',
                 command=None
             ),
             expected_result=True
         )),
        ('#is_web_table When url starts with https '
         'and command is None, '
         'it returns true',
         dict(
             test_type='is_web_table',
             function_arguments=dict(
                 uris='{https://someurl.com}',
                 command=None
             ),
             expected_result=True
         )),
        ('#is_web_table When url starts with s3 '
         'and command is None'
         'it returns false',
         dict(
             test_type='is_web_table',
             function_arguments=dict(uris='{s3://someurl.com}', command=None),
             expected_result=False
         )),
        ('#is_web_table When url is None '
         'and command is not None'
         'it returns false',
         dict(
             test_type='is_web_table',
             function_arguments=dict(uris=None, command='Some command'),
             expected_result=True
         )),


        ('#map_execution_location When value is "HOST: 1.1.1.1", '
         'it returns {type: "host", value: "1.1.1.1"}',
         dict(
             test_type='map_execution_location',
             function_arguments=dict(execution_location=['HOST: 1.1.1.1']),
             expected_result=dict(type='host', value='1.1.1.1')
         )),
        ('#map_execution_location When value is "PER_HOST", '
         'it returns {type: "per_host", value: None}',
         dict(
             test_type='map_execution_location',
             function_arguments=dict(execution_location=['PER_HOST']),
             expected_result=dict(type='per_host', value=None)
         )),
        ('#map_execution_location When value is "MASTER_ONLY", '
         'it returns {type: "master_only", value: None}',
         dict(
             test_type='map_execution_location',
             function_arguments=dict(execution_location=['MASTER_ONLY']),
             expected_result=dict(type='master_only', value=None)
         )),
        ('#map_execution_location When value is "SEGMENT_ID: 1234", '
         'it returns {type: "segment", value: "1234"}',
         dict(
             test_type='map_execution_location',
             function_arguments=dict(execution_location=['SEGMENT_ID: 1234']),
             expected_result=dict(type='segment', value='1234')
         )),
        ('#map_execution_location When value is "TOTAL_SEGS: 4", '
         'it returns {type: "segments", value: "4"}',
         dict(
             test_type='map_execution_location',
             function_arguments=dict(execution_location=['TOTAL_SEGS: 4']),
             expected_result=dict(type='segments', value='4')
         )),
        ('#map_execution_location When value is "{ALL_SEGMENTS}", '
         'it returns {type: "all_segments", value: None}',
         dict(
             test_type='map_execution_location',
             function_arguments=dict(execution_location=['ALL_SEGMENTS']),
             expected_result=dict(type='all_segments', value=None)
         )),

        ('#map_format_type When value is "c", '
         'it returns csv',
         dict(
             test_type='map_format_type',
             function_arguments=dict(format_type='c'),
             expected_result='csv'
         )),
        ('#map_format_type When value is "something strange", '
         'it returns csv',
         dict(
             test_type='map_format_type',
             function_arguments=dict(format_type='something strange'),
             expected_result='csv'
         )),
        ('#map_format_type When value is "b", '
         'it returns custom',
         dict(
             test_type='map_format_type',
             function_arguments=dict(format_type='b'),
             expected_result='custom'
         )),
        ('#map_format_type When value is "t", '
         'it returns text',
         dict(
             test_type='map_format_type',
             function_arguments=dict(format_type='t'),
             expected_result='text'
         )),
        ('#map_format_type When value is "a", '
         'it returns avro',
         dict(
             test_type='map_format_type',
             function_arguments=dict(format_type='a'),
             expected_result='avro'
         )),
        ('#map_format_type When value is "p", '
         'it returns parquet',
         dict(
             test_type='map_format_type',
             function_arguments=dict(format_type='p'),
             expected_result='parquet'
         )),

        ('#format_options passing None, '
         'it returns None',
         dict(
             test_type='format_options',
             function_arguments=dict(format_type='avro', options=None),
             expected_result=None
         )),
        ('#format_options passing empty string, '
         'it returns empty string',
         dict(
             test_type='format_options',
             function_arguments=dict(format_type='parquet', options=''),
             expected_result=''
         )),
        ('#format_options passing "formatter \'fixedwidth_in\' null \' \'", '
         'it returns "formatter = $$fixedwidth_in$$,null = $$ $$"',
         dict(
             test_type='format_options',
             function_arguments=dict(format_type='custom',
                                     options='formatter \'fixedwidth_in\' '
                                             'null \' \''),
             expected_result='formatter = $$fixedwidth_in$$,null = $$ $$'
         )),
        ('#format_options passing '
         '"formatter \'fixedwidth_in\' comma \'\'\' null \' \'", '
         'it returns '
         '"formatter = $$fixedwidth_in$$,comma = $$\'$$,null = $$ $$"',
         dict(
             test_type='format_options',
             function_arguments=dict(format_type='custom',
                                     options='formatter \'fixedwidth_in\' '
                                             'comma \'\'\' null \' \''),
             expected_result='comma = $$\'$$,formatter = $$fixedwidth_in$$,'
                             'null = $$ $$'
         )),
        ('#format_options passing '
         '"formatter \'fixedwidth_in\' null \' \' preserve_blanks '
         '\'on\' comma \'\\\'\'", '
         'it returns '
         '"formatter = $$fixedwidth_in$$,null = $$ $$,preserve_blanks = '
         '$$on$$,comma = $$\'$$"',
         dict(
             test_type='format_options',
             function_arguments=dict(format_type='custom',
                                     options='formatter \'fixedwidth_in\' '
                                             'null \' \' '
                                             'preserve_blanks \'on\' '
                                             'comma \'\'\''),
             expected_result='comma = $$\'$$,formatter = $$fixedwidth_in$$,'
                             'null = $$ $$,'
                             'preserve_blanks = $$on$$'
         )),
        ('#format_options When format type is text '
         'it returns escaped string',
         dict(
             test_type='format_options',
             function_arguments=dict(format_type='text',
                                     options='something \'strange\' '
                                             'other \'\'\''),
             expected_result='other $$\'$$ '
                             'something $$strange$$'

         )),
        ('#format_options When format type is csv '
         'it returns escaped string',
         dict(
             test_type='format_options',
             function_arguments=dict(format_type='csv',
                                     options='something \'strange\' '
                                             'other \'\'\''),
             expected_result='other $$\'$$ '
                             'something $$strange$$'

         ))
    ]

    def runTest(self):
        result = None
        if self.test_type == 'map_column_from_database':
            result = map_column_from_database(**self.function_arguments)
        elif self.test_type == 'map_table_information_from_database':
            result = map_table_information_from_database(
                **self.function_arguments)
        elif self.test_type == 'map_execution_location':
            result = map_execution_location(**self.function_arguments)
        elif self.test_type == 'map_format_type':
            result = map_format_type(**self.function_arguments)
        elif self.test_type == 'is_web_table':
            result = is_web_table(**self.function_arguments)
        elif self.test_type == 'format_options':
            result = format_options(**self.function_arguments)
        self.assertEqual(result, self.expected_result)
