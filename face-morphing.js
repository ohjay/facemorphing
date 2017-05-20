/*
 * face-morphing.js
 * Owen Jow
 * 
 * A JavaScript module providing face morphing functionality.
 * Assumes that `tracking.js`, `delaunay`, and `PyExtJs` have been loaded.
 */

const BACKSPACE = 8;
const DELETE = 46;

///

var currMarkerId = 0;
var points = {};
var added = []; // track the history of point additions

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

$(document).ready(function() {
  // Point selection click handlers
  $('#from').click(makeGetCoordinates('from'));
  $('#to').click(makeGetCoordinates('to'));
  
  // "Finalize point selection" button handler
  $('#point-sel-btn').click(function(evt) {
    $('#from').off('click');
    $('#to').off('click');
  });
  
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
