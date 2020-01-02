/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

export class Chart {
  constructor(container, options) {
    let self = this;

    require.ensure(['flotr2'], function(require) {
      self.chartApi = require('flotr2');
    }, function(error){
      throw(error);
    }, 'chart');

    /* Html Node where the graph goes */
    this._container = container;
    /* Graph library options */
    this._options = {};
    this._defaultOptions = {
      legend: {
        position: 'nw',
        backgroundColor: '#D2E8FF',
      },
      lines: {
        show: true,
        lineWidth: 2,
      },
      shadowSize: 0,
      resolution : 3,
      grid: {
        color: 'transparent',
        tickColor: '#8f8f8f',
      },
    };

    this._dataset = null;
    this._tooltipFormatter = null;
    /* Just to store other data related to charts. Used nowhere here in the module */
    this._otherData = {};
    this.setOptions(options);
  }

  getContainer() {
    return this._container;
  }

  getContainerDimensions() {
    return {
      height: this._container.clientHeight,
      width: this._container.clientWidth,
    };
  }

  getOptions() {
    return this._options;
  }

  /* This should be changed if library changed */
  setOptions(options, mergeOptions=true) {
    /* If mergeOptions then merge the options, else replace existing options */
    if(mergeOptions) {
      this._options = {...this._defaultOptions, ...this._options, ...options};
    } else {
      this._options = {...this._defaultOptions, ...options};
    }
  }

  removeOptions(optionKey) {
    if(this._options[optionKey]) {
      delete this._options[optionKey];
    }
  }

  getOtherData(key) {
    if(this._otherData[key]) {
      return this._otherData[key];
    }
  }

  setOtherData(key, value) {
    this._otherData[key] = value;
  }

  isVisible() {
    let dim = this.getContainerDimensions();
    return (dim.height > 0 && dim.width > 0);
  }

  isInPage() {
    return (this._container === document.body) ? false : document.body.contains(this._container);
  }

  setTooltipFormatter(tooltipFormatter) {
    let opt = this.getOptions();

    this._tooltipFormatter = tooltipFormatter;

    if(this._tooltipFormatter) {
      this.setOptions({
        mouse: {
          ...opt.mouse,
          trackFormatter: this._tooltipFormatter,
        },
      });
    }
  }

  draw(dataset) {
    this._dataset = dataset;
    if(this._container) {
      if(this.chartApi) {
        this.chartApi.draw(this._container, this._dataset, this._options);
      }
    }
  }
}
