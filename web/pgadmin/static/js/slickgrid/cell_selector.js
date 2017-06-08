define(["slickgrid"], function () {
  var Slick = window.Slick;

  return function () {
    this.init = function (grid) {
      grid.onActiveCellChanged.subscribe(function (event, slickEvent) {
        grid.getSelectionModel().setSelectedRanges([
          new Slick.Range(
            slickEvent.row,
            slickEvent.cell,
            slickEvent.row,
            slickEvent.cell
          )
        ]);
      });
    }
  }
});