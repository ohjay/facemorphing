/*
 * face-morphing.js
 * Owen Jow
 * 
 * A JavaScript module providing face morphing functionality.
 * Assumes that `tracking.js`, `delaunay.js`, and `Math.js` have been loaded.
 *
 * Credit to J.T.L. for his implementation of Delaunay triangulation
 * (https://github.com/ironwallaby/delaunay).
 */

const ID_IMG_FROM = 'from';
const ID_IMG_TO = 'to';
const ID_CVS_FROM = 'canvas-from';
const ID_CVS_TO = 'canvas-to';
const ID_CVS_OUT = 'canvas-output';

const MARKER_SRC = 'marker_gold.png';
const BUTTON_LABEL_FINALIZE = 'Finalize point selection';
const BUTTON_LABEL_COMPUTE = 'Compute midpoint image';
const BUTTON_LABEL_ANEW = 'Done... for now.'

// Keycodes (because who actually remembers all the numbers)
const BACKSPACE = 8;
const DELETE = 46;

///

var currMarkerId = 0;
var points = {};
var added = []; // track the history of point additions
var canvas;
var midpoints, triangles; // to be filled in after triangulation

function findPosition(elt) {
  if (typeof(elt.offsetParent) != 'undefined') {
    for (var posX = 0, posY = 0; elt; elt = elt.offsetParent) {
      posX += elt.offsetLeft;
      posY += elt.offsetTop;
    }
    return [posX, posY];
  }
  return [elt.x, elt.y];
}

function makeGetCoordinates(id) {
  var getCoordinates = function(evt) {
    var posX = 0, posY = 0;
    var img = document.getElementById(id);
    var imgPos = findPosition(img);
    if (!evt) {
      var evt = window.event;
    }
    if (evt.pageX || evt.pageY) {
      posX = evt.pageX;
      posY = evt.pageY;
    } else if (e.clientX || e.clientY) {
      posX = evt.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
      posY = evt.clientY + document.body.scrollTop + document.documentElement.scrollTop;
    }
    
    // Add a marker to the image
    document.body.appendChild(createMarker('marker' + currMarkerId));
    $('#marker' + currMarkerId).css('left', posX - 5).css('top', posY - 5).show();
    ++currMarkerId;
    
    posX -= imgPos[0];
    posY -= imgPos[1];
    
    // Save the local coordinates in a list of points
    if (!(id in points)) {
      points[id] = [];
    }
    points[id].push([posX, posY]);
    added.push(id); // because we just added a point to the ID array
  };
  
  return getCoordinates;
}

function createMarker(id) {
  var img = document.createElement('img');
  img.setAttribute('src', MARKER_SRC);
  img.setAttribute('class', 'marker');
  img.setAttribute('id', id);
  return img;
}

function addCornerPoints(id) {
  var img = document.getElementById(id);
  points[id].push([0, 0]);
  points[id].push([0, img.clientHeight]);
  points[id].push([img.clientWidth, 0]);
  points[id].push([img.clientWidth, img.clientHeight]);
}

function getMidpoints(pointsFrom, pointsTo, t) {
  var pointF, pointT;
  var midpointX, midpointY;
  var midpoints = [];
  for (var i = 0; i < pointsFrom.length; ++i) {
    pointF = pointsFrom[i];
    pointT = pointsTo[i];
    
    midpointX = pointF[0] * t + pointT[0] * (1.0 - t);
    midpointY = pointF[1] * t + pointT[1] * (1.0 - t);
    midpoints.push([midpointX, midpointY]);
  }
  
  return midpoints;
}

function runTriangulation() {
  // Add the corner points before triangulating
  addCornerPoints(ID_IMG_FROM);
  addCornerPoints(ID_IMG_TO);
  
  var midpoints = getMidpoints(points[ID_IMG_FROM], points[ID_IMG_TO], 0.5);
  var tri = Delaunay.triangulate(midpoints);
  
  renderTriangulation(tri, ID_CVS_FROM, points[ID_IMG_FROM]);
  renderTriangulation(tri, ID_CVS_TO, points[ID_IMG_TO]);
  
  return [midpoints, tri];
}

