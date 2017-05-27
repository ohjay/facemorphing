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

const ID_IMG_FROM = 'from';
const ID_IMG_TO = 'to';
const ID_CVS_FROM = 'canvas-from';
const ID_CVS_TO = 'canvas-to';
const ID_CVS_OUT = 'canvas-output';
const ID_INPUT_UPLOAD_FROM = 'upload-from';
const ID_INPUT_UPLOAD_TO = 'upload-to';
const ID_OUTER_CONTAINER = 'outer-container';

const MARKER_SRC = 'images/marker_gold.png';
const BUTTON_SET_CROP = 'Set source image crop';
const BUTTON_LABEL_FINALIZE = 'Finalize point selection';
const BUTTON_LABEL_COMPUTE = 'Compute midpoint image';
const BUTTON_LABEL_DOWNLOAD = 'Download output image';
const UPLOAD_PROMPT = 'Replace this image';
const UPLOAD_DISABLED_TXT = 'Replace this image';

// Keycodes (because who actually remembers all the numbers)
const BACKSPACE = 8;
const DELETE = 46;
const ENTER = 13;
const SPACE = 32;

// Contrasting colors
const COLORS_HEX = ['#e41a1c', '#377eb8', '#4daf4a', '#984ea3', '#ff7f00',
                    '#ffde00', '#a65628', '#f781bf', '#999999'];
const COLORS_RGB = [[228, 26, 28], [55, 126, 184], [77, 175, 74],
                    [152, 78, 163], [255, 127, 0], [255, 222, 0],
                    [166, 86, 40], [247, 129, 191], [153, 153, 153]];

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

var cameraStream;
var cameraOn = false;
var requestId; // for camera frames

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

/*
 * Draw markers for an already-existent array of points.
 */
function drawMarkers(id, imgPos) {
  var relevantPoints = points[id];
  var numPoints = relevantPoints.length;
  var pt;
  
  for (var i = 0; i < numPoints; ++i) {
    pt = relevantPoints[i];
    document.body.appendChild(createMarker('marker' + currMarkerId));
    $('#marker' + currMarkerId).css('left', pt[0] + imgPos[0])
                               .css('top', pt[1] + imgPos[1]).show();
    ++currMarkerId;
  }
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
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#0000ff';
    ctx.stroke();
  }
  
  $('#' + canvasId).show();
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
 * Sets the specified pixel's value to the average of the two passed-in colors.
 * (In the future, we may want to add an interpolation parameter to the mix.)
 */
function colorPixel(data, idx, src0Color, src1Color) {
  if (WARP_SINGLE >= 0) {
    data[idx]     = !WARP_SINGLE ? src0Color[0] : src1Color[0];
    data[idx + 1] = !WARP_SINGLE ? src0Color[1] : src1Color[1];
    data[idx + 2] = !WARP_SINGLE ? src0Color[2] : src1Color[2];
  } else {
    data[idx]     = math.mean(src0Color[0], src1Color[0]).clip(0, 255);
    data[idx + 1] = math.mean(src0Color[1], src1Color[1]).clip(0, 255);
    data[idx + 2] = math.mean(src0Color[2], src1Color[2]).clip(0, 255);
  }
  data[idx + 3] = 255;
}

function computeMidpointImage(midpoints, triangles, fromPts, toPts) {
  var idx0, idx1, idx2;
  var fromTri, toTri, targetTri;
  var X0, X1, Y, A0, A1;
  var midCoords, numInterior;
  var warpedSrc0, warpedSrc1;
  var src0X, src0Y, src1X, src1Y, xfl, yfl, src0Color, src1Color, finalIdx;
  
  var fromImg = document.getElementById(ID_IMG_FROM);
  var toImg = document.getElementById(ID_IMG_TO);
  var width = fromImg.clientWidth, height = fromImg.clientHeight;
  var sample = USE_NEAREST ? nearest : bilerp;
  
  var fromData = getImageData(fromImg).data;
  var toData = getImageData(toImg).data;
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
      
      colorPixel(finalData, finalIdx, src0Color, src1Color);
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
          
          colorPixel(finalData, i - 3, src0Color, src1Color);
          break;
        }
      }
    }
  }

  // Turn final image pixels into an actual image
  fillOutputCanvas(finalData, width, height);
  if (SHOW_OUTPUT_TRIANGULATION) {
    renderTriangulation(triangles, ID_CVS_OUT, midpoints);
  }
}

