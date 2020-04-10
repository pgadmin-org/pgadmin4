/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import gettext from 'sources/gettext';
import {Buffer} from 'buffer';
import $ from 'jquery';

var L = null;
var Geometry = null;
let GeometryViewer = {
  panel_closed: true,

  go_for_render: function(handler, items, columns, columnIndex) {
    let self = this;

    if (!self.map_component) {
      self.map_component = initMapComponent();
    }

    if (self.panel_closed) {
      let wcDocker = window.wcDocker;
      let geometry_viewer_panel = handler.gridView.geometry_viewer =
        handler.gridView.docker.addPanel('geometry_viewer',
          wcDocker.DOCK.STACKED, handler.gridView.data_output_panel);
      $('#geometry_viewer_panel')[0].appendChild(self.map_component.mapContainer.get(0));
      self.panel_closed = false;

      geometry_viewer_panel.on(wcDocker.EVENT.CLOSED, function () {
        $('#geometry_viewer_panel').empty();
        self.map_component.clearMap();
        self.panel_closed = true;
      });

      geometry_viewer_panel.on(wcDocker.EVENT.RESIZE_ENDED, function () {
        if (geometry_viewer_panel.isVisible()) {
          self.map_component.resizeMap();
        }
      });

      geometry_viewer_panel.on(wcDocker.EVENT.VISIBILITY_CHANGED, function (visible) {
        if (visible) {
          self.map_component.resizeMap();
        } else {
          self.map_component.loseFocus();
        }
      });
    }

    handler.gridView.geometry_viewer.focus();
    self.map_component.clearMap();
    let dataObj = parseData(items, columns, columnIndex, Geometry);
    self.map_component.renderMap(dataObj);
  },

  render_geometries: function (handler, items, columns, columnIndex) {
    let self = this;
    require.ensure(['leaflet', 'wkx'], function(require) {
      L = require('leaflet');
      Geometry = require('wkx').Geometry;
      self.go_for_render(handler, items, columns, columnIndex);
    }, function(error){
      throw(error);
    }, 'geometry');
  },

  add_header_button: function (columnDefinition) {
    columnDefinition.header = {
      buttons: [
        {
          cssClass: 'div-view-geometry-column',
          tooltip: 'View all geometries in this column',
          showOnHover: false,
          command: 'view-geometries',
          content: '<button class="btn-xs btn-primary"><i class="fa fa-eye" aria-hidden="true"></i></button>',
        },
      ],
    };
  },

  parse_data: parseData,
};

