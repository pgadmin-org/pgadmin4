import moment from 'moment';
import $ from 'jquery';
import _ from 'underscore';
import 'bootstrap.toggle';
import gettext from 'sources/gettext';

const ARROWUP = 38;
const ARROWDOWN = 40;

export class QueryHistoryEntryDateGroup {
  constructor(date, groupKey) {
    this.date = date;
    this.formatString = 'MMM DD YYYY';
    this.groupKey = groupKey;
  }

  getDatePrefix() {
    let prefix = '';
    if (this.isDaysBefore(0)) {
      prefix = 'Today - ';
    } else if (this.isDaysBefore(1)) {
      prefix = 'Yesterday - ';
    }
    return prefix;
  }

  getDateFormatted(date) {
    return date.toLocaleDateString();
  }

  isDaysBefore(before) {
    return (
      this.getDateFormatted(this.date) ===
      this.getDateFormatted(moment().subtract(before, 'days').toDate())
    );
  }

  render() {
    return $(`<div class='query-group' data-key='${this.groupKey}'>
            <div class='date-label'>${this.getDatePrefix()}${this.getDateFormatted(this.date)}</div>
            <ul class='query-entries'></ul>
        </div>`);
  }
}

export class QueryHistoryItem {
  constructor(entry) {
    this.entry = entry;
    this.$el = null;
    this.onClickHandler = null;
  }

  onClick(onClickHandler) {
    this.onClickHandler = onClickHandler;
    if (this.$el) {
      this.$el.off('click').on('click', e => {
        this.onClickHandler($(e.currentTarget));
      });
    }
  }

  formatDate(date) {
    return moment(date).format('HH:mm:ss');
  }

  dataKey() {
    return this.formatDate(this.entry.start_time);
  }

  render(is_pgadmin_queries_shown) {
    this.$el = $(
      `<li class='list-item' tabindex='0' data-key='${this.dataKey()}'>
          <div class='entry ${this.entry.status ? '' : 'error'}'>
              <div class='query'>
                  <span id="query_source_icon" class="query-history-icon sql-icon-lg"></span>
                  ${_.escape(this.entry.query)}
              </div>
              <div class='other-info'>
              <div class='timestamp'>${this.formatDate(this.entry.start_time)}</div>
              </div>
          </div>
      </li>`
    )
      .data('entrydata', this.entry)
      .on('click', e => {
        this.onClickHandler($(e.currentTarget));
      });

    let query_source = this.entry.query_source;
    if(query_source)
      this.$el.find('#query_source_icon')
        .addClass(query_source.ICON_CSS_CLASS)
        .attr('role', 'img');

    if(this.entry.is_pgadmin_query) {
      this.$el.addClass('pgadmin-query-history-entry');
      if(!is_pgadmin_queries_shown)
        this.$el.addClass('d-none');
    }
  }
}

export class QueryHistoryEntries {
  constructor(parentNode) {
    this.parentNode = parentNode;
    this.$selectedItem = null;
    this.groupKeyFormat = 'YYYY MM DD';

    this.$el = null;
    this.is_pgadmin_queries_shown = null;
  }

  onSelectedChange(onSelectedChangeHandler) {
    this.onSelectedChangeHandler = onSelectedChangeHandler;
  }

  focus() {
    if (!this.$selectedItem) {
      this.setSelectedListItem(this.$entriesEl.find('.list-item').first());
    }
    this.$selectedItem.trigger('click');
    this.$entriesEl.focus();
  }

  isArrowDown(event) {
    return (event.keyCode || event.which) === ARROWDOWN;
  }

  isArrowUp(event) {
    return (event.keyCode || event.which) === ARROWUP;
  }

  navigateUpAndDown(event) {
    let arrowKeys = [ARROWUP, ARROWDOWN];
    let key = event.keyCode || event.which;
    if (arrowKeys.indexOf(key) > -1) {
      event.preventDefault();
      this.onKeyDownHandler(event);
      return false;
    }
    return true;
  }

  onKeyDownHandler(event) {
    if (this.isArrowDown(event)) {
      if (this.$selectedItem.next().length > 0) {
        this.setSelectedListItem(this.$selectedItem.next());
      } else {
        /* if last, jump to next group */
        let $group = this.$selectedItem.closest('.query-group');
        if ($group.next().length > 0) {
          this.setSelectedListItem(
            $group.next().find('.list-item').first()
          );
        }
      }
    } else if (this.isArrowUp(event)) {
      if (this.$selectedItem.prev().length > 0) {
        this.setSelectedListItem(this.$selectedItem.prev());
      } else {
        /* if first, jump to prev group */
        let $group = this.$selectedItem.closest('.query-group');
        if ($group.prev().length > 0) {
          this.setSelectedListItem(
            $group.prev().find('.list-item').last()
          );
        }
      }
    }
  }

