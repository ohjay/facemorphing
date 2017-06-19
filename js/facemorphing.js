/*
 * face-morphing.js
 * Owen Jow
 * 
 * A JavaScript module providing face morphing functionality.
 * Assumes that `clmtrackr`, `delaunay.js`, etc. have been loaded.
 *
 * Credit to J.T.L. for his implementation of Delaunay triangulation
 * (https://github.com/ironwallaby/delaunay).
 */

const ID_IMG_FROM           = 'from';
const ID_IMG_TO             = 'to';
const ID_CVS_FROM           = 'canvas-from';
const ID_CVS_TO             = 'canvas-to';
const ID_CVS_OUT            = 'canvas-output';
const ID_INPUT_UPLOAD_FROM  = 'upload-from';
const ID_INPUT_UPLOAD_TO    = 'upload-to';
const ID_BUTTON_UPLOAD_FROM = 'bupload-from';
const ID_BUTTON_UPLOAD_TO   = 'bupload-to';
const ID_OUTER_CONTAINER    = 'outer-container';
const ID_PROGRESS_BAR       = 'bar';
const ID_PROGRESS_LABEL     = 'progress-label';
const ID_CAMERA             = 'camera';
const ID_CAMERA_WRAPPER     = 'camera-wrapper';
const ID_NUMFRAMES_RANGE    = 'numframes-range';
const ID_FPS_RANGE          = 'fps-range';
const ID_DF0_RANGE          = 'df0-range';
const ID_DF1_RANGE          = 'df1-range';
const ID_WF_RANGE           = 'wf-range';
const ID_BIG_GREEN_BTN      = 'big-green-btn';
const ID_MANUAL_BTN         = 'manual-btn';
const ID_GIF_BTN            = 'gif-btn';
const ID_CAMERA_BTN         = 'camera-btn';
const ID_INFO_BTN           = 'show-info';
const ID_INFO_MODAL         = 'info-modal';
const ID_IMG_DL_LINK        = 'img-download-link';
const ID_GIF_DL_LINK        = 'gif-download-link';
const ID_INSTRUCTIONS       = 'instructions';
const ID_IMAGES_OUTPUT      = 'images-and-output';
const ID_FROM_REMINDER      = 'from-reminder';
const ID_TO_REMINDER        = 'to-reminder';
const ID_GIF_OUTPUT         = 'gif-output';
const ID_EASE               = 'ease';

const DEFAULT_MARKER_SRC    = 'images/markers/marker_gold.png';
const BUTTON_LABEL_CROP     = 'Set source image crop';
const BUTTON_LABEL_FREEZE   = 'Freeze camera image';
const BUTTON_LABEL_FINALIZE = 'Finalize point selection'; // phase 1 -> phase 2
const BUTTON_LABEL_COMPUTE  = 'Compute midpoint image'; // phase 2 -> phase 3
const BUTTON_LABEL_REFRESH  = 'Start over again';
const UPLOAD_PROMPT         = 'Replace this image';
const UPLOAD_DISABLED_TXT   = 'Replace this image';

const FREEZE_ERROR  = 'Cannot freeze a nonexistent camera frame.';
const PHASE_CLASSES = ['phase1', 'phase2', 'phase3'];

const D_WARP_FRAC_STEP = 0.05; // "d" means default value
const D_FRAME_COUNT    = 1.0 / D_WARP_FRAC_STEP;
const D_DELAY          = 50; // equivalent to 20fps
const D_FPS            = 1000.0 / D_DELAY;
const D_DISSOLVE_FRAC  = 0.5;
const D_WARP_FRAC      = 0.5;

const EASE_WF_STEPS  =
          Array.apply(null, Array(5)).map(function (_, i) { return 1.00 - 0.01 * i; })
  .concat(Array.apply(null, Array(5)).map(function (_, i) { return 0.95 - 0.02 * i; }))
  .concat(Array.apply(null, Array(5)).map(function (_, i) { return 0.87 - 0.03 * i; }))
  .concat(Array.apply(null, Array(5)).map(function (_, i) { return 0.75 - 0.05 * i; }))
  .concat(Array.apply(null, Array(5)).map(function (_, i) { return 0.50 - 0.05 * i; }))
  .concat(Array.apply(null, Array(5)).map(function (_, i) { return 0.27 - 0.03 * i; }))
  .concat(Array.apply(null, Array(5)).map(function (_, i) { return 0.13 - 0.02 * i; }))
  .concat(Array.apply(null, Array(5)).map(function (_, i) { return 0.04 - 0.01 * i; }));

const EASE_IDX_FINAL = EASE_WF_STEPS.length - 1;
const EASE_DELAY     = 30;

// Animal buttons / image paths
const ID_ANIMALS = {
  'lion-btn'     : ['http://i.imgur.com/m3q1BuQ.jpg', 'data/lion.min.json'     ],
  'dog-btn'      : ['http://i.imgur.com/tRhcfFR.jpg', 'data/dog.min.json'      ],
  'chameleon-btn': ['http://i.imgur.com/SOQTdc0.jpg', 'data/chameleon.min.json'],
  'fish-btn'     : ['http://i.imgur.com/dH8EReB.jpg', 'data/fish.min.json'     ],
  'rabbit-btn'   : ['http://i.imgur.com/tW6kjMQ.jpg', 'data/rabbit.min.json'   ]
}

// Keycodes (because who actually remembers all the numbers)
const BACKSPACE = 8;
const SHIFT     = 16;
const DELETE    = 46;
const ENTER     = 13;
const SPACE     = 32;
const BACKSLASH = 220;
const NP_ZERO   = 96;
const NP_NINE   = 105;
const ZERO      = 48;
const NINE      = 57;
const L_ARROW   = 37;
const R_ARROW   = 39;
const PERIOD    = 190;

// Contrasting markers
const MARKER_PREFIX = 'images/markers/stroud_';
const MARKER_CYCLE  = ['gold.png', 'blue.png', 'green.png',
                       'red.png', 'purple.png', 'white.png'];

// Contrasting colors
const COLORS_HEX = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00',
                    '#ffde00', '#a65628', '#f781bf', '#999999'];
const COLORS_RGB = [[228, 26, 28], [55, 126, 184], [77, 175, 74],
                    [152, 78, 163], [255, 127, 0], [255, 222, 0],
                    [166, 86, 40], [247, 129, 191], [153, 153, 153]];