function initMapComponent() {
  const geojsonMarkerOptions = {
    radius: 4,
    weight: 3,
  };
  const geojsonStyle = {
    weight: 2,
  };
  const popupOption = {
    closeButton: false,
    minWidth: 260,
    maxWidth: 300,
    maxHeight: 300,
  };

  let mapContainer = $('<div class="geometry-viewer-container"></div>');
  let lmap = L.map(mapContainer.get(0), {
    preferCanvas: true,
  }).setZoom(0);

  // update default attribution
  lmap.attributionControl.setPrefix('');

  let vectorLayer = L.geoJSON([], {
    style: geojsonStyle,
    pointToLayer: function (feature, latlng) {
      return L.circleMarker(latlng, geojsonMarkerOptions);
    },
  });
  vectorLayer.addTo(lmap);
  let baseLayersObj = {
    'Empty': L.tileLayer(''),
    'Street': L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      }),
    'Topography': L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 17,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>,' +
          ' &copy; <a href="http://viewfinderpanoramas.org" target="_blank">SRTM</a>,' +
          ' &copy; <a href="https://opentopomap.org" target="_blank">OpenTopoMap</a>',
      }),
    'Gray Style': L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>,' +
          ' &copy; <a href="http://cartodb.com/attributions" target="_blank">CartoDB</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }),
    'Light Color': L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>,' +
          ' &copy; <a href="http://cartodb.com/attributions" target="_blank">CartoDB</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }),
    'Dark Matter': L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}{r}.png',
      {
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>,' +
          ' &copy; <a href="http://cartodb.com/attributions" target="_blank">CartoDB</a>',
        subdomains: 'abcd',
        maxZoom: 19,
      }),
  };
  let layerControl = L.control.layers(baseLayersObj);
  let defaultBaseLayer = baseLayersObj.Street;
  let baseLayers = _.values(baseLayersObj);

  let infoControl = L.control({position: 'topright'});
  infoControl.onAdd = function () {
    this._div = L.DomUtil.create('div', 'geometry-viewer-info-control');
    return this._div;
  };
  infoControl.update = function (content) {
    this._div.innerHTML = content;
  };

  let setEPSG3857 = function () {
    if (lmap.options.crs !== L.CRS.EPSG3857) {
      lmap.options.crs = L.CRS.EPSG3857;
      layerControl.addTo(lmap);
      lmap.addLayer(defaultBaseLayer);
      mapContainer.addClass('geometry-viewer-container-plain-background');
      lmap.setMinZoom(0);
    }
  };

  let setSimpleCRS = function () {
    if (lmap.options.crs !== L.CRS.Simple) {
      lmap.options.crs = L.CRS.Simple;
      layerControl.remove();
      _.each(baseLayers, function (layer) {
        if (lmap.hasLayer(layer)) {
          defaultBaseLayer = layer;
          layer.remove();
        }
      });
      mapContainer.removeClass('geometry-viewer-container-plain-background');
    }
  };

  setSimpleCRS();
  setEPSG3857();

  return {
    'mapContainer': mapContainer,
    'clearMap': function () {
      lmap.closePopup();
      infoControl.remove();
      vectorLayer.clearLayers();
    },

    'loseFocus': function() {
      lmap.fire('blur');
    },

    'renderMap': function (dataObj) {
      let geoJSONs = dataObj.geoJSONs,
        SRID = dataObj.selectedSRID,
        getPopupContent = dataObj.getPopupContent,
        infoList = dataObj.infoList;

      let isEmpty = false;
      if (geoJSONs.length === 0) {
        isEmpty = true;
      }

      try {
        vectorLayer.addData(geoJSONs);
      } catch (e) {
        // Invalid LatLng object: (NaN, NaN)
        infoList.push('An error occurred while rendering data.');
        isEmpty = true;
      }

      let bounds = vectorLayer.getBounds();
      if (!bounds.isValid()) {
        isEmpty = true;
      }

      if (infoList.length > 0) {
        if (lmap.options.crs === L.CRS.EPSG3857) {
          layerControl.remove();
          infoControl.addTo(lmap);
          layerControl.addTo(lmap);
        } else {
          infoControl.addTo(lmap);
        }
        let infoContent = generateInfoContent(infoList);
        infoControl.update(infoContent);
      }

      if (isEmpty) {
        setSimpleCRS();
        lmap.setView([0, 0], lmap.getZoom());
        return;
      }

      if (typeof getPopupContent === 'function') {
        let addPopup = function (layer) {
          layer.bindPopup(function () {
            return getPopupContent(layer.feature.geometry);
          }, popupOption);
        };
        vectorLayer.eachLayer(addPopup);
      }

      bounds = bounds.pad(0.1);
      let maxLength = Math.max(bounds.getNorth() - bounds.getSouth(),
        bounds.getEast() - bounds.getWest());
      if (SRID === 4326) {
        setEPSG3857();
      } else {
        setSimpleCRS();
        if (maxLength >= 180) {
          // calculate the min zoom level to enable the map to fit the whole geometry.
          let minZoom = Math.floor(Math.log2(360 / maxLength)) - 2;
          lmap.setMinZoom(minZoom);
        } else {
          lmap.setMinZoom(0);
        }
      }

      if (maxLength > 0) {
        lmap.fitBounds(bounds);
      } else {
        lmap.setView(bounds.getCenter(), lmap.getZoom());
      }
    },

    'resizeMap': function () {
      setTimeout(function () {
        lmap.invalidateSize();
      }, 10);
    },

  };
}