  onSelectListItem(event) {
    this.setSelectedListItem($(event.currentTarget));
  }

  dateAsGroupKey(date) {
    return moment(date).format(this.groupKeyFormat);
  }

  setSelectedListItem($listItem) {
    if (this.$selectedItem) {
      this.$selectedItem.removeClass('selected');
    }
    $listItem.addClass('selected');
    this.$selectedItem = $listItem;

    this.$selectedItem[0].scrollIntoView({block: 'center'});

    if (this.onSelectedChangeHandler) {
      this.onSelectedChangeHandler(this.$selectedItem.data('entrydata'));
    }
  }

  addEntry(entry) {
    /* Add the entry in respective date group in descending sorted order. */
    let groups = this.$entriesEl.find('.query-group');
    let groupsKeys = $.map(groups, group => {
      return $(group).attr('data-key');
    });
    let entryGroupKey = this.dateAsGroupKey(entry.start_time);
    let groupIdx = _.indexOf(groupsKeys, entryGroupKey);

    let $groupEl = null;
    /* if no groups present */
    if (groups.length == 0) {
      $groupEl = new QueryHistoryEntryDateGroup(
        entry.start_time,
        entryGroupKey
      ).render();
      this.$entriesEl.prepend($groupEl);
    } else if (groupIdx < 0 && groups.length != 0) {
      /* if groups are present, but this is a new group */
      $groupEl = new QueryHistoryEntryDateGroup(
        entry.start_time,
        entryGroupKey
      ).render();

      let i=0;
      while(i<groupsKeys.length){
        if(entryGroupKey > groupsKeys[i]) {
          $groupEl.insertBefore(groups[i]);
          break;
        }
        i++;
      }
      if(i == groupsKeys.length) {
        this.$entriesEl.append($groupEl);
      }
    } else if (groupIdx >= 0) {
      /* if the group is present */
      $groupEl = $(groups[groupIdx]);
    }

    let newItem = new QueryHistoryItem(entry);
    newItem.onClick(this.setSelectedListItem.bind(this));
    newItem.render(this.is_pgadmin_queries_shown);

    if (!_.isUndefined($groupEl)){
      let entries = $groupEl.find('.query-entries').find('.list-item');
      let i=0;
      if(entries.length > 0)
      {
        while(i<entries.length){
          if(newItem.$el.attr('data-key') > $(entries[i]).attr('data-key')) {
            $(newItem.$el).insertBefore(entries[i]);
            break;
          }else{
            $(newItem.$el).insertAfter(entries[i]);
          }
          i++;
        }
      } else{
        $groupEl.find('.query-entries').append(newItem.$el);
      }
    }
    this.setSelectedListItem(newItem.$el);
  }

  toggleGeneratedQueries() {
    this.$el.find('.pgadmin-query-history-entry').each(function() {
      $(this).toggleClass('d-none');
    });
    this.is_pgadmin_queries_shown = !this.is_pgadmin_queries_shown;
  }

  render() {
    let self = this;
    self.$el = $(`
        <div class="toggle-and-history-container">
            <div class="query-history-toggle">
                <label class="control-label" for="generated-queries-toggle">
                    ` + gettext('Show queries generated internally by pgAdmin?') + `
                </label>
                <input id="generated-queries-toggle" type="checkbox"
                  class="pgadmin-controls" data-style="quick"
                  data-size="mini" data-on="` + gettext('Yes') + '" data-off="' + gettext('No') + `"
                  data-onstyle="success" data-offstyle="ternary" checked>
            </div>
            <div id='query_list' class='query-history' tabindex='0'></div>
        </div>
    `);

    self.$entriesEl = self.$el.find('#query_list');
    self.$entriesEl.on('keydown', this.navigateUpAndDown.bind(this));

    self.is_pgadmin_queries_shown = true;

    self.$el.find('#generated-queries-toggle').bootstrapToggle().change(
      function() {
        self.toggleGeneratedQueries();
      }
    );

    self.parentNode.empty().append(self.$el);
  }
}
