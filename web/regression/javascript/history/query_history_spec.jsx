/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2018, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* eslint-disable react/no-find-dom-node */

import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import ReactDOM from 'react-dom';
import moment from 'moment';

import QueryHistory from '../../../pgadmin/static/jsx/history/query_history';
import QueryHistoryEntry from '../../../pgadmin/static/jsx/history/query_history_entry';
import QueryHistoryEntryDateGroup from '../../../pgadmin/static/jsx/history/query_history_entry_date_group';
import QueryHistoryEntries from '../../../pgadmin/static/jsx/history/query_history_entries';
import QueryHistoryDetail from '../../../pgadmin/static/jsx/history/query_history_detail';
import HistoryCollection from '../../../pgadmin/static/js/history/history_collection';
import clipboard from '../../../pgadmin/static/js/selection/clipboard';

import {mount} from 'enzyme';
import '../helper/enzyme.helper';


describe('QueryHistory', () => {
  let historyCollection;
  let historyWrapper;
  let sqlEditorPref = {sql_font_size: '1em'};
  beforeEach(() => {
    jasmineEnzyme();
  });

  describe('when there is no history', () => {
    beforeEach(() => {
      historyCollection = new HistoryCollection([]);
      historyWrapper = mount(<QueryHistory historyCollection={historyCollection}
        sqlEditorPref={sqlEditorPref}
      />);
    });

    describe('when we switch to the query history tab', () => {
      beforeEach(() => {
        historyWrapper.instance().refocus();
        spyOn(historyWrapper.instance(), 'retrieveSelectedQuery');
      });

      it('does not try to focus on any element', () => {
        expect(historyWrapper.instance().retrieveSelectedQuery).not.toHaveBeenCalled();
      });
    });

    it('has no entries', (done) => {
      let foundChildren = historyWrapper.find(QueryHistoryEntry);
      expect(foundChildren.length).toBe(0);
      done();
    });

    it('nothing is displayed in the history details panel', (done) => {
      let foundChildren = historyWrapper.find(QueryHistoryDetail);
      expect(foundChildren.length).toBe(1);
      done();
    });
  });

  describe('when there is history', () => {
    let queryEntries;
    let queryDetail;
    let isInvisibleSpy;
    let queryHistoryEntriesComponent;

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
        historyWrapper = mount(<QueryHistory historyCollection={historyCollection}
            sqlEditorPref={sqlEditorPref}
        />);

        queryHistoryEntriesComponent = historyWrapper.find(QueryHistoryEntries);
        isInvisibleSpy = spyOn(queryHistoryEntriesComponent.instance(), 'isInvisible')
          .and.returnValue(false);

        queryEntries = queryHistoryEntriesComponent.find(QueryHistoryEntry);
        queryDetail = historyWrapper.find(QueryHistoryDetail);
      });

      describe('the history entries panel', () => {
        it('has two query history entries', () => {
          expect(queryEntries.length).toBe(2);
        });

        it('displays the query history entries in order', () => {
          expect(queryEntries.at(0).text()).toContain('first sql statement');
          expect(queryEntries.at(1).text()).toContain('second sql statement');
        });

        it('displays the formatted timestamp of the queries in chronological order by most recent first', () => {
          expect(queryEntries.at(0).find('.timestamp').text()).toBe('14:03:15');
          expect(queryEntries.at(1).find('.timestamp').text()).toBe('01:33:05');
        });

        it('renders the most recent query as selected', () => {
          expect(queryEntries.at(0).getElements().length).toBe(1);
          expect(queryEntries.at(0).render().hasClass('selected')).toBeTruthy();
        });

        it('renders the older query as not selected', () => {
          expect(queryEntries.at(1).getElements().length).toBe(1);
          expect(queryEntries.at(1).render().hasClass('selected')).toBeFalsy();
          expect(queryEntries.at(1).render().hasClass('error')).toBeTruthy();
        });

        describe('when the selected query is the most recent', () => {
          describe('when we press arrow down', () => {
            beforeEach(() => {
              pressArrowDownKey(queryHistoryEntriesComponent.find('.list-item').at(0));
            });

            it('should select the next query', () => {
              expect(queryEntries.at(1).getElements().length).toBe(1);
              expect(queryEntries.at(1).render().hasClass('selected')).toBeTruthy();
            });

            it('should display the corresponding detail on the right pane', () => {
              expect(queryDetail.at(0).render().text()).toContain('message from second sql query');
            });

            describe('when arrow down pressed again', () => {
              it('should not change the selected query', () => {
                pressArrowDownKey(queryHistoryEntriesComponent.find('.list-item').at(0));

                expect(queryEntries.at(1).getElements().length).toBe(1);
                expect(queryEntries.at(1).render().hasClass('selected')).toBeTruthy();
              });
            });

            describe('when arrow up is pressed', () => {
              beforeEach(() => {
                pressArrowUpKey(queryHistoryEntriesComponent.find('.list-item').at(0));
              });

              it('should select the most recent query', () => {
                expect(queryEntries.at(0).getElements().length).toBe(1);
                expect(queryEntries.at(0).render().hasClass('selected')).toBeTruthy();
              });
            });
          });

          describe('when arrow up is pressed', () => {
            beforeEach(() => {
              pressArrowUpKey(queryHistoryEntriesComponent.find('.list-item').at(0));
            });

            it('should not change the selected query', () => {
              expect(queryEntries.at(0).getElements().length).toBe(1);
              expect(queryEntries.at(0).render().hasClass('selected')).toBeTruthy();
            });
          });
        });
      });

      describe('the historydetails panel', () => {
        let copyAllButton;

        beforeEach(() => {
          copyAllButton = () => queryDetail.find('#history-detail-query > button');
        });

        it('displays the formatted timestamp', () => {
          expect(queryDetail.at(0).text()).toContain('6-3-17 14:03:15Date');
        });

        it('displays the number of rows affected', () => {
          if (/PhantomJS/.test(window.navigator.userAgent)) {
            expect(queryDetail.at(0).text()).toContain('12345Rows Affected');
          } else {
            expect(queryDetail.at(0).text()).toContain('12,345Rows Affected');
          }
        });

        it('displays the total time', () => {
          expect(queryDetail.at(0).text()).toContain('14 msecDuration');
        });

        it('displays the full message', () => {
          expect(queryDetail.at(0).text()).toContain('message from first sql query');
        });

        it('displays first query SQL', (done) => {
          setTimeout(() => {
            expect(queryDetail.at(0).text()).toContain('first sql statement');
            done();
          }, 1000);
        });

        describe('when the "Copy All" button is clicked', () => {
          beforeEach(() => {
            spyOn(clipboard, 'copyTextToClipboard');
            copyAllButton().simulate('click');
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

          it('should have text \'Copy All\'', () => {
            expect(copyAllButton().text()).toBe('Copy All');
          });

          it('should not have the class \'was-copied\'', () => {
            expect(copyAllButton().hasClass('was-copied')).toBe(false);
          });

          describe('when the copy button is clicked', () => {
            beforeEach(() => {
              copyAllButton().simulate('click');
            });

            describe('before 1.5 seconds', () => {
              beforeEach(() => {
                jasmine.clock().tick(1499);
              });

              it('should change the button text to \'Copied!\'', () => {
                expect(copyAllButton().text()).toBe('Copied!');
              });

              it('should have the class \'was-copied\'', () => {
                expect(copyAllButton().render().hasClass('was-copied')).toBe(true);
              });
            });

            describe('after 1.5 seconds', () => {
              beforeEach(() => {
                jasmine.clock().tick(1501);
              });

              it('should change the button text back to \'Copy All\'', () => {
                expect(copyAllButton().text()).toBe('Copy All');
              });
            });

            describe('when is clicked again after 1s', () => {
              beforeEach(() => {
                jasmine.clock().tick(1000);
                copyAllButton().simulate('click');

              });

              describe('before 2.5 seconds', () => {
                beforeEach(() => {
                  jasmine.clock().tick(1499);
                });

                it('should change the button text to \'Copied!\'', () => {
                  expect(copyAllButton().text()).toBe('Copied!');
                });

                it('should have the class \'was-copied\'', () => {
                  expect(copyAllButton().render().hasClass('was-copied')).toBe(true);
                });
              });

              describe('after 2.5 seconds', () => {
                beforeEach(() => {
                  jasmine.clock().tick(1501);
                });

                it('should change the button text back to \'Copy All\'', () => {
                  expect(copyAllButton().text()).toBe('Copy All');
                });
              });
            });
          });
        });

        describe('when the query failed', () => {
          let failedEntry;

          beforeEach(() => {
            failedEntry = queryEntries.at(1);
            failedEntry.simulate('click');
          });

          it('displays the error message on top of the details pane', () => {
            expect(queryDetail.at(0).text()).toContain('Error Message message from second sql query');
          });
        });
      });

      describe('when the older query is clicked on', () => {
        let firstEntry, secondEntry;

        beforeEach(() => {
          firstEntry = queryEntries.at(0);
          secondEntry = queryEntries.at(1);
          secondEntry.simulate('click');
        });

        it('displays the query in the right pane', () => {
          expect(queryDetail.at(0).text()).toContain('second sql statement');
        });

        it('deselects the first history entry', () => {
          expect(firstEntry.getElements().length).toBe(1);
          expect(firstEntry.hasClass('selected')).toBeFalsy();

        });

        it('selects the second history entry', () => {
          expect(secondEntry.getElements().length).toBe(1);
          expect(secondEntry.render().hasClass('selected')).toBeTruthy();
        });
      });

      describe('when the first query is outside the visible area', () => {
        beforeEach(() => {
          isInvisibleSpy.and.callFake((element) => {
            return element.textContent.contains('first sql statement');
          });
        });

        describe('when the first query is the selected query', () => {
          describe('when refocus function is called', () => {
            let selectedListItem;

            beforeEach(() => {
              selectedListItem = ReactDOM.findDOMNode(historyWrapper.instance())
                .getElementsByClassName('selected')[0].parentElement;

              spyOn(selectedListItem, 'focus');

              jasmine.clock().install();
            });

            afterEach(() => {
              jasmine.clock().uninstall();
            });

            it('the first query scrolls into view', () => {
              historyWrapper.instance().refocus();
              expect(selectedListItem.focus).toHaveBeenCalledTimes(0);
              jasmine.clock().tick(1);
              expect(selectedListItem.focus).toHaveBeenCalledTimes(1);
            });
          });
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

          queryEntries = historyWrapper.find(QueryHistoryEntry);
        });

        it('displays third query SQL in the right pane', () => {
          expect(queryDetail.at(0).text()).toContain('third sql statement');
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

          queryEntries = historyWrapper.find(QueryHistoryEntry);
        });

        it('displays fourth query SQL in the right pane', () => {
          expect(queryDetail.at(0).text()).toContain('Error Message unexpected error from fourth sql message');
        });
      });

      describe('when a fifth SQL query is executed', () => {
        beforeEach(() => {
          historyCollection.add({
            query: 'fifth sql statement',
            start_time: new Date(2017, 12, 12, 1, 33, 5, 99),
            status: false,
            row_affected: 0,
            total_time: '26 msec',
            message: 'unknown error',
          });

          queryEntries = historyWrapper.find(QueryHistoryEntry);
        });

        it('displays fourth query SQL in the right pane', () => {
          expect(queryDetail.at(0).text()).toContain('Error Message unknown error');
        });
      });

    });

    describe('when several days of queries were executed', () => {
      let queryEntryDateGroups;

      beforeEach(() => {
        jasmine.clock().install();
        const mockedCurrentDate = moment('2017-07-01 13:30:00');
        jasmine.clock().mockDate(mockedCurrentDate.toDate());

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

        historyWrapper = mount(<QueryHistory historyCollection={historyCollection}
            sqlEditorPref={sqlEditorPref}
        />);

        const queryHistoryEntriesComponent = historyWrapper.find(QueryHistoryEntries);
        isInvisibleSpy = spyOn(queryHistoryEntriesComponent.instance(), 'isInvisible')
          .and.returnValue(false);

        queryEntries = queryHistoryEntriesComponent.find(QueryHistoryEntry);
        queryEntryDateGroups = queryHistoryEntriesComponent.find(QueryHistoryEntryDateGroup);
      });

      afterEach(() => {
        jasmine.clock().uninstall();
      });

      describe('the history entries panel', () => {
        it('has three query history entry data groups', () => {
          expect(queryEntryDateGroups.length).toBe(3);
        });

        it('has title above', () => {
          expect(queryEntryDateGroups.at(0).text()).toBe('Today - Jul 01 2017');
          expect(queryEntryDateGroups.at(1).text()).toBe('Yesterday - Jun 30 2017');
          expect(queryEntryDateGroups.at(2).text()).toBe('Jun 28 2017');
        });
      });
    });
  });

  function pressArrowUpKey(node) {
    pressKey(node, 38);
  }

  function pressArrowDownKey(node) {
    pressKey(node, 40);
  }

  function pressKey(node, keyCode) {
    node.simulate('keyDown', {keyCode: keyCode});
  }
});