function fillOutputCanvas(finalData, width, height) {
  var cvs = document.getElementById(ID_CVS_OUT);
  cvs.width = width;
  cvs.height = height;
  
  var ctx = cvs.getContext('2d');
  var imgData = ctx.createImageData(width, height);
  imgData.data.set(new Uint8ClampedArray(finalData));
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

function finalizePointSelection() {
  var npFrom = (points[ID_IMG_FROM] || []).length,
      npTo   = (points[ID_IMG_TO]   || []).length;
  if (npFrom == 0 || npTo == 0) {
    alert('You must select at least one point in each image!');
  } else if (npFrom != npTo) {
    alert('You must select the same number of points in each image!');
  } else {
    $('#from').off('click');
    $('#to').off('click');
  
    var mtData = runTriangulation();
    midpoints = mtData[0], triangles = mtData[1];
    bigGreenButton.innerText = BUTTON_LABEL_COMPUTE;
  }
}

function automaticFeatureDetection(id) {
  var img = document.getElementById(id);
  
  // Virtual canvas used during tracking
  var cvs = document.createElement('canvas');
  var ctx = cvs.getContext('2d');
  cvs.width = img.clientWidth, cvs.height = img.clientHeight;
  ctx.drawImage(img, 0, 0, cvs.width, cvs.height);
  
  var ctracker = new clm.tracker({stopOnConvergence: true});
  ctracker.init(pModel);
  ctracker.start(cvs);
  
  var onConvergence = function(evt) {
    points[id] = ctracker.getCurrentPosition();
    drawMarkers(id, findPosition(img));
    if (id == ID_IMG_FROM) {
      automaticFeatureDetection(ID_IMG_TO);
    } else if (id == ID_IMG_TO) {
      finalizePointSelection();
    }
    document.removeEventListener('clmtrackrConverged', onConvergence);
  };
  
  document.addEventListener('clmtrackrConverged', onConvergence, false);
}

function downloadImage(canvasId) {
  var cvs = document.getElementById(canvasId);
  var image = cvs.toDataURL('image/png').replace('image/png', 'image/octet-stream');
  window.location.href = image;
}

/*
 * Starts the user's camera if it is currently off.
 * Stops the user's camera if it is currently on.
 *
 * Code reference: https://github.com/eduardolundgren/tracking.js
 */
function toggleCamera() {
  var camera = document.getElementById('camera');
  if (cameraOn) {
    camera.pause(); camera.src = '';
    cameraStream.getTracks()[0].stop();
    window.cancelAnimationFrame(requestId); // stop requesting frames
  } else {
    window.navigator.getUserMedia = (window.navigator.getUserMedia ||
        window.navigator.webkitGetUserMedia ||
        window.navigator.mozGetUserMedia || window.navigator.msGetUserMedia);

    // Note that the following function requires HTTPS in Chrome
    window.navigator.getUserMedia({
      video: true,
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

    var cvs = document.createElement('canvas');
    var ctx = cvs.getContext('2d');
    var width, height;

    var resizeCanvas_ = function() {
      width = camera.offsetWidth;
      height = camera.offsetHeight;
      cvs.width = width;
      cvs.height = height;
    };
    resizeCanvas_();
    camera.addEventListener('resize', resizeCanvas_);

    // Process individual frames
    var requestAnimationFrame_ = function() {
      requestId = window.requestAnimationFrame(function() {
        if (camera.readyState === camera.HAVE_ENOUGH_DATA) {
          try {
            ctx.drawImage(camera, 0, 0, width, height);
          } catch (err) {}
          var data = ctx.getImageData(0, 0, width, height).data;
          // Do something with the image data
        }
        requestAnimationFrame_();
      });
    };
    requestAnimationFrame_();
  }
  cameraOn = !cameraOn;
}

function handleImageUpload(imgId, inputId) {
  currentCropId = imgId;
  var img = document.getElementById(imgId);
  var file = document.getElementById(inputId).files[0];
  var reader = new FileReader();

  reader.onloadend = function() {
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
    document.getElementById(ID_INPUT_UPLOAD_FROM).disabled = true;
    document.getElementById(ID_INPUT_UPLOAD_TO).disabled   = true;
    $('.upload').addClass('upload-disabled');
    $('.upload').text(UPLOAD_DISABLED_TXT);
    bigGreenButton.innerText = BUTTON_SET_CROP;
  }

  if (file) {
    reader.readAsDataURL(file);
  } else {
    img.src = '';
  }
}

$(document).ready(function() {
  // Point selection click handlers
  $('#from').click(makeGetCoordinates(ID_IMG_FROM));
  $('#to').click(makeGetCoordinates(ID_IMG_TO));
  
  // "Big green button" handler
  bigGreenButton = document.getElementById('big-green-btn');
  $('#big-green-btn').click(function(evt) {
    if (this.innerText == BUTTON_SET_CROP) {
      var otherId = (currentCropId == ID_IMG_FROM) ? ID_IMG_TO : ID_IMG_FROM;
      var otherImg = document.getElementById(otherId);
      var croppedCvs = cropper.getCroppedCanvas({
        width: otherImg.clientWidth, // unfortunate amount of downsampling on some images
        height: otherImg.clientHeight
      });
      cropper.destroy();
      var img = document.getElementById(currentCropId);
      img.src = croppedCvs.toDataURL();
      $('.upload').removeClass('upload-disabled');
      $('.upload').text(UPLOAD_PROMPT);
      document.getElementById(ID_INPUT_UPLOAD_FROM).disabled = false;
      document.getElementById(ID_INPUT_UPLOAD_TO).disabled   = false;
      this.innerText = BUTTON_LABEL_FINALIZE;
    } else if (this.innerText == BUTTON_LABEL_FINALIZE) {
      finalizePointSelection();
    } else if (this.innerText == BUTTON_LABEL_COMPUTE) {
      computeMidpointImage(midpoints, triangles, points[ID_IMG_FROM], points[ID_IMG_TO]);
      this.innerText = BUTTON_LABEL_DOWNLOAD;
    } else if (this.innerText == BUTTON_LABEL_DOWNLOAD) {
      downloadImage(ID_CVS_OUT);
    }
  });
  
  // Canvas setup
  setupCanvas(ID_CVS_FROM, ID_IMG_FROM);
  setupCanvas(ID_CVS_TO, ID_IMG_TO);
  
  // Image upload
  document.getElementById(ID_INPUT_UPLOAD_FROM).addEventListener('change', function() {
    handleImageUpload(ID_IMG_FROM, ID_INPUT_UPLOAD_FROM);
  }, true);
  document.getElementById(ID_INPUT_UPLOAD_TO).addEventListener('change', function() {
    handleImageUpload(ID_IMG_TO, ID_INPUT_UPLOAD_TO);
  }, true);

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
        if (bigGreenButton.innerText == BUTTON_LABEL_FINALIZE) {
          // Run automatic feature detection
          automaticFeatureDetection(ID_IMG_FROM);
        }
        break;
      case SPACE:
        toggleCamera();
        break;
    }
  });
});
