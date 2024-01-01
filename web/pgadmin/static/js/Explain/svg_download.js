/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2024, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import getApiInstance from '../api_instance';

function convertImageURLtoDataURI(api, image) {
  return new Promise(function(resolve, reject) {
    let href = image.getAttribute('href') || image.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    api.get(href).then(({data})=>{
      image.setAttribute('href', 'data:image/svg+xml;base64,'+window.btoa(data));
      resolve();
    }).catch(()=>{
      reject();
    });
  });
}

export function downloadSvg(svg, svgName) {
  let svgDiv = document.createElement('div');
  svgDiv.innerHTML = svg;
  svgDiv.style.visibility = 'hidden';
  svgDiv.style.display = 'table';
  svgDiv.style.position = 'absolute';
  let svgElement = svgDiv.firstChild;
  let api = getApiInstance();
  if (!svgElement) { return; }

  let images = svgElement.getElementsByTagName('image');
  let image_promises = [];
  if (images){
    for (let image of images) {
      if ((image.getAttribute('href') && image.getAttribute('href').indexOf('data:') === -1)
      || (image.getAttribute('xlink:href') && image.getAttribute('xlink:href').indexOf('data:') === -1)) {
        image_promises.push(convertImageURLtoDataURI(api, image));
      }
    }
  }

  Promise.all(image_promises).then(function() {
    let blob = new Blob([svgElement.outerHTML], {type: 'image/svg+xml'});
    let svgURL = (window.URL || window.webkitURL).createObjectURL(blob);
    let newElement = document.createElement('a');
    newElement.href = svgURL;
    newElement.setAttribute('download', svgName);
    document.body.appendChild(newElement);
    newElement.click();
    document.body.removeChild(newElement);
  });
}
