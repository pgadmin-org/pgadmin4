define([
  'sources/selection/copy_data',
  'sources/selection/range_selection_helper'
  ],
function (copyData, RangeSelectionHelper) {
  return function handleQueryOutputKeyboardEvent(event, args) {
    var KEY_C = 67;
    var KEY_A = 65;
    var modifiedKey = event.keyCode;
    var isModifierDown = event.ctrlKey || event.metaKey;
    this.slickgrid = args.grid;

    if (isModifierDown && modifiedKey == KEY_C) {
      copyData.apply(this);
    }

    if (isModifierDown && modifiedKey == KEY_A) {
      RangeSelectionHelper.selectAll(this.slickgrid);
    }
  }
});