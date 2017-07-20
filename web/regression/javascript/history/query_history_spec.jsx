/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2017, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

/* eslint-disable react/no-find-dom-node */

import jasmineEnzyme from 'jasmine-enzyme';
import React from 'react';
import ReactDOM from 'react-dom';
import QueryHistory from '../../../pgadmin/static/jsx/history/query_history';
import QueryHistoryEntry from '../../../pgadmin/static/jsx/history/query_history_entry';
import QueryHistoryDetail from '../../../pgadmin/static/jsx/history/query_history_detail';
import HistoryCollection from '../../../pgadmin/static/js/history/history_collection';

import {mount} from 'enzyme';

describe('QueryHistory', () => {
  let historyCollection;
  let historyWrapper;

  beforeEach(() => {
    jasmineEnzyme();
  });

  describe('when there is no history', () => {
    beforeEach(() => {
      historyCollection = new HistoryCollection([]);
      historyWrapper = mount(<QueryHistory historyCollection={historyCollection}/>);
    });

    describe('when we switch to the query history tab', () => {
      beforeEach(() => {
        historyWrapper.node.refocus();
        spyOn(historyWrapper.node, 'retrieveSelectedQuery');
      });

      it('does not try to focus on any element', () => {
        expect(historyWrapper.node.retrieveSelectedQuery).not.toHaveBeenCalled();
      });
    });

    it('has no entries', (done) => {
      let foundChildren = historyWrapper.find(QueryHistoryEntry);
      expect(foundChildren.length).toBe(0);
      done();
    });
    it('nothing is displayed on right panel', (done) => {
      let foundChildren = historyWrapper.find(QueryHistoryDetail);
      expect(foundChildren.length).toBe(1);
      done();
    });

    it('does not error', () => { });
  });

  describe('when there is history', () => {
    let historyObjects;

    beforeEach(function () {
      historyObjects = [{
        query: 'first sql statement',
        start_time: new Date(2017, 5, 3, 14, 3, 15, 150),
        status: true,
        row_affected: 12345,
        total_time: '14 msec',
        message: 'message from first sql query',
      }, {
        query: 'second sql statement',
        start_time: new Date(2016, 11, 11, 1, 33, 5, 99),
        status: false,
        row_affected: 1,
        total_time: '234 msec',
        message: 'something important ERROR:  message from second sql query',
      }];
      historyCollection = new HistoryCollection(historyObjects);

      historyWrapper = mount(<QueryHistory historyCollection={historyCollection}/>);
    });

    describe('when all query entries are visible in the pane', () => {
      describe('when two SQL queries were executed', () => {
        let foundChildren;
        let queryDetail;

        beforeEach(() => {
          spyOn(historyWrapper.node, 'isInvisible').and.returnValue(false);
          foundChildren = historyWrapper.find(QueryHistoryEntry);

          queryDetail = historyWrapper.find(QueryHistoryDetail);
        });

        describe('the main pane', () => {
          it('has two query history entries', () => {
            expect(foundChildren.length).toBe(2);
          });

          it('displays the query history entries in order', () => {
            expect(foundChildren.at(0).text()).toContain('first sql statement');
            expect(foundChildren.at(1).text()).toContain('second sql statement');
          });

          it('displays the formatted timestamp of the queries in chronological order by most recent first', () => {
            expect(foundChildren.at(0).text()).toContain('Jun 3 2017 – 14:03:15');
            expect(foundChildren.at(1).text()).toContain('Dec 11 2016 – 01:33:05');
          });

          it('renders the most recent query as selected', () => {
            expect(foundChildren.at(0).nodes.length).toBe(1);
            expect(foundChildren.at(0).hasClass('selected')).toBeTruthy();
          });

          it('renders the older query as not selected', () => {
            expect(foundChildren.at(1).nodes.length).toBe(1);
            expect(foundChildren.at(1).hasClass('selected')).toBeFalsy();
            expect(foundChildren.at(1).hasClass('error')).toBeTruthy();
          });

          describe('when the selected query is the most recent', () => {
            describe('when we press arrow down', () => {
              beforeEach(() => {
                pressArrowDownKey(foundChildren.parent().at(0));
              });

              it('should select the next query', () => {
                expect(foundChildren.at(1).nodes.length).toBe(1);
                expect(foundChildren.at(1).hasClass('selected')).toBeTruthy();
              });

              it('should display the corresponding detail on the right pane', () => {
                expect(queryDetail.at(0).text()).toContain('message from second sql query');
              });

              describe('when arrow down pressed again', () => {
                it('should not change the selected query', () => {
                  pressArrowDownKey(foundChildren.parent().at(0));

                  expect(foundChildren.at(1).nodes.length).toBe(1);
                  expect(foundChildren.at(1).hasClass('selected')).toBeTruthy();
                });
              });

              describe('when arrow up is pressed', () => {
                it('should select the most recent query', () => {
                  pressArrowUpKey(foundChildren.parent().at(0));

                  expect(foundChildren.at(0).nodes.length).toBe(1);
                  expect(foundChildren.at(0).hasClass('selected')).toBeTruthy();
                });
              });
            });

            describe('when arrow up is pressed', () => {
              it('should not change the selected query', () => {
                pressArrowUpKey(foundChildren.parent().at(0));
                expect(foundChildren.at(0).nodes.length).toBe(1);
                expect(foundChildren.at(0).hasClass('selected')).toBeTruthy();
              });
            });
          });
        });

        describe('the details pane', () => {
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
        });

        describe('when the older query is clicked on', () => {
          beforeEach(() => {
            foundChildren.at(1).simulate('click');
          });

          it('displays the query in the right pane', () => {
            expect(queryDetail.at(0).text()).toContain('second sql statement');
          });

          it('renders the most recent query as selected in the left pane', () => {
            expect(foundChildren.at(0).nodes.length).toBe(1);
            expect(foundChildren.at(0).hasClass('selected')).toBeFalsy();
            expect(foundChildren.at(0).hasClass('error')).toBeFalsy();
          });

          it('renders the older query as selected in the left pane', () => {
            expect(foundChildren.at(1).nodes.length).toBe(1);
            expect(foundChildren.at(1).hasClass('selected')).toBeTruthy();
            expect(foundChildren.at(1).hasClass('error')).toBeTruthy();
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
              message: 'third sql message',
            });

            foundChildren = historyWrapper.find(QueryHistoryEntry);
          });

          it('displays third query SQL in the right pane', () => {
            expect(queryDetail.at(0).text()).toContain('third sql statement');
          });
        });
      });
    });

    describe('when the first query is outside the visible area', () => {
      beforeEach(() => {
        spyOn(historyWrapper.node, 'isInvisible').and.callFake((element) => {
          return element.textContent.contains('first sql statement');
        });
      });

      describe('when the first query is the selected query', () => {
        describe('when refocus function is called', () => {
          let selectedListItem;

          beforeEach(() => {
            selectedListItem = ReactDOM.findDOMNode(historyWrapper.node)
              .getElementsByClassName('selected')[0].parentElement;

            spyOn(selectedListItem, 'focus');
            historyWrapper.node.refocus();
          });

          it('the first query scrolls into view', function () {
            expect(selectedListItem.focus).toHaveBeenCalledTimes(1);
          });
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