function renderTriangulation(triangles, canvasId, points) {
  var cvs = document.getElementById(canvasId);
  var ctx = cvs.getContext('2d');
  
  var idx0, idx1, idx2;
  var point0, point1, point2;
  for (var i = 0; i < triangles.length; i += 3) {
    idx0 = triangles[i], idx1 = triangles[i + 1], idx2 = triangles[i + 2];
    point0 = points[idx0], point1 = points[idx1], point2 = points[idx2];
    
    ctx.beginPath();
    ctx.moveTo(point0[0], point0[1]);
    ctx.lineTo(point1[0], point1[1]);
    ctx.lineTo(point2[0], point2[1]);
    ctx.closePath();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0000ff';
    ctx.stroke();
  }
  
  $('#' + canvasId).show();
}

/*
 * Given six 2D points (three for each triangle), computes the matrix
 * for the affine transformation between triangle 1 and triangle 2.
 */
function computeAffine(X, Y) {
  return math.multiply(Y, math.inv(X));
}

/*
 * Returns all of the coordinates inside of the given triangle
 * as a horizontally-joined set of (x, y, 1) vectors –
 * meaning that if there are N such vectors, the returned array
 * would be of size 3 x N.
 */
function triangleInterior(triangle) {
  var point0 = triangle[0], point1 = triangle[1], point2 = triangle[2];
  var min0 = Math.min(point0[0], point1[0], point2[0]);
  var max0 = Math.max(point0[0], point1[0], point2[0]);
  var min1 = Math.min(point0[1], point1[1], point2[1]);
  var max1 = Math.max(point0[1], point1[1], point2[1]);
  
  var interior = [];
  
  // Compile a list by filtering points from the bounding box
  for (var i = min0; i <= max0; ++i) {
    for (var j = min1; j <= max1; ++j) {
      if (Delaunay.contains(triangle, [i, j])) {
        if (interior.length == 0) {
          interior = [[i], [j], [1]];
        } else {
          interior[0].push(i);
          interior[1].push(j);
          interior[2].push(1);
        }
      }
    }
  }
  
  return interior;
}

/*
 * Returns a number whose value is limited to the given range.
 * Example: (x * 255).clip(0, 255)
 *
 * Source: http://stackoverflow.com/a/11409944
 */
Number.prototype.clip = function(min, max) {
  return Math.min(Math.max(this, min), max);
};

/*
 * Returns a 1D RGBA array for the given image element.
 */
function getImageData(img) {
  var cvs = document.createElement('canvas');
  var ctx = cvs.getContext('2d');
  cvs.width = img.clientWidth;
  cvs.height = img.clientHeight;
  ctx.drawImage(img, 0, 0);
  
  return ctx.getImageData(0, 0, img.width, img.height);
}

/*
 * Bilinearly interpolates between the four neighbor values
 * associated with a particular RGB value in the image.
 */
function bilerp(x, y, img, width, height) {
  var val00, val10, val01, val11;
  var y0, y1;
  var output = [];
  
  var r = Math.floor(x), c = Math.floor(y);
  var vdiff = x - r, hdiff = y - c;
  var idx00, idx10, idx01, idx11;
  var inc;
  
  idx00 = (r * width + c) * 4;
  idx10 = (r * width + c + 1) * 4;
  idx01 = ((r + 1) * width + c) * 4;
  idx11 = ((r + 1) * width + c + 1) * 4;
  
  for (inc = 0; inc < 3; ++inc) {
    val00 = img[idx00 + inc];
    val10 = (c < width - 1) ? img[idx10 + inc] : val00;
    val01 = (r < height - 1) ? img[idx01 + inc] : val00;
    val11 = (r < height - 1 && c < width - 1) ? img[idx11 + inc] : val00;
    
    y0 = hdiff * val00 + (1.0 - hdiff) * val10;
    y1 = hdiff * val01 + (1.0 - hdiff) * val11;
    
    output.push(vdiff * y0 + (1.0 - vdiff) * y1);
  }
  
  return output;
}

