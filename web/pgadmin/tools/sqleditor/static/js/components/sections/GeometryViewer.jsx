/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2023, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import React, { useEffect, useRef }  from 'react';
import ReactDOMServer from 'react-dom/server';
import { makeStyles } from '@material-ui/styles';
import _ from 'lodash';
import { MapContainer, TileLayer, LayersControl, GeoJSON, useMap } from 'react-leaflet';
import Leaflet, { CRS } from 'leaflet';
import {Geometry as WkxGeometry} from 'wkx';
import {Buffer} from 'buffer';
import gettext from 'sources/gettext';
import Theme from 'sources/Theme';
import clsx from 'clsx';
import PropTypes from 'prop-types';
import { Box } from '@material-ui/core';
import { PANELS } from '../QueryToolConstants';
import { QueryToolContext } from '../QueryToolComponent';

const useStyles = makeStyles((theme)=>({
  mapContainer: {
    backgroundColor: theme.palette.background.default,
    height: '100%',
    width: '100%',
    '& .leaflet-popup-content': {
      overflow: 'auto',
      margin: '8px',
    }
  },
  table: {
    borderSpacing: 0,
    width: '100%',
    ...theme.mixins.panelBorder,
  },
  tableCell: {
    margin: 0,
    padding: theme.spacing(0.5),
    ...theme.mixins.panelBorder.bottom,
    ...theme.mixins.panelBorder.right,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  tableCellHead: {
    fontWeight: 'bold',
  }
}));

function parseEwkbData(rows, column) {
  let key = column.key;
  const maxRenderByteLength = 20 * 1024 * 1024; //render geometry data up to 20MB
  const maxRenderGeometries = 100000; // render geometries up to 100000

  let geometries3D = [],
    supportedGeometries = [],
    unsupportedRows = [],
    geometryItemMap = new Map(),
    geometryTotalByteLength = 0,
    tooLargeDataSize = false,
    tooManyGeometries = false,
    infoList = [];

  _.every(rows, function (item) {
    try {
      let value = item[key];
      let buffer = Buffer.from(value, 'hex');
      let geometry = WkxGeometry.parse(buffer);
      if (geometry.hasZ) {
        geometries3D.push(geometry);
        return true;
      }
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
    } catch (e) {
      unsupportedRows.push(item);
    }
    return true;
  });

  // generate map info content
  if (tooLargeDataSize || tooManyGeometries) {
    infoList.push(gettext('%s of %s geometries rendered.', supportedGeometries.length, rows.length));
  }
  if (geometries3D.length > 0) {
    infoList.push(gettext('3D geometries not rendered.'));
  }
  if (unsupportedRows.length > 0) {
    infoList.push(gettext('Unsupported geometries not rendered.'));
  }

  return [
    supportedGeometries,
    geometryItemMap,
    infoList
  ];
}

function parseData(rows, columns, column) {
  if (rows.length === 0) {
    return {
      'geoJSONs': [],
      'selectedSRID': 0,
      'getPopupContent': undefined,
      'infoList': [gettext('Empty row.')],
    };
  }

  let mixedSRID = false;
  // parse ewkb data
  let [
    supportedGeometries,
    geometryItemMap,
    infoList
  ] = parseEwkbData(rows, column);

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
  let SRIDGeometriesPairs = _.toPairs(geometriesGroupBySRID);
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
  if (columns.length >= 2) {
    // add popup when geometry has properties
    getPopupContent = function (geojson) {
      let geometry = selectedGeometries[geoJSONs.indexOf(geojson)];
      let row = geometryItemMap.get(geometry);
      let retVal = [];
      for (const col of columns) {
        if(col.key === column.key) {
          continue;
        }
        retVal.push({
          'column': col.display_name,
          'value': row[col.key],
        });
      }
      return retVal;
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

function PopupTable({data}) {
  const classes = useStyles();
  return (
    <table className={classes.table}>
      <tbody>
        {data.map((row)=>{
          return (
            <tr key={row.column}>
              <td className={clsx(classes.tableCell, classes.tableCellHead)}>{row.column}</td>
              <td className={classes.tableCell}>{row.value}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

PopupTable.propTypes = {
  data: PropTypes.arrayOf(PropTypes.shape({
    column: PropTypes.string,
    value: PropTypes.any,
  })),
};

function GeoJsonLayer({data}) {
  const vectorLayerRef = useRef(null);
  const mapObj = useMap();
  useEffect(() => {
    if(!vectorLayerRef.current) return;
    if(data.geoJSONs.length <= 0) return;
    let bounds = vectorLayerRef.current.getBounds().pad(0.1);
    let maxLength = Math.max(bounds.getNorth() - bounds.getSouth(),
      bounds.getEast() - bounds.getWest());
    let minZoom = 0;
    if(data.selectedSRID !== 4326) {
      if (maxLength >= 180) {
        // calculate the min zoom level to enable the map to fit the whole geometry.
        minZoom = Math.floor(Math.log2(360 / maxLength)) - 2;
      }
    }
    mapObj.setMinZoom(minZoom);
    if (maxLength > 0) {
      mapObj.fitBounds(bounds);
    } else {
      mapObj.setView(bounds.getCenter(), mapObj.getZoom());
    }
  }, [data]);

  return (
    <GeoJSON
      ref={vectorLayerRef}
      pointToLayer={(_feature, latlng)=>{
        return Leaflet.circleMarker(latlng, {
          radius: 4,
          weight: 3,
        });
      }}
      style={{weight: 2}}
      onEachFeature={(feature, layer)=>{
        if(_.isFunction(data.getPopupContent)) {
          layer.bindPopup((l)=>{
            const popupContentNode = (
              <Theme>
                <PopupTable data={data.getPopupContent(l.feature.geometry)}/>
              </Theme>
            );
            return ReactDOMServer.renderToString(popupContentNode);
          }, {
            closeButton: false,
            minWidth: 260,
            maxWidth: 300,
            maxHeight: 300,
          });
        }
      }}
      data={data.geoJSONs}
    />
  );
}

GeoJsonLayer.propTypes = {
  data: PropTypes.shape({
    geoJSONs: PropTypes.array,
    selectedSRID: PropTypes.number,
    getPopupContent: PropTypes.func,
    infoList: PropTypes.array,
  }),
};

function TheMap({data}) {
  const mapObj = useMap();
  const infoControl = useRef(null);
  const resetLayersKey = useRef(0);
  useEffect(()=>{
    infoControl.current = Leaflet.control({position: 'topright'});
    infoControl.current.onAdd = function () {
      let ele = Leaflet.DomUtil.create('div', 'geometry-viewer-info-control');
      ele.innerHTML = data.infoList.join('<br />');
      return ele;
    };
    if(data.infoList.length > 0) {
      infoControl.current.addTo(mapObj);
    }
    resetLayersKey.current++;
    return ()=>{infoControl.current && infoControl.current.remove();};
  }, [data]);
  return (
    <>
      {data.selectedSRID === 4326 &&
      <LayersControl position="topright">
        <LayersControl.BaseLayer checked name={gettext('Empty')}>
          <TileLayer
            url=""
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer checked name={gettext('Street')}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            attribution='&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>'
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name={gettext('Topography')}>
          <TileLayer
            url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
            maxZoom={17}
            attribution={
              '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>,'
              + ' &copy; <a href="http://viewfinderpanoramas.org" target="_blank">SRTM</a>,'
              + ' &copy; <a href="https://opentopomap.org" target="_blank">OpenTopoMap</a>'
            }
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name={gettext('Gray Style')}>
          <TileLayer
            url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}{r}.png"
            maxZoom={19}
            attribution={
              '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>,'
              + ' &copy; <a href="http://cartodb.com/attributions" target="_blank">CartoDB</a>'
            }
            subdomains='abcd'
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name={gettext('Light Color')}>
          <TileLayer
            url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}{r}.pn"
            maxZoom={19}
            attribution={
              '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>,'
              + ' &copy; <a href="http://cartodb.com/attributions" target="_blank">CartoDB</a>'
            }
            subdomains='abcd'
          />
        </LayersControl.BaseLayer>
        <LayersControl.BaseLayer name={gettext('Dark Matter')}>
          <TileLayer
            url="https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}{r}.png"
            maxZoom={19}
            attribution={
              '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>,'
              + ' &copy; <a href="http://cartodb.com/attributions" target="_blank">CartoDB</a>'
            }
            subdomains='abcd'
          />
        </LayersControl.BaseLayer>
      </LayersControl>}
      <GeoJsonLayer key={resetLayersKey.current} data={data} />
    </>
  );
}
TheMap.propTypes = {
  data: PropTypes.shape({
    geoJSONs: PropTypes.array,
    selectedSRID: PropTypes.number,
    getPopupContent: PropTypes.func,
    infoList: PropTypes.array,
  }),
};


export function GeometryViewer({rows, columns, column}) {
  const classes = useStyles();
  const mapRef = React.useRef();
  const contentRef = React.useRef();
  const data = parseData(rows, columns, column);
  const queryToolCtx = React.useContext(QueryToolContext);

  useEffect(()=>{
    let timeoutId;
    const contentResizeObserver = new ResizeObserver(()=>{
      clearTimeout(timeoutId);
      if(queryToolCtx.docker.isTabVisible(PANELS.GEOMETRY)) {
        timeoutId = setTimeout(function () {
          mapRef.current?.invalidateSize();
        }, 100);
      }
    });
    contentResizeObserver.observe(contentRef.current);
  }, []);

  // Dyanmic CRS is not supported. Use srid as key and recreate the map on change
  return (
    <Box ref={contentRef} width="100%" height="100%" key={data.selectedSRID}>
      <MapContainer
        crs={data.selectedSRID === 4326 ? CRS.EPSG3857 : CRS.Simple}
        zoom={2} center={[20, 100]}
        preferCanvas={true}
        className={classes.mapContainer}
        whenCreated={(map)=>{
          mapRef.current = map;
        }}
      >
        <TheMap data={data}/>
      </MapContainer>
    </Box>
  );
}

GeometryViewer.propTypes = {
  rows: PropTypes.array,
  columns: PropTypes.array,
  column: PropTypes.object,
};
