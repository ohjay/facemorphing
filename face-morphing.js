/*
 * face-morphing.js
 * Owen Jow
 * 
 * A JavaScript module providing face morphing functionality.
 * Assumes that `tracking.js`, `delaunay.js`, and `PyExtJs` have been loaded.
 *
 * Credit to J.T.L. for his implementation of Delaunay triangulation
 * (https://github.com/ironwallaby/delaunay).
 */

const ID_IMG_FROM = 'from';
const ID_IMG_TO = 'to';
const ID_CVS_FROM = 'canvas-from';
const ID_CVS_TO = 'canvas-to';

// Keycodes (because who actually remembers all the numbers)
const BACKSPACE = 8;
const DELETE = 46;

///

var currMarkerId = 0;
var points = {};
var added = []; // track the history of point additions
var canvas;

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
  img.setAttribute('src', 'marker_gold.png');
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
  
  // "Finalize point selection" button handler
  $('#point-sel-btn').click(function(evt) {
    $('#from').off('click');
    $('#to').off('click');
    
    runTriangulation();
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