// Information for semiautomatic detection
const TRACKR_TIMEOUT   = 10000; // ms
const CLMTRACKR_SINGLE = [4, 10, 26, 31, 46, 48];
const CLMTRACKR_GROUPS = [
  [6, 7, 8], [23, 24, 25], [28, 29, 30], [36, 37, 38], [50, 52, 54, 44]];
const PATH_JSON_TO     = 'data/lion.min.json'; // leave blank if nonexistent
const CALIBRATION      = false; // true if setting points for a new dst image
const CURVE_COLOR      = '#7fff00';
const TENSION          = 0.8; // higher if anxious
const D_PTS_FILEPATH   = 'data/default.min.json';
const AUTO_ENABLED     = false;

// Animation parameters
const NUM_WORKERS = 2;
const GIF_QUALITY = 19; // lower means higher quality

// For debugging aid
const SHOW_OUTPUT_TRIANGULATION = false;
const WARP_SINGLE = -1; // -1, 0, or, 1
const USE_NEAREST = false;

///

var currMarkerId = 0;
var points = {};
var added = []; // track the history of point additions
var canvas;
var midpoints, triangles; // to be filled in after triangulation

var bigGreenButton;
var cropper;
var currentCropId; // ID of image currently being cropped
var gifCreated    = false;
var warpFracStep  = D_WARP_FRAC_STEP;
var delay         = D_DELAY;
var dissolveFrac0 = D_DISSOLVE_FRAC;
var dissolveFrac1 = D_DISSOLVE_FRAC;
var warpFrac      = D_WARP_FRAC;
var ease          = false;

var cameraStream;
var cameraOn = false;

var relevMarkerNo, relevId, relevPos, relevWidth, relevHeight, relevCtx;
var allGroups   = []; // curve adjustment
var sdRun       = 0;  // number of times semiautomatic detection has been run
var inv         = {}; // marker ID # --> index in respective `points` array
var markerMagic = 0;

var Mode = Object.freeze({'SEMIAUTO': 'semiautomatic', 'MANUAL': 'manual', 'CALI': 'calibration'});
var selectionMode = (typeof PATH_JSON_TO == 'undefined') ? Mode.MANUAL : Mode.SEMIAUTO;
var prevSelectionMode;
var alock = false; // makeshift lock on switching animals

var defaultPoints = [];
var width, height, currPos, fromData, toData;

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
    document.body.appendChild(createMarker('marker' + currMarkerId, DEFAULT_MARKER_SRC));
    $('#marker' + currMarkerId).css('left', posX - 5).css('top', posY - 5).show();
    ++currMarkerId;
    
    posX -= imgPos[0];
    posY -= imgPos[1];
    
    // Save the local coordinates in a list of points
    logPoint([posX, posY], id);
  };
  
  return getCoordinates;
}

/*
 * Adds VAL to the array at DICT[KEY].
 * If the aforementioned array doesn't exist, then this function will create it.
 */
function safeInsert(val, key, dict) {
  if (!(key in dict)) {
    dict[key] = [];
  }
  dict[key].push(val);
}

function logPoint(p, id, incognito=false) {
  safeInsert(p, id, points);
  if (!incognito) {
    added.push(id); // 'cause we just added a point to the ID array
  }
}

/*
 * Draw markers for an already-existent array of points.
 */
function drawMarkers(id, imgPos, alternating=false, updateInv=false) {
  var relevantPoints = points[id];
  var numPoints = relevantPoints.length;
  var pt;
  
  var mi = 0, markerSrc = DEFAULT_MARKER_SRC;
  for (var i = 0; i < numPoints; ++i) {
    if (alternating) {
      markerSrc = MARKER_PREFIX + MARKER_CYCLE[mi];
      mi = (mi + 1) % MARKER_CYCLE.length;
    }
    
    pt = relevantPoints[i];
    document.body.appendChild(createMarker('marker' + currMarkerId, markerSrc));
    $('#marker' + currMarkerId).css('left', pt[0] + imgPos[0] - 5)
                               .css('top',  pt[1] + imgPos[1] - 5).show();
    if (updateInv) {
      inv[currMarkerId] = i;
    }
    ++currMarkerId;
  }
}

/*
 * Gets rid of all of the markers.
 */
function getRidOfAllOfTheMarkers() {
  while (currMarkerId > markerMagic) {
    var markerElt = document.getElementById('marker' + --currMarkerId);
    document.body.removeChild(markerElt);
  }
}

function createMarker(id, markerSrc) {
  var img = document.createElement('img');
  img.setAttribute('src', markerSrc);
  img.setAttribute('class', 'marker');
  img.setAttribute('id', id);
  return img;
}

function addCornerPoints(id) {
  var img = document.getElementById(id);
  points[id].push([0, 0]);
  points[id].push([0, img.clientHeight - 1]);
  points[id].push([img.clientWidth - 1, 0]);
  points[id].push([img.clientWidth - 1, img.clientHeight - 1]);
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
  
  var midpoints = getMidpoints(points[ID_IMG_FROM], points[ID_IMG_TO], warpFrac);
  var tri = Delaunay.triangulate(midpoints);
  
  renderTriangulation(tri, document.getElementById(ID_CVS_FROM), points[ID_IMG_FROM]);
  renderTriangulation(tri, document.getElementById(ID_CVS_TO),   points[ID_IMG_TO]);
  
  return [midpoints, tri];
}

function renderTriangulation(triangles, cvs, points) {
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
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0000ff';
    ctx.stroke();
  }

  cvs.style.display = 'inline'; // show canvas
}

/*
 * Expects a (2+) x N array of triangle points.
 * Primarily intended for debugging.
 */
function renderFilledTriangle(interiorPts, fillColor, canvasId) {
  var cvs = document.getElementById(canvasId);
  var ctx = cvs.getContext('2d');
  var imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
  var data = imgData.data;
  
  var xfl, yfl, idx;
  var numPts = interiorPts[0].length;
  for (var i = 0; i < numPts; ++i) {
    xfl = Math.floor(interiorPts[0][i]);
    yfl = Math.floor(interiorPts[1][i]);
    idx = (yfl * cvs.width + xfl) * 4;
    
    data[idx]     = fillColor[0];
    data[idx + 1] = fillColor[1];
    data[idx + 2] = fillColor[2];
    data[idx + 3] = 255;
  }
  
  ctx.putImageData(imgData, 0, 0);
}

