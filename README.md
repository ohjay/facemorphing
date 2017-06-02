# Face Morphing

### Example site
#### To set the feature points for a destination image
- Go into `js/facemorphing.js` and set `CALIBRATION` to `true`.
- Open up the website.
- In the console, run
  ```javascript
  semiautomaticDetection(ID_IMG_TO); // now move the points around
  serializePoints(ID_IMG_TO); // save the file that opens
  ```
- Negate `CALIBRATION` and ensure that `PATH_JSON_TO` is set to your newly created JSON file.

That should be all you need!

### Miscellaneous notes
Fun fact: barring poor `clmtrackr` output, you can make somebody "fat" by running automatic feature detection on the default "from" image and then warping only the other guy's shape.
