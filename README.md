# Face Morphing
\* _Only tested in Chrome._

Note that the "main" file is `js/facemorphing.js`, which contains interface handling alongside the actual face morphing implementation. This implementation turns out to be rather brief on its own.

### Notes
#### To set the feature points for a destination image
- Go into `js/facemorphing.js` and set `CALIBRATION` to `true`.
- Open up the website.
- In the console: run `_startCalibration()`, then move the points around.
- Hit `ENTER` when finished, and save the file that opens.
- Negate `CALIBRATION` and ensure that `PATH_JSON_TO` is set to your newly created JSON file.

That should be all you need!

#### To enable destination image uploads
```javascript
document.getElementById(ID_INPUT_UPLOAD_TO).addEventListener('change', function() { handleImageUpload(ID_IMG_TO, ID_INPUT_UPLOAD_TO); }, true);
reenableSingle(ID_INPUT_UPLOAD_TO, ID_BUTTON_UPLOAD_TO);
```

#### To decide which image's points can be dragged around
```javascript
relevId = ID_IMG_[FROM, TO];
```

#### Obesity
Fun fact: barring poor `clmtrackr` output, you can give somebody a little extra weight by running automatic feature detection on the default "from" image and then warping only the other guy's shape.

### Animal image sources
Labeled by their filenames in [this directory](https://github.com/ohjay/facemorphing/tree/master/images/source).

<table>
  <tbody>
    <tr align="center">
      <td><a href="https://marketshaman.com/wp-content/uploads/bb-plugin/cache/arxpjnxq9lu-thomas-lefebvre-landscape.jpg"><code>bear</code></a></td>
      <td><a href="http://www.arkive.org/parsons-chameleon/calumma-parsonii/image-G15419.html"><code>chameleon</code></a></td>
      <td><a href="https://statesymbolsusa.org/sites/statesymbolsusa.org/files/primary-images/blackcappedchickadeebird.jpg"><code>chickadee</code></a></td>
      <td><a href="http://www.artnewsblog.com/dog-portrait-photography/"><code>dog_a</code></a></td>
      <td><a href="http://viralscape.com/animal-portraits/dog-portrait-13-2/"><code>dog_b</code></a></td>
      <td><a href="http://cdn7.viralscape.com/wp-content/uploads/2015/02/Dog-Portrait-10.jpg"><code>dog_c</code></a></td>
      <td><a href="http://cdn5.viralscape.com/wp-content/uploads/2015/02/Dog-Portrait-9.jpg"><code>dog_d</code></a></td>
      <td><a href="https://photogrist.com/klaus-dyba/"><code>dog_e</code></a></td>
      <td><a href="http://s.hswstatic.com/gif/animal-stereotype-orig.jpg"><code>dog_f</code></a></td>
      <td><a href="http://www.bupg.co.uk/nl0108.htm"><code>fish_a</code></a></td>
    </tr>
    <tr align="center">
      <td><a href="http://www.allenhost.com/gallery/v/Published/Bonaire+2010/Lizard+Fish+Portrait.jpg.html"><code>fish_b</code></a></td>
      <td><a href="https://images.fineartamerica.com/images-medium-large/portrait-of-a-garibaldi-fish-tim-laman.jpg"><code>fish_c</code></a></td>
      <td><a href="https://demo.chevereto.com/i/HaH"><code>fish_d</code></a></td>
      <td><a href="https://thumbs.dreamstime.com/x/portrait-live-fish-sea-japan-20522465.jpg)"><code>fish_e</code></a></td>
      <td><a href="http://www.paulwheelerphotography.com/photo_4007317.html"><code>iguana</code></a></td>
      <td><a href="http://animals.sandiegozoo.org/sites/default/files/2016-08/category-thumbnail-mammals_0.jpg"><code>panda</code></a></td>
      <td><a href="http://www.dailymail.co.uk/news/article-2802972/massages-rabbits-studies-sea-monkeys-swimming-patterns-watching-grass-grow-bizarre-projects-taxpayers-funding.html"><code>rabbit</code></a></td>
      <td><a href="http://www.lanlinglaurel.com/animal-images/4354655.html"><code>tiger</code></a></td>
      <td></td>
      <td></td>
    </tr>
  </tbody>
</table>
