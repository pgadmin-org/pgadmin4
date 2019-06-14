import moment from 'moment';
import $ from 'jquery';
import _ from 'underscore';

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

  render() {
    this.$el = $(
      `<li class='list-item' tabindex='0' data-key='${this.dataKey()}'>
          <div class='entry ${this.entry.status ? '' : 'error'}'>
              <div class='query'>${_.escape(this.entry.query)}</div>
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
  }
}

export class QueryHistoryEntries {
  constructor(parentNode) {
    this.parentNode = parentNode;
    this.$selectedItem = null;
    this.groupKeyFormat = 'YYYY MM DD';

    this.$el = null;
  }

  onSelectedChange(onSelectedChangeHandler) {
    this.onSelectedChangeHandler = onSelectedChangeHandler;
  }

  focus() {
    if (!this.$selectedItem) {
      this.setSelectedListItem(this.$el.find('.list-item').first());
    }
    this.$selectedItem.trigger('click');
    this.$el[0].focus();
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
    let groups = this.$el.find('.query-group');
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
      this.$el.prepend($groupEl);
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
        this.$el.append($groupEl);
      }
    } else if (groupIdx >= 0) {
      /* if the group is present */
      $groupEl = $(groups[groupIdx]);
    }

    let newItem = new QueryHistoryItem(entry);
    newItem.onClick(this.setSelectedListItem.bind(this));
    newItem.render();

    $groupEl.find('.query-entries').prepend(newItem.$el);
    this.setSelectedListItem(newItem.$el);
  }

  render() {
    let self = this;
    self.$el = $(`
            <div id='query_list' class='query-history' tabindex='0'>
            </div>
        `).on('keydown', this.navigateUpAndDown.bind(this));

    self.parentNode.empty().append(self.$el);
  }
}