function parseData(items, columns, columnIndex, GeometryLib) {
  const maxRenderByteLength = 20 * 1024 * 1024; //render geometry data up to 20MB
  const maxRenderGeometries = 100000; // render geometries up to 100000
  let field = columns[columnIndex].field;
  let geometries3D = [],
    supportedGeometries = [],
    unsupportedItems = [],
    infoList = [],
    geometryItemMap = new Map(),
    mixedSRID = false,
    geometryTotalByteLength = 0,
    tooLargeDataSize = false,
    tooManyGeometries = false;

  if (items.length === 0) {
    infoList.push('Empty row.');
    return {
      'geoJSONs': [],
      'selectedSRID': 0,
      'getPopupContent': undefined,
      'infoList': infoList,
    };
  }

  // parse ewkb data
  _.every(items, function (item) {
    try {
      let value = item[field];
      let buffer = Buffer.from(value, 'hex');
      let geometry = GeometryLib.parse(buffer);
      if (geometry.hasZ) {
        geometries3D.push(geometry);
      } else {
        geometryTotalByteLength += buffer.byteLength;
        if (geometryTotalByteLength > maxRenderByteLength) {
          tooLargeDataSize = true;
          return false;
        }
        if (supportedGeometries.length >= maxRenderGeometries) {
          tooManyGeometries = true;
          return false;
        }

        if (!geometry.srid) {
          geometry.srid = 0;
        }
        supportedGeometries.push(geometry);
        geometryItemMap.set(geometry, item);
      }
    } catch (e) {
      unsupportedItems.push(item);
    }
    return true;
  });

  // generate map info content
  if (tooLargeDataSize || tooManyGeometries) {
    infoList.push(supportedGeometries.length + ' of ' + items.length + ' geometries rendered.');
  }
  if (geometries3D.length > 0) {
    infoList.push(gettext('3D geometries not rendered.'));
  }
  if (unsupportedItems.length > 0) {
    infoList.push(gettext('Unsupported geometries not rendered.'));
  }

  if (supportedGeometries.length === 0) {
    return {
      'geoJSONs': [],
      'selectedSRID': 0,
      'getPopupContent': undefined,
      'infoList': infoList,
    };
  }

  // group geometries by SRID
  let geometriesGroupBySRID = _.groupBy(supportedGeometries, 'srid');
  let SRIDGeometriesPairs = _.pairs(geometriesGroupBySRID);
  if (SRIDGeometriesPairs.length > 1) {
    mixedSRID = true;
  }
  // select the largest group
  let selectedPair = _.max(SRIDGeometriesPairs, function (pair) {
    return pair[1].length;
  });
  let selectedSRID = parseInt(selectedPair[0]);
  let selectedGeometries = selectedPair[1];

  let geoJSONs = _.map(selectedGeometries, function (geometry) {
    return geometry.toGeoJSON();
  });

  let getPopupContent;
  if (columns.length >= 3) {
    // add popup when geometry has properties
    getPopupContent = function (geojson) {
      let geometry = selectedGeometries[geoJSONs.indexOf(geojson)];
      let item = geometryItemMap.get(geometry);
      return itemToTable(item, columns, columnIndex);
    };
  }

  if (mixedSRID) {
    infoList.push(gettext('Geometries with non-SRID %s not rendered.', selectedSRID));
  }

  return {
    'geoJSONs': geoJSONs,
    'selectedSRID': selectedSRID,
    'getPopupContent': getPopupContent,
    'infoList': infoList,
  };
}

function itemToTable(item, columns, ignoredColumnIndex) {
  let content = '<table class="table table-bordered table-striped view-geometry-property-table"><tbody>';

  // start from 1 because columns[0] is empty
  for (let i = 1; i < columns.length; i++) {
    if (i !== ignoredColumnIndex) {
      let columnDef = columns[i];
      content += '<tr><th>' + columnDef.display_name + '</th>';

      let value = item[columnDef.field];
      if (_.isUndefined(value) && columnDef.has_default_val) {
        content += '<td class="td-disabled">[default]</td>';
      } else if ((_.isUndefined(value) && columnDef.not_null) ||
        (_.isUndefined(value) || value === null)) {
        content += '<td class="td-disabled">[null]</td>';
      } else {
        content += '<td>' + value + '</td>';
      }

      content += '</tr>';
    }
  }
  content += '</tbody></table>';
  return content;
}

function generateInfoContent(infoList) {
  let infoContent = infoList.join('<br>');
  return infoContent;
}

module.exports = GeometryViewer;
