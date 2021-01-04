/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2021, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* eslint-disable react/no-find-dom-node */

import QueryHistory from 'sources/sqleditor/history/query_history';
import HistoryCollection from 'sources/sqleditor/history/history_collection';
import clipboard from 'sources/selection/clipboard';
import $ from 'jquery';
import moment from 'moment';

describe('QueryHistory', () => {
  let historyCollection;
  let historyWrapper;
  let historyComponent;

  beforeEach(() => {
    historyWrapper = $('<div id="history_grid"></div>').appendTo('body');
  });

  describe('when there is no history', () => {
    beforeEach(() => {
      historyCollection = new HistoryCollection([]);

      historyComponent = new QueryHistory(historyWrapper, historyCollection);
      historyComponent.render();
    });

    it('has no entries', (done) => {
      let foundChildren = historyWrapper.find('#query_list');
      expect(foundChildren.length).toBe(0);
      done();
    });

    it('No history found is displayed', (done) => {
      expect(historyWrapper.find('.pg-panel-message').html()).toBe('No history found');
      done();
    });
  });

  describe('when there is history', () => {
    let queryEntries;
    let queryDetail;

    describe('when two SQL queries were executed', () => {

      beforeEach(() => {
        const historyObjects = [{
          query: 'first sql statement',
          start_time: new Date(2017, 5, 3, 14, 3, 15, 150),
          status: true,
          row_affected: 12345,
          total_time: '14 msec',
          message: 'something important ERROR:  message from first sql query',
        }, {
          query: 'second sql statement',
          start_time: new Date(2016, 11, 11, 1, 33, 5, 99),
          status: false,
          row_affected: 1,
          total_time: '234 msec',
          message: 'something important ERROR:  message from second sql query',
        }];

        historyCollection = new HistoryCollection(historyObjects);
        historyComponent = new QueryHistory(historyWrapper, historyCollection);
        historyComponent.onCopyToEditorClick(()=>{});
        historyComponent.render();

        queryEntries = historyWrapper.find('#query_list .list-item');
        queryDetail = historyWrapper.find('#query_detail');
      });

      describe('the history entries panel', () => {
        it('has two query history entries', (done) => {
          expect(queryEntries.length).toBe(2);
          done();
        });

        it('displays the query history entries in order', () => {
          expect($(queryEntries[0]).text()).toContain('first sql statement');
          expect($(queryEntries[1]).text()).toContain('second sql statement');
        });

        it('displays the formatted timestamp of the queries in chronological order by most recent first', () => {
          expect($(queryEntries[0]).find('.timestamp').text()).toBe('14:03:15');
          expect($(queryEntries[1]).find('.timestamp').text()).toBe('01:33:05');
        });

        it('renders the most recent query as selected', (done) => {
          expect($(queryEntries[0]).hasClass('selected')).toBeTruthy();
          done();
        });

        it('renders the older query as not selected', () => {
          expect($(queryEntries[1]).hasClass('selected')).toBeFalsy();
          expect($(queryEntries[1]).find('.entry').hasClass('error')).toBeTruthy();
        });
      });

      describe('the historydetails panel', () => {
        let copyAllButton, copyEditorButton;

        beforeEach(() => {
          copyAllButton = () => queryDetail.find('#history-detail-query .btn-copy');
          copyEditorButton = () => queryDetail.find('#history-detail-query .btn-copy-editor');
        });

        it('should change preference font size', ()=>{
          historyComponent.setEditorPref({sql_font_size: '1.5em'});
          expect(queryDetail.find('#history-detail-query .CodeMirror').attr('style')).toBe('font-size: 1.5em;');
        });

        it('should change preference copy to editor false', ()=>{
          historyComponent.setEditorPref({copy_to_editor: false});
          expect($(queryDetail.find('#history-detail-query .btn-copy-editor')).hasClass('d-none')).toBe(true);
        });

        it('displays the formatted timestamp', () => {
          let firstDate = new Date(2017, 5, 3, 14, 3, 15, 150);
          expect(queryDetail.text()).toContain(firstDate.toLocaleDateString() + ' ' + firstDate.toLocaleTimeString());
        });

        it('displays the number of rows affected', () => {
          if (/PhantomJS/.test(window.navigator.userAgent)) {
            expect(queryDetail.text()).toContain('12345');
          } else {
            expect(queryDetail.text()).toContain('12,345');
          }
        });

        it('displays the total time', () => {
          expect(queryDetail.text()).toContain('14 msec');
        });

        it('displays the full message', () => {
          expect(queryDetail.text()).toContain('message from first sql query');
        });

        it('displays first query SQL', (done) => {
          setTimeout(() => {
            expect(queryDetail.text()).toContain('first sql statement');
            done();
          }, 1000);
        });

        describe('when the "Copy" button is clicked', () => {
          beforeEach(() => {
            spyOn(clipboard, 'copyTextToClipboard');
            copyAllButton().trigger('click');
          });

          it('copies the query to the clipboard', () => {
            expect(clipboard.copyTextToClipboard).toHaveBeenCalledWith('first sql statement');
          });
        });

        describe('Copy button', () => {
          beforeEach(() => {
            jasmine.clock().install();
          });

          afterEach(() => {
            jasmine.clock().uninstall();
          });

          it('should have text \'Copy\'', () => {
            expect(copyAllButton().text()).toBe('Copy');
          });

          it('should not have the class \'was-copied\'', () => {
            expect(copyAllButton().hasClass('was-copied')).toBe(false);
          });

          describe('when the copy button is clicked', () => {
            beforeEach(() => {
              copyAllButton().trigger('click');
            });

            describe('before 1.5 seconds', () => {
              beforeEach(() => {
                jasmine.clock().tick(1499);
              });

              it('should change the button text to \'Copied!\'', () => {
                expect(copyAllButton().text()).toBe('Copied!');
              });

              it('should have the class \'was-copied\'', () => {
                expect(copyAllButton().hasClass('was-copied')).toBe(true);
              });
            });

            describe('after 1.5 seconds', () => {
              beforeEach(() => {
                jasmine.clock().tick(1501);
              });

              it('should change the button text back to \'Copy\'', () => {
                expect(copyAllButton().text()).toBe('Copy');
              });
            });

            describe('when is clicked again after 1s', () => {
              beforeEach(() => {
                jasmine.clock().tick(1000);
                copyAllButton().trigger('click');

              });

              describe('before 2.5 seconds', () => {
                beforeEach(() => {
                  jasmine.clock().tick(1499);
                });

                it('should change the button text to \'Copied!\'', () => {
                  expect(copyAllButton().text()).toBe('Copied!');
                });

                it('should have the class \'was-copied\'', () => {
                  expect(copyAllButton().hasClass('was-copied')).toBe(true);
                });
              });

              describe('after 2.5 seconds', () => {
                beforeEach(() => {
                  jasmine.clock().tick(1501);
                });

                it('should change the button text back to \'Copy\'', () => {
                  expect(copyAllButton().text()).toBe('Copy');
                });
              });
            });
          });
        });

        describe('when the "Copy to query editor" button is clicked', () => {
          beforeEach(() => {
            spyOn(historyComponent.queryHistDetails, 'onCopyToEditorHandler').and.callThrough();
            copyEditorButton().trigger('click');
          });

          it('sends the query to the onCopyToEditorHandler', () => {
            expect(historyComponent.queryHistDetails.onCopyToEditorHandler).toHaveBeenCalledWith('first sql statement');
          });
        });

        describe('when the query failed', () => {
          let failedEntry;

          beforeEach(() => {
            failedEntry = $(queryEntries[1]);
            failedEntry.trigger('click');
          });

          it('displays the error message on top of the details pane', () => {
            expect(queryDetail.text()).toContain('Error Message message from second sql query');
          });
        });
      });


      describe('when the older query is clicked on', () => {
        let firstEntry, secondEntry;

        beforeEach(() => {
          firstEntry = $(queryEntries[0]);
          secondEntry = $(queryEntries[1]);
          secondEntry.trigger('click');
        });

        it('displays the query in the right pane', () => {
          expect(queryDetail.text()).toContain('second sql statement');
        });

        it('deselects the first history entry', () => {
          expect(firstEntry.hasClass('selected')).toBeFalsy();
        });

        it('selects the second history entry', () => {
          expect(secondEntry.hasClass('selected')).toBeTruthy();
        });
      });

      describe('when a third SQL query is executed', () => {
        beforeEach(() => {
          historyCollection.add({
            query: 'third sql statement',
            start_time: new Date(2017, 11, 11, 1, 33, 5, 99),
            status: false,
            row_affected: 5,
            total_time: '26 msec',
            message: 'pretext ERROR:  third sql message',
          });

          queryEntries = historyWrapper.find('#query_list .list-item');
        });

        it('displays third query SQL in the right pane', () => {
          expect(queryDetail.text()).toContain('third sql statement');
        });
      });

      describe('when a fourth SQL query is executed', () => {
        beforeEach(() => {
          historyCollection.add({
            query: 'fourth sql statement',
            start_time: new Date(2017, 12, 12, 1, 33, 5, 99),
            status: false,
            row_affected: 0,
            total_time: '26 msec',
            message: 'ERROR: unexpected error from fourth sql message',
          });

          queryEntries = historyWrapper.find('#query_list .list-item');
        });

        it('displays fourth query SQL in the right pane', () => {
          expect(queryDetail.text()).toContain('Error Message unexpected error from fourth sql message');
        });
      });
    });

    describe('when several days of queries were executed', () => {
      let queryEntryDateGroups;
      let dateToday, dateYest, dateBeforeYest;

      beforeEach(() => {
        jasmine.clock().install();
        const mockedCurrentDate = moment('2017-07-01 13:30:00');
        jasmine.clock().mockDate(mockedCurrentDate.toDate());

        dateToday = mockedCurrentDate.toDate();
        dateYest = mockedCurrentDate.clone().subtract(1, 'days').toDate();
        dateBeforeYest = mockedCurrentDate.clone().subtract(3, 'days').toDate();

        const historyObjects = [{
          query: 'first today sql statement',
          start_time: mockedCurrentDate.toDate(),
          status: true,
          row_affected: 12345,
          total_time: '14 msec',
          message: 'message from first today sql query',
        }, {
          query: 'second today sql statement',
          start_time: mockedCurrentDate.clone().subtract(1, 'hours').toDate(),
          status: false,
          row_affected: 1,
          total_time: '234 msec',
          message: 'message from second today sql query',
        }, {
          query: 'first yesterday sql statement',
          start_time: mockedCurrentDate.clone().subtract(1, 'days').toDate(),
          status: true,
          row_affected: 12345,
          total_time: '14 msec',
          message: 'message from first yesterday sql query',
        }, {
          query: 'second yesterday sql statement',
          start_time: mockedCurrentDate.clone().subtract(1, 'days').subtract(1, 'hours').toDate(),
          status: false,
          row_affected: 1,
          total_time: '234 msec',
          message: 'message from second yesterday sql query',
        }, {
          query: 'older than yesterday sql statement',
          start_time: mockedCurrentDate.clone().subtract(3, 'days').toDate(),
          status: true,
          row_affected: 12345,
          total_time: '14 msec',
          message: 'message from older than yesterday sql query',
        }];
        historyCollection = new HistoryCollection(historyObjects);

        historyComponent = new QueryHistory(historyWrapper, historyCollection);
        historyComponent.render();

        queryEntries = historyWrapper.find('#query_list .list-item');
        queryEntryDateGroups = historyWrapper.find('#query_list .query-group');
      });

      afterEach(() => {
        jasmine.clock().uninstall();
      });

      describe('the history entries panel', () => {
        it('has three query history entry data groups', () => {
          expect(queryEntryDateGroups.length).toBe(3);
        });

        it('has title above', () => {
          expect($(queryEntryDateGroups[0]).find('.date-label').text()).toBe('Today - ' + dateToday.toLocaleDateString());
          expect($(queryEntryDateGroups[1]).find('.date-label').text()).toBe('Yesterday - ' + dateYest.toLocaleDateString());
          expect($(queryEntryDateGroups[2]).find('.date-label').text()).toBe(dateBeforeYest.toLocaleDateString());
        });
      });
    });
  });
});