/*
 * Primarily intended for debugging.
 */
function replaceImageData(data, canvasId) {
  var cvs = document.getElementById(canvasId);
  var ctx = cvs.getContext('2d');
  var imgData = ctx.getImageData(0, 0, cvs.width, cvs.height);
  imgData.data.set(new Uint8ClampedArray(data));
  ctx.putImageData(imgData, 0, 0);
}

/*
 * Returns all of the coordinates inside of the given triangle
 * as a horizontally-joined set of (x, y, 1) vectors –
 * meaning that if there are N such vectors, the returned array
 * would be of size 3 x N.
 *
 * Our triangle should consist of tangible points (as opposed to, say, indices).
 */
function triangleInterior(triangle) {
  var point0 = triangle[0], point1 = triangle[1], point2 = triangle[2];
  var minX = Math.min(point0[0], point1[0], point2[0]);
  var maxX = Math.max(point0[0], point1[0], point2[0]);
  var minY = Math.min(point0[1], point1[1], point2[1]);
  var maxY = Math.max(point0[1], point1[1], point2[1]);
  
  var interior = [];
  
  // Compile a list by filtering points from the bounding box
  for (var x = minX; x <= maxX; ++x) {
    for (var y = minY; y <= maxY; ++y) {
      if (Delaunay.contains(triangle, [x, y], 0.0)) {
        if (interior.length == 0) {
          interior = [[x], [y], [1]];
        } else {
          interior[0].push(x);
          interior[1].push(y);
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
  ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
  
  return ctx.getImageData(0, 0, img.width, img.height);
}

/*
 * Given six 2D points (three for each triangle), computes the matrix
 * for the affine transformation between triangle 1 and triangle 2.
 */
function computeAffine(X, Y) {
  return math.multiply(Y, math.inv(X));
}

/*
 * Bilinearly interpolates between the four neighbor values
 * associated with a particular RGB value in the image.
 */
function bilerp(x, y, img, width, height) {
  var tlVal, trVal, blVal, brVal;
  var topv, bottomv;
  var output = [];
  
  var yfl = Math.floor(y), xfl = Math.floor(x);
  var vdiff = y - yfl, hdiff = x - xfl;
  var tlIdx, trIdx, blIdx, brIdx;
  var inc;
  
  tlIdx = ( yfl      * width + xfl    ) * 4;
  trIdx = ( yfl      * width + xfl + 1) * 4;
  blIdx = ((yfl + 1) * width + xfl    ) * 4;
  brIdx = ((yfl + 1) * width + xfl + 1) * 4;
  
  for (inc = 0; inc < 3; ++inc) {
    tlVal = img[tlIdx + inc];
    trVal = (xfl < width  - 1) ? img[trIdx + inc] : tlVal;
    blVal = (yfl < height - 1) ? img[blIdx + inc] : tlVal;
    brVal = (xfl < width  - 1 && yfl < height - 1) ? img[brIdx + inc] : tlVal;
    
    topv    = (1.0 - hdiff) * tlVal + hdiff * trVal;
    bottomv = (1.0 - hdiff) * blVal + hdiff * brVal;
    
    output.push((1.0 - vdiff) * topv + vdiff * bottomv);
  }
  
  return output;
}

/*
 * [Sort of] nearest-neighbor interpolation.
 * Primarily intended for debugging (used as an alternative to `bilerp`).
 */
function nearest(x, y, img, width, height) {
  var xfl = Math.floor(x), yfl = Math.floor(y);
  var idx = (yfl * width + xfl) * 4;
  return [img[idx], img[idx + 1], img[idx + 2]];
}

/*
 * Sets the specified pixel's value to the weighted average of the two passed-in colors.
 * The weights are given by the T0 and T1 parameters.
 */
function colorPixel(data, idx, src0Color, src1Color, t0, t1) {
  if (WARP_SINGLE >= 0) {
    data[idx]     = !WARP_SINGLE ? src0Color[0] : src1Color[0];
    data[idx + 1] = !WARP_SINGLE ? src0Color[1] : src1Color[1];
    data[idx + 2] = !WARP_SINGLE ? src0Color[2] : src1Color[2];
  } else {
    data[idx]     = (src0Color[0] * t0 + src1Color[0] * t1).clip(0, 255);
    data[idx + 1] = (src0Color[1] * t0 + src1Color[1] * t1).clip(0, 255);
    data[idx + 2] = (src0Color[2] * t0 + src1Color[2] * t1).clip(0, 255);
  }
  data[idx + 3] = 255;
}

/*
 * Determines the midpoint image, then renders it on CVS (a canvas).
 */
function computeMidpointImage(midpoints, triangles, fromPts, toPts, cvs, df0, df1) {
  var idx0, idx1, idx2;
  var fromTri, toTri, targetTri;
  var X0, X1, Y, A0, A1;
  var midCoords, numInterior;
  var warpedSrc0, warpedSrc1;
  var src0X, src0Y, src1X, src1Y, xfl, yfl, src0Color, src1Color, finalIdx;
  
  var sample = USE_NEAREST ? nearest : bilerp;
  var finalData = new Array(width * height * 4).fill(0);
  
  var numTriangles = triangles.length;
  var targetTriangles = [];
  var transfs = [];
  
  var i, j;
  for (i = 0; i < numTriangles; i += 3) {
    idx0 = triangles[i], idx1 = triangles[i + 1], idx2 = triangles[i + 2];
    fromTri = [fromPts[idx0], fromPts[idx1], fromPts[idx2]];
    toTri = [toPts[idx0], toPts[idx1], toPts[idx2]];
    targetTri = [midpoints[idx0], midpoints[idx1], midpoints[idx2]];
    targetTriangles.push(targetTri);
    
    X0 = math.transpose(math.resize(fromTri, [3, 3], 1));
    X1 = math.transpose(math.resize(toTri, [3, 3], 1));
    Y = math.transpose(math.resize(targetTri, [3, 3], 1));
    
    A0 = computeAffine(Y, X0);
    A1 = computeAffine(Y, X1);
    transfs.push([A0, A1]);
    
    midCoords = triangleInterior(targetTri);
    warpedSrc0 = math.multiply(A0, midCoords);
    warpedSrc1 = math.multiply(A1, midCoords);
    
    numInterior = midCoords[0].length;
    for (j = 0; j < numInterior; ++j) {
      src0X = warpedSrc0[0][j].clip(0, width  - 1);
      src0Y = warpedSrc0[1][j].clip(0, height - 1);
      src1X = warpedSrc1[0][j].clip(0, width  - 1);
      src1Y = warpedSrc1[1][j].clip(0, height - 1);
      
      src0Color = sample(src0X, src0Y, fromData, width, height);
      src1Color = sample(src1X, src1Y, toData,   width, height);
      
      xfl = Math.floor(midCoords[0][j]);
      yfl = Math.floor(midCoords[1][j]);
      finalIdx = (yfl * width + xfl) * 4;
      
      colorPixel(finalData, finalIdx, src0Color, src1Color, df0, df1);
    }
  }
  
  // Clean up holes
  var numPixels = width * height * 4;
  for (i = 3; i < numPixels; i += 4) {
    if (finalData[i] == 0) {
      xfl = Math.floor(i / 4) % width;
      yfl = Math.floor((i / 4) / width);
      
      for (j = 0; j < numTriangles; ++j) {
        targetTri = targetTriangles[j];
        if (Delaunay.contains(targetTri, [xfl, yfl], 0.05)) {
          warpedSrc0 = math.multiply(transfs[j][0], [[xfl], [yfl], [1]]);
          warpedSrc1 = math.multiply(transfs[j][1], [[xfl], [yfl], [1]]);
          
          src0X = warpedSrc0[0][0].clip(0, width  - 1);
          src0Y = warpedSrc0[1][0].clip(0, height - 1);
          src1X = warpedSrc1[0][0].clip(0, width  - 1);
          src1Y = warpedSrc1[1][0].clip(0, height - 1);
          
          src0Color = sample(src0X, src0Y, fromData, width, height);
          src1Color = sample(src1X, src1Y, toData,   width, height);
          
          colorPixel(finalData, i - 3, src0Color, src1Color, df0, df1);
          break;
        }
      }
    }
  }

  // Turn final image pixels into an actual image
  fillOutputCanvas(finalData, cvs, width, height);
  if (SHOW_OUTPUT_TRIANGULATION) {
    renderTriangulation(triangles, cvs, midpoints);
  }
}

function setNextFrame(gif, frame, fromPts, toPts, t) {
  var mi = getMidpoints(fromPts, toPts, t);
  computeMidpointImage(mi, triangles, fromPts, toPts, frame, t, 1.0 - t);
  gif.addFrame(frame, {copy: true, delay: ease ? EASE_DELAY : delay});
}

function createAnimatedSequence(fromPts, toPts, step) {
  var animatedSequence = new GIF({
    workers: NUM_WORKERS,
    quality: GIF_QUALITY,
    width: width,
    height: height
  });

  var bar   = document.getElementById(ID_PROGRESS_BAR);
  var label = document.getElementById(ID_PROGRESS_LABEL);
  var frame = document.createElement('canvas');

  function setForwardFrames(t, easeIdx=0) {
    if (ease) t = EASE_WF_STEPS[easeIdx];
    setNextFrame(animatedSequence, frame, fromPts, toPts, t);
    bar.style.width = Math.floor((1.0 - t) * 47.5) + '%';
    label.innerHTML = bar.style.width;
    if ((!ease && t > 0.0) || (ease && easeIdx < EASE_IDX_FINAL)) {
      t = Math.max(t - step, 0.0);
      setTimeout(setForwardFrames.bind(null, t, easeIdx + 1), 0);
    } else {
      setBackwardFrames(0.0);
    }
  }
  function setBackwardFrames(t, easeIdx=EASE_IDX_FINAL) {
    if (ease) t = EASE_WF_STEPS[easeIdx];
    setNextFrame(animatedSequence, frame, fromPts, toPts, t);
    bar.style.width = Math.floor(47.5 + t * 47.5) + '%';
    label.innerHTML = bar.style.width;
    if ((!ease && t < 1.0) || (ease && easeIdx > 0)) {
      t = Math.min(t + step, 1.0);
      setTimeout(setBackwardFrames.bind(null, t, easeIdx - 1), 0);
    } else {
      animatedSequence.render();
    }
  }

  animatedSequence.on('finished', function(blob) {
    bar.style.width = '100%';
    label.innerHTML = bar.style.width;

    var url = URL.createObjectURL(blob);
    document.getElementById(ID_GIF_DL_LINK).href = url;
    $('#' + ID_GIF_DL_LINK).removeClass('green-disabled');
    document.getElementById(ID_GIF_OUTPUT).src   = url;

    if (bigGreenButton.innerText == BUTTON_LABEL_COMPUTE)
      window.open(url);
  });
  setForwardFrames(1.0); // set the ball rolling
}

function fillOutputCanvas(finalData, cvs, width, height) {
  cvs.width = width;
  cvs.height = height;
  
  var ctx = cvs.getContext('2d');
  var imgData = ctx.createImageData(width, height);
  imgData.data.set(new Uint8ClampedArray(finalData));
  ctx.putImageData(imgData, 0, 0);
  cvs.style.display = 'inline'; // show canvas
}

function overlay(elemId, imageId) {
  var elem   = document.getElementById(elemId);
  var img    = document.getElementById(imageId);
  var imgPos = findPosition(img);
  
  elem.style.position = 'absolute';
  elem.style.left     = imgPos[0] + 'px';
  elem.style.top      = imgPos[1] + 'px';
  elem.style.width    = img.clientWidth  + 'px';
  elem.style.height   = img.clientHeight + 'px';
  
  elem.width  = img.clientWidth;
  elem.height = img.clientHeight;
}

function finalizePointSelection() {
  disableUploads();
  var npFrom = (points[ID_IMG_FROM] || []).length,
      npTo   = (points[ID_IMG_TO]   || []).length;
  if (npFrom == 0 || npTo == 0) {
    alert('You must select at least one point in each image!');
  } else if (npFrom != npTo) {
    alert('You must select the same number of points in each image!');
  } else {
    $('#' + ID_IMG_FROM).off('click');
    $('#' + ID_IMG_TO).off('click');
    
    fromData = getImageData(document.getElementById(ID_IMG_FROM)).data;
    toData = getImageData(document.getElementById(ID_IMG_TO)).data;
  
    var mtData = runTriangulation();
    midpoints = mtData[0], triangles = mtData[1];
    bigGreenButton.innerText = BUTTON_LABEL_COMPUTE;
    return true; // success
  }
  return false; // failure
}

function startClmtrackr(img) {
  // Virtual canvas used during tracking
  var cvs = document.createElement('canvas');
  var ctx = cvs.getContext('2d');
  cvs.width = img.clientWidth, cvs.height = img.clientHeight;
  ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
  
  var ctracker = new clm.tracker({stopOnConvergence: true});
  ctracker.init(pModel);
  ctracker.start(cvs);
  
  return ctracker;
}

function clmtrackrTimeout(ctracker, onConvergence, timeout, info) {
  setTimeout(function() { // just in case the tracker never converges
    ctracker.stop();
    if (!info.hasConverged) {
      onConvergence(); // use whatever points we've got
    }
  }, timeout);
}

function automaticFeatureDetection(id) {
  var img = document.getElementById(id);
  var ctracker = startClmtrackr(img);

  var info = {hasConverged: false};
  var onConvergence = function(evt) {
    info.hasConverged = true;
    points[id] = ctracker.getCurrentPosition();
    if (!points[id]) points[id] = defaultPoints.slice();
    drawMarkers(id, findPosition(img));
    if (id == ID_IMG_FROM) {
      automaticFeatureDetection(ID_IMG_TO);
    } else if (id == ID_IMG_TO) {
      finalizePointSelection();
    }
    document.removeEventListener('clmtrackrConverged', onConvergence);
  };
  
  clmtrackrTimeout(ctracker, onConvergence, TRACKR_TIMEOUT, info);
  document.addEventListener('clmtrackrConverged', onConvergence, false);
}

/*
 * Loads initial positions for a selected group of meaningful features,
 * then allows the user to drag those positions around.
 */
function semiautomaticDetection(id, cfnZero, override=false) {
  if (sdRun < (CALIBRATION ? 2 : 1) || override) { // we can run this twice if we're calibrating
    if (sdRun < 1) {
      getRidOfAllOfTheMarkers();
    }
    
    var img = document.getElementById(id);
    var ctracker = startClmtrackr(img);
    var total = (id in points) ? points[id].length : 0;

    var i, j, clmPoints, groupSize;
    var info = {hasConverged: false};
    var onConvergence = function(evt) {
      info.hasConverged = true;
      positions = ctracker.getCurrentPosition(); // clmtrackr notation
      if (!positions) positions = defaultPoints.slice();
      for (i = 0; i < CLMTRACKR_SINGLE.length; ++i, ++total) {
        logPoint(positions[CLMTRACKR_SINGLE[i]], id, true);
      }
      for (i = 0; i < CLMTRACKR_GROUPS.length; ++i) {
        groupSize = CLMTRACKR_GROUPS[i].length;
        for (j = 0; j < groupSize; ++j, ++total) {
          logPoint(positions[CLMTRACKR_GROUPS[i][j]], id, true);
        }

        // Plot a curve through the last GROUP_SIZE points
        curveThrough(points[id].slice(total - groupSize, total), id);
        allGroups.push([total - groupSize, total]);
      }
      // Left side points
      logPoint([0.75 * positions[0][0], positions[0][1]], id, true); ++total;
      logPoint([0.75 * positions[0][0], positions[2][1]], id, true); ++total;
      // Right side points
      var rdx = 0.25 * (img.clientWidth - positions[14][0]);
      logPoint([rdx + positions[14][0], positions[14][1]], id, true); ++total;
      logPoint([rdx + positions[14][0], positions[12][1]], id, true); ++total;
      // Top points
      logPoint([positions[19][0], 0.30 * positions[19][1]], id, true);
      logPoint([positions[22][0], 0.25 * positions[22][1]], id, true);
      logPoint([positions[18][0], 0.25 * positions[18][1]], id, true);
      logPoint([positions[15][0], 0.30 * positions[15][1]], id, true);

      drawMarkers(id, findPosition(img), true, true);
      if (typeof cfnZero !== 'undefined' && cfnZero != null) { cfnZero(); }
      document.removeEventListener('clmtrackrConverged', onConvergence);
    }
    clmtrackrTimeout(ctracker, onConvergence, TRACKR_TIMEOUT, info);
    document.addEventListener('clmtrackrConverged', onConvergence, false);
    ++sdRun;
  }
}

function serializePoints(id) {
  var obj = {
    'points': points[id]
  };
  var jsonData = JSON.stringify(obj);
  var url = 'data:text/json;charset=utf8,' + encodeURIComponent(jsonData);
  window.open(url, '_blank');
  window.focus();
}

function importPoints(id, filepath) {
  $.getJSON(filepath, function(data) {
    points[id] = unnormalize(data.points);
    var imgPos = findPosition(document.getElementById(id));
    drawMarkers(id, [imgPos[0], imgPos[1]], true);
    markerMagic = currMarkerId;
  });
}

function loadDefaultPoints() {
  $.getJSON(D_PTS_FILEPATH, function(data) {
    defaultPoints = unnormalize(data.points);
  });
}

/*
 * For administrative use only.
 */
function normalize(filepath) {
  $.getJSON(filepath, function(data) {
    points['normalized'] = data.points.map(function(elt) {
      return [elt[0] / width, elt[1] / height];
    });
    serializePoints('normalized');
  });
}

function unnormalize(points) {
  return points.map(elt => [elt[0] * width, elt[1] * height]);
}

/*
 * Draws a smooth curve through CPOINTS on the canvas implied by ID.
 */
function curveThrough(cpoints, id) {
  var canvasId = (id == ID_IMG_FROM) ? ID_CVS_FROM : ID_CVS_TO;
  var cvs = document.getElementById(canvasId);
  var ctx = cvs.getContext('2d');

  ctx.drawCurve([].concat.apply([], cpoints), TENSION);
  ctx.strokeStyle = CURVE_COLOR;
  ctx.stroke();
  cvs.style.display = 'inline'; // make sure the canvas is visible
}

function drawGroupCurves(groups, id) {
  if (id in points) {
    var i, g;
    for (i = 0; i < groups.length; ++i) {
      g = groups[i];
      curveThrough(points[id].slice(g[0], g[1]), id);
    }
  }
}

function launchMarkerAdjustment(evt) {
  if (!evt || bigGreenButton.innerText != BUTTON_LABEL_FINALIZE) {
    var evt = window.event;
  }
  var target = evt.target || evt.srcElement;
  if (!target.id.startsWith('marker')) {
    return;
  }
  
  var canvasId = (relevId == ID_IMG_FROM) ? ID_CVS_FROM : ID_CVS_TO;
  relevCtx = document.getElementById(canvasId).getContext('2d');

  var relevImg = document.getElementById(relevId);
  relevWidth  = relevImg.clientWidth;
  relevHeight = relevImg.clientHeight;
  relevMarkerNo = parseInt(target.id.match(/\d+$/)[0], 10);
  relevPos = findPosition(relevImg);
  document.addEventListener('mousemove', doMarkerAdjustment);
  return false;
}

function doMarkerAdjustment(evt) {
  if (!evt) {
    var evt = window.event;
  }
  var target = evt.target || evt.srcElement;
  var inImgCoords = [
    evt.pageX - relevPos[0],
    evt.pageY - relevPos[1]
  ];
  
  if (inImgCoords[0] >= 0 && inImgCoords[0] < relevWidth &&
      inImgCoords[1] >= 0 && inImgCoords[1] < relevHeight) {
    $('#marker' + relevMarkerNo).css('left', evt.pageX - 5).css('top', evt.pageY - 5);
    points[relevId][inv[relevMarkerNo]] = inImgCoords;
    relevCtx.clearRect(0, 0, relevWidth, relevHeight);
    drawGroupCurves(allGroups, relevId);
  }
  return false;
}

function finishMarkerAdjustment(evt) {
  document.removeEventListener('mousemove', doMarkerAdjustment);
}

function downloadImage(canvasId) {
  var cvs = document.getElementById(canvasId);
  var image = cvs.toDataURL('image/png').replace('image/png', 'image/octet-stream');
  window.location.href = image;
}

/*
 * Starts the user's camera if it is currently off.
 * Stops  the user's camera if it is currently on.
 *
 * Code reference: https://github.com/eduardolundgren/tracking.js
 */
function toggleCamera() {
  var camera        = document.getElementById(ID_CAMERA);
  var cameraWrapper = document.getElementById(ID_CAMERA_WRAPPER);
  if (cameraOn) {
    camera.pause(); camera.src = ''; cameraStream.getTracks()[0].stop();
    camera.style.display = 'none';
    cameraWrapper.style.display = 'none';
    bigGreenButton.innerText = BUTTON_LABEL_FINALIZE;
  } else {
    window.navigator.getUserMedia = (window.navigator.getUserMedia ||
        window.navigator.webkitGetUserMedia ||
        window.navigator.mozGetUserMedia || window.navigator.msGetUserMedia);

    // Note that the following function requires HTTPS in Chrome
    window.navigator.getUserMedia({
      video: {
        width:  camera.width,
        height: camera.height
      },
      audio: false
    }, function(stream) {
      cameraStream = stream;
      try {
        camera.src = window.URL.createObjectURL(stream);
      } catch (err) {
        camera.src = stream;
      }
    }, function() {
      throw Error('Cannot capture user camera.');
    });

    camera.style.display = 'inline';
    cameraWrapper.style.display = 'block';
    disableUploads();
    bigGreenButton.innerText = BUTTON_LABEL_FREEZE;
  }
  cameraOn = !cameraOn;
}

function freezeCameraFrame(imgId) {
  // Assert that the camera is actually on
  if (!cameraOn) {
    if (typeof Error !== 'undefined') {
      throw new Error(FREEZE_ERROR)
    }
    throw FREEZE_ERROR;
  }

  // Draw the current camera frame on the image with the given ID
  var img    = document.getElementById(imgId);
  var camera = document.getElementById(ID_CAMERA);
  var vwidth = camera.videoWidth, vheight = camera.videoHeight;
  var width  = img.clientWidth,   height  = img.clientHeight;

  var wDisp = (width  <= vwidth)  ? 1 : width / vwidth;
  var hDisp = (height <= vheight) ? 1 : height / vheight;
  var disp  = (wDisp > hDisp) ? wDisp : hDisp;
  vwidth *= disp; vheight *= disp;

  var sx = (vwidth  - width)  / 2;
  var sy = (vheight - height) / 2;

  var cvs = document.createElement('canvas');
  cvs.width = width; cvs.height = height;
  cvs.getContext('2d').drawImage(camera, sx, sy, width, height, 0, 0, width * disp, height * disp);
  img.src = cvs.toDataURL('image/png');

  // Turn off the camera
  toggleCamera();
}

function disableSingle(inputId, buttonId) {
  document.getElementById(inputId).disabled = true;
  $('#' + buttonId).addClass('upload-disabled');
  $('#' + buttonId).text(UPLOAD_DISABLED_TXT);
}

function disableUploads() {
  document.getElementById(ID_INPUT_UPLOAD_FROM).disabled = true;
  document.getElementById(ID_INPUT_UPLOAD_TO).disabled   = true;
  $('.upload').addClass('upload-disabled');
  $('.upload').text(UPLOAD_DISABLED_TXT);
}

function reenableUploads() {
  $('.upload').removeClass('upload-disabled');
  $('.upload').text(UPLOAD_PROMPT);
  document.getElementById(ID_INPUT_UPLOAD_FROM).disabled = false;
  document.getElementById(ID_INPUT_UPLOAD_TO).disabled   = false;
}

function hideCanvasesAndMarkers() {
  document.getElementById(ID_CVS_FROM).style.display = 'none';
  document.getElementById(ID_CVS_TO).style.display   = 'none';

  for (var i = currMarkerId - 1; i >= markerMagic; --i) {
    document.getElementById('marker' + i).style.display = 'none';
  }
}

function showCanvasesAndMarkers() {
  document.getElementById(ID_CVS_FROM).style.display = 'inline';
  document.getElementById(ID_CVS_TO).style.display   = 'inline';

  for (var i = currMarkerId - 1; i >= markerMagic; --i) {
    document.getElementById('marker' + i).style.display = 'inline';
  }
}

function handleImageUpload(imgId, inputId) {
  currentCropId = imgId;
  var img = document.getElementById(imgId);
  var file = document.getElementById(inputId).files[0];
  var reader = new FileReader();

  reader.onloadend = function() {
    if (selectionMode == Mode.SEMIAUTO)
      hideCanvasesAndMarkers();
    img.style.display = 'none';
    img.src = reader.result;
    
    var otherId = (imgId == ID_IMG_FROM) ? ID_IMG_TO : ID_IMG_FROM;
    var otherImg = document.getElementById(otherId);
    var oc = document.getElementById(ID_OUTER_CONTAINER + '-' + imgId);
    oc.style.width  = otherImg.clientWidth  + 'px';
    oc.style.height = otherImg.clientHeight + 'px';
    cropper = new Cropper(img, {
      cropBoxResizable: false,
      aspectRatio: otherImg.clientWidth / otherImg.clientHeight,
      ready: function() {
        this.cropper.setCropBoxData({
          left: 0,
          top: 0,
          width: otherImg.clientWidth,
          height: otherImg.clientHeight
        });
        img.style.display = 'inline';
      }
    });
    
    // Disable both upload buttons
    disableUploads();
    bigGreenButton.innerText = BUTTON_LABEL_CROP;
  }

  if (file) {
    reader.readAsDataURL(file);
  } else {
    img.src = '';
  }
}

function configureInputs() {
  // Number of frames <-> warp fraction increment
  $('#' + ID_NUMFRAMES_RANGE).on('input', function() { warpFracStep = 1.0 / this.value; });
  // Frames per second <-> frame delay
  $('#' + ID_FPS_RANGE).on('input', function() { delay = 1000.0 / this.value; });
  // Zeroth image dissolve fraction
  $('#' + ID_DF0_RANGE).on('input', function() { dissolveFrac0 = this.value / 100.0; });
  // First image dissolve fraction
  $('#' + ID_DF1_RANGE).on('input', function() { dissolveFrac1 = this.value / 100.0; });
  // Warp fraction (t)
  $('#' + ID_WF_RANGE ).on('input', function() { warpFrac = this.value / 100.0; });
  // Ease
  $('#' + ID_EASE).change(function() { ease = this.checked; });

  // Buttons
  $('#' + ID_MANUAL_BTN).click(function(evt) { toManualSelection(); });
  $('#' + ID_GIF_BTN).click(function(evt) { tryCreateGif(); });
  $('#' + ID_CAMERA_BTN).click(function(evt) { tryToggleCamera(); });

  // Animal selection
  var makeTrySwitchAnimals = function(animalConfig) {
    return function(evt) { trySwitchAnimals(ID_IMG_TO, animalConfig); }
  }
  for (var btnId in ID_ANIMALS) {
    $('#' + btnId).click(makeTrySwitchAnimals(ID_ANIMALS[btnId]));
  }
}

function clearCanvas(canvasId, hide=false) {
  var cvs = document.getElementById(canvasId);
  cvs.getContext('2d').clearRect(0, 0, cvs.width, cvs.height);
  if (hide) cvs.style.display = 'none';
}

function toManualSelection() {
  if (bigGreenButton.innerText == BUTTON_LABEL_FINALIZE && selectionMode != Mode.MANUAL) {
    // Clear canvases of present detritus, delete markers
    clearCanvas(ID_CVS_FROM, true);
    clearCanvas(ID_CVS_TO,   true);
    markerMagic = 0; getRidOfAllOfTheMarkers();

    // Remove all points
    points = {}; added = [];

    $('#' + ID_IMG_FROM).click(makeGetCoordinates(ID_IMG_FROM));
    $('#' + ID_IMG_TO).click(makeGetCoordinates(ID_IMG_TO));

    document.getElementById(ID_INPUT_UPLOAD_TO).addEventListener('change', function() {
      handleImageUpload(ID_IMG_TO, ID_INPUT_UPLOAD_TO);
    }, true);

    selectionMode = Mode.MANUAL;
    $('#' + ID_MANUAL_BTN).addClass('purple-disabled');
  }
}

function tryCreateGif() {
  if (bigGreenButton.innerText == BUTTON_LABEL_FINALIZE) {
    finalizePointSelection();
  }
  if ((bigGreenButton.innerText == BUTTON_LABEL_COMPUTE  ||
       bigGreenButton.innerText == BUTTON_LABEL_REFRESH) && !gifCreated) {
    gifCreated = true;
    createAnimatedSequence(points[ID_IMG_FROM], points[ID_IMG_TO], warpFracStep);
    $('#' + ID_GIF_BTN).addClass('green-disabled');
  }
}

function tryToggleCamera() {
  if (bigGreenButton.innerText == BUTTON_LABEL_FREEZE ||
      bigGreenButton.innerText == BUTTON_LABEL_FINALIZE) {
    toggleCamera();
  }
}

function trySwitchAnimals(imgId, animalConfig) {
  if (bigGreenButton.innerText == BUTTON_LABEL_FINALIZE &&
      selectionMode == Mode.SEMIAUTO && !alock) {
    alock = true;
    var otherId = (imgId == ID_IMG_FROM) ? ID_IMG_TO : ID_IMG_FROM;

    // Get rid of ("refresh") stuff
    clearCanvas(ID_CVS_FROM);
    clearCanvas(ID_CVS_TO);
    markerMagic = 0; getRidOfAllOfTheMarkers();
    points = {}; added = []; allGroups = [];

    document.getElementById(imgId).src = animalConfig[0];
    if (!CALIBRATION) {
      importPoints(imgId, animalConfig[1]);
    }

    // Re-run semiautomatic detection
    semiautomaticDetection(otherId, function() {
      drawGroupCurves(allGroups, imgId);
      alock = false;
    }, true);
  }
}

function setPhase(phase) {
  for (var i = 0; i < phase - 1; ++i) {
    $('.' + PHASE_CLASSES[i]).hide();
  }
  $('.' + PHASE_CLASSES[phase - 1]).show();
}

/*
 * For administrative use only.
 */
function _startCalibration() {
  prevSelectionMode = selectionMode;
  selectionMode = Mode.CALI;

  relevId = ID_IMG_TO;
  semiautomaticDetection(ID_IMG_TO, null, true);
}

function lockDimensions(section) {
  section.style.width  = section.clientWidth  + 'px';
  section.style.height = section.clientHeight + 'px';
}

function setupReminders() {
  var fromReminder = document.getElementById(ID_FROM_REMINDER);
  fromReminder.src = document.getElementById(ID_IMG_FROM).src;
  var toReminder   = document.getElementById(ID_TO_REMINDER);
  toReminder.src   = document.getElementById(ID_IMG_TO).src;
}

$(window).on("load", function() {
  loadDefaultPoints(); // you never know when these might come in handy

  // Set up the points for the destination image
  if (typeof PATH_JSON_TO != 'undefined') {
    if (!CALIBRATION) {
      importPoints(ID_IMG_TO, PATH_JSON_TO); // this will draw the markers too
    }
    semiautomaticDetection(ID_IMG_FROM, function() { // obv we have to go all the way
      drawGroupCurves(allGroups, ID_IMG_TO);
      $('#' + ID_MANUAL_BTN).removeClass('purple-disabled');
    });
  } else {
    // Point selection click handler(s)
    $('#' + ID_IMG_FROM).click(makeGetCoordinates(ID_IMG_FROM));
    $('#' + ID_IMG_TO).click(makeGetCoordinates(ID_IMG_TO));
  }
  
  // "Big green button" handler
  bigGreenButton = document.getElementById(ID_BIG_GREEN_BTN);
  $('#' + ID_BIG_GREEN_BTN).click(function(evt) {
    if (this.innerText == BUTTON_LABEL_CROP) {
      var otherId = (currentCropId == ID_IMG_FROM) ? ID_IMG_TO : ID_IMG_FROM;
      var otherImg = document.getElementById(otherId);
      var croppedCvs = cropper.getCroppedCanvas({
        width: otherImg.clientWidth, // unfortunate amount of downsampling on some images
        height: otherImg.clientHeight
      });
      cropper.destroy();
      var img = document.getElementById(currentCropId);
      img.src = croppedCvs.toDataURL();
      reenableUploads();
      if (selectionMode == Mode.SEMIAUTO)
        showCanvasesAndMarkers();
      this.innerText = BUTTON_LABEL_FINALIZE;
    } else if (this.innerText == BUTTON_LABEL_FREEZE) {
      freezeCameraFrame(ID_IMG_FROM);
      this.innerText = BUTTON_LABEL_FINALIZE;
    } else if (this.innerText == BUTTON_LABEL_FINALIZE) {
      if (finalizePointSelection()) {
        setPhase(2);
      }
    } else if (this.innerText == BUTTON_LABEL_COMPUTE) {
      var canvasTo = document.getElementById(ID_CVS_OUT);
      computeMidpointImage(midpoints, triangles, points[ID_IMG_FROM],
          points[ID_IMG_TO], canvasTo, dissolveFrac0, dissolveFrac1);
      this.innerText = BUTTON_LABEL_REFRESH;
      document.getElementById(ID_IMG_DL_LINK).href = canvasTo.toDataURL('image/png');
      markerMagic = 0; getRidOfAllOfTheMarkers();
      setPhase(3);
      setupReminders();
      window.onresize = null;
    } else if (this.innerText == BUTTON_LABEL_REFRESH) {
      window.location.reload(false);
    }
  });
  
  // Canvas setup
  overlay(ID_CVS_FROM, ID_IMG_FROM);
  overlay(ID_CVS_TO, ID_IMG_TO);
  
  // Video (camera) setup
  overlay(ID_CAMERA_WRAPPER, ID_IMG_FROM);
  
  // Image upload
  document.getElementById(ID_INPUT_UPLOAD_FROM).addEventListener('change', function() {
    handleImageUpload(ID_IMG_FROM, ID_INPUT_UPLOAD_FROM);
  }, true);
  if (typeof PATH_JSON_TO == 'undefined') {
    document.getElementById(ID_INPUT_UPLOAD_TO).addEventListener('change', function() {
      handleImageUpload(ID_IMG_TO, ID_INPUT_UPLOAD_TO);
    }, true);
  } else {
    disableSingle(ID_INPUT_UPLOAD_TO, ID_BUTTON_UPLOAD_TO);
  }

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
      case ENTER:
        if (selectionMode == Mode.CALI) {
          relevId = ID_IMG_FROM;
          serializePoints(ID_IMG_TO);
          selectionMode = prevSelectionMode;
        } else if (AUTO_ENABLED && bigGreenButton.innerText == BUTTON_LABEL_FINALIZE) {
          getRidOfAllOfTheMarkers();
          // Run automatic feature detection
          automaticFeatureDetection(ID_IMG_FROM);
        }
        break;
      case SPACE:
        tryToggleCamera();
        break;
      case BACKSLASH:
        tryCreateGif();
        break;
      case SHIFT:
        if (bigGreenButton.innerText == BUTTON_LABEL_FINALIZE) {
          semiautomaticDetection(ID_IMG_FROM);
        }
        break;
    }
  });
  
  // Draggable markers
  relevId = ID_IMG_FROM;
  document.onmousedown = launchMarkerAdjustment;
  document.onmouseup   = finishMarkerAdjustment;
  
  // Input setup
  configureInputs();

  // Information box
  $(document).on('click', '#' + ID_INFO_BTN, function() {
    new Custombox.modal({
      content: {
        effect: 'flash',
        target: '#' + ID_INFO_MODAL
      }
    }).open();
  });

  // Resize refresh
  var fromImg = document.getElementById(ID_IMG_FROM);
  width = fromImg.clientWidth, height = fromImg.clientHeight, currPos = findPosition(fromImg);
  window.onresize = function(evt) {
    var fromImg = document.getElementById(ID_IMG_FROM);
    var pos = findPosition(fromImg);
    if (fromImg.clientWidth !== width || fromImg.clientHeight !== height ||
        pos[0] !== currPos[0]         || pos[1] !== currPos[1]) {
      window.location.reload(false);
    }
  };

  // Lock the height of each section
  lockDimensions(document.getElementById(ID_INSTRUCTIONS));
  lockDimensions(document.getElementById(ID_IMAGES_OUTPUT));
});