function computeMidpointImage(midpoints, triangles, fromPts, toPts) {
  var idx0, idx1, idx2;
  var fromTri, toTri, targetTri;
  var Y, A0, A1;
  var midCoords;
  var warpedSrc0, warpedSrc1;
  var src0X, src0Y, src1X, src1Y, x, y, src0Color, src1Color, xyIdx;
  
  var fromImg = document.getElementById(ID_IMG_FROM);
  var toImg = document.getElementById(ID_IMG_TO);
  var width = fromImg.clientWidth, height = fromImg.clientHeight;
  
  var fromData = getImageData(fromImg).data;
  var toData = getImageData(toImg).data;
  var finalData = new Array(width * height * 4).fill(255);
  
  for (var i = 0; i < triangles.length; i += 3) {
    idx0 = triangles[i], idx1 = triangles[i + 1], idx2 = triangles[i + 2];
    fromTri = [fromPts[idx0], fromPts[idx1], fromPts[idx2]];
    toTri = [toPts[idx0], toPts[idx1], toPts[idx2]];
    targetTri = [midpoints[idx0], midpoints[idx1], midpoints[idx2]];
    
    fromTri = math.transpose(math.resize(fromTri, [3, 3], 1));
    toTri = math.transpose(math.resize(toTri, [3, 3], 1));
    Y = math.transpose(math.resize(targetTri, [3, 3], 1));
    
    A0 = computeAffine(Y, fromTri);
    A1 = computeAffine(Y, toTri);
    
    midCoords = triangleInterior(targetTri);
    warpedSrc0 = math.transpose(math.multiply(A0, midCoords));
    warpedSrc1 = math.transpose(math.multiply(A1, midCoords));
    
    for (var j = 0; j < warpedSrc0.length; ++j) {
      src0X = warpedSrc0[j][0], src0Y = warpedSrc0[j][1];
      src1X = warpedSrc1[j][0], src1Y = warpedSrc1[j][1];
      x = Math.floor(midCoords[0][j]);
      y = Math.floor(midCoords[1][j]);
      
      src0X = src0X.clip(0, height - 1), src0Y = src0Y.clip(0, width - 1);
      src1X = src1X.clip(0, height - 1), src1Y = src1Y.clip(0, width - 1);
      
      src0Color = bilerp(src0X, src0Y, fromData, width, height);
      src1Color = bilerp(src1X, src1Y, toData, width, height);
      
      xyIdx = (x * width + y) * 4; // TODO: should this be `height`?
      finalData[xyIdx] = math.mean(src0Color[0], src1Color[0]).clip(0, 255);
      finalData[xyIdx + 1] = math.mean(src0Color[1], src1Color[1]).clip(0, 255);
      finalData[xyIdx + 2] = math.mean(src0Color[2], src1Color[2]).clip(0, 255);
    }
  }

  // Turn final image pixels into an actual image
  fillOutputCanvas(finalData, width, height);
}

function fillOutputCanvas(finalData, width, height) {
  var cvs = document.getElementById(ID_CVS_OUT);
  cvs.width = width;
  cvs.height = height;
  
  var ctx = cvs.getContext('2d');
  var imgData = ctx.createImageData(width, height);
  var data = imgData.data;
  
  for (var i = 0, len = width * height * 4; i < len; ++i) {
    data[i] = finalData[i];
  }
  
  ctx.putImageData(imgData, 0, 0);
  $('#' + ID_CVS_OUT).show();
}

function setupCanvas(canvasId, imageId) {
  var cvs = document.getElementById(canvasId);
  var img = document.getElementById(imageId);
  var imgPos = findPosition(img);
  
  cvs.style.position = 'absolute';
  cvs.style.left = imgPos[0] + 'px';
  cvs.style.top = imgPos[1] + 'px';
  cvs.width = img.clientWidth;
  cvs.height = img.clientHeight;
}

$(document).ready(function() {
  // Point selection click handlers
  $('#from').click(makeGetCoordinates(ID_IMG_FROM));
  $('#to').click(makeGetCoordinates(ID_IMG_TO));
  
  // "Big green button" handler
  $('#big-green-btn').click(function(evt) {
    if (this.innerText == BUTTON_LABEL_FINALIZE) {
      $('#from').off('click');
      $('#to').off('click');
    
      var mtData = runTriangulation();
      midpoints = mtData[0], triangles = mtData[1];
      this.innerText = BUTTON_LABEL_COMPUTE;
    } else if (this.innerText == BUTTON_LABEL_COMPUTE) {
      computeMidpointImage(midpoints, triangles, points[ID_IMG_FROM], points[ID_IMG_TO]);
      this.innerText = BUTTON_LABEL_ANEW;
    }
  });
  
  // Canvas setup
  setupCanvas(ID_CVS_FROM, ID_IMG_FROM);
  setupCanvas(ID_CVS_TO, ID_IMG_TO);
  
  // Keypress handler
  $(document).on('keydown', function(evt) {
    switch (evt.keyCode) {
      case BACKSPACE:
      case DELETE:
        // Remove the most recently added point
        if (added.length > 0) {
          --currMarkerId;
          var markerElt = document.getElementById('marker' + currMarkerId);
          document.body.removeChild(markerElt);
          
          var id = added.pop();
          points[id].pop();
        }
        break;
    }
  });
});
