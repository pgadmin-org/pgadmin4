/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import $ from 'jquery';
import {Chart} from 'top/dashboard/static/js/charting';

describe('In charting related testcases', ()=> {
  let chartObj = undefined,
    chartDiv = undefined,
    options = {};

  beforeEach(()=> {
    $('body').append(
      '<div id="charting-test-container"></div>'
    );
    chartDiv = $('#charting-test-container')[0];
    chartObj = new Chart(chartDiv, options);
  });

  it('Return the correct container', ()=>{
    expect(chartObj.getContainer()).toEqual(chartDiv);
  });

  it('Returns the container dimensions', ()=>{
    let dim = chartObj.getContainerDimensions();
    expect(dim.height).toBeDefined();
    expect(dim.width).toBeDefined();
  });

  it('Check if options are set', ()=>{
    chartObj.setOptions({
      mouse: {
        track:true,
      },
    });

    let opt = chartObj.getOptions();

    expect(opt.mouse).toBeDefined();
  });

  it('Check if options are set with mergeOptions false', ()=>{
    let overOpt = {
      mouse: {
        track:true,
      },
    };
    chartObj.setOptions(overOpt, false);

    let newOptShouldBe = {...chartObj._defaultOptions, ...overOpt};

    let opt = chartObj.getOptions();
    expect(JSON.stringify(opt)).toEqual(JSON.stringify(newOptShouldBe));
  });

  it('Check if other data is set', ()=>{
    chartObj.setOtherData('some_val', 1);
    expect(chartObj._otherData['some_val']).toEqual(1);
  });

  it('Check if other data is get', ()=>{
    chartObj.setOtherData('some_val', 1);
    expect(chartObj.getOtherData('some_val')).toEqual(1);
  });

  it('Check if other data returns undefined for not set', ()=>{
    expect(chartObj.getOtherData('some_val_not_set')).toEqual(undefined);
  });

  it('Check if isVisible returns correct', ()=>{
    let dimSpy = spyOn(chartObj, 'getContainerDimensions');

    dimSpy.and.returnValue({
      height: 1, width: 1,
    });
    expect(chartObj.isVisible()).toEqual(true);
    dimSpy.and.stub();

    dimSpy.and.returnValue({
      height: 0, width: 0,
    });
    expect(chartObj.isVisible()).toEqual(false);
  });

  it('Check if isInPage returns correct', ()=>{
    expect(chartObj.isInPage()).toEqual(true);
    $('body').find('#charting-test-container').remove();
    expect(chartObj.isInPage()).toEqual(false);
  });

  afterEach(()=>{
    $('body').find('#charting-test-container').remove();
  });
});
