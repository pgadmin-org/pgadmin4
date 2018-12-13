let svgDownloader = {
  blobURL: function(content, contentType) {
    var blob = new Blob([content], {type: contentType});
    return (window.URL || window.webkitURL).createObjectURL(blob);
  },

  downloadSVG: function(content, fileName)  {
    // Safari xlink NS issue fix
    content = content.replace(/NS\d+:href/gi, 'xlink:href');

    var svgURL = this.blobURL(content, 'image/svg+xml');
    var newElement = document.createElement('a');
    newElement.href = svgURL;
    newElement.setAttribute('download', fileName);
    document.body.appendChild(newElement);
    newElement.click();
    document.body.removeChild(newElement);
  },
};

export default svgDownloader;
