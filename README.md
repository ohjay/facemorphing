# Face Morphing
Note that the "main" file is `js/facemorphing.js`, which contains interface handling alongside the actual face morphing implementation. The implementation turns out to be rather brief on its own.

### Notes
#### To set the feature points for a destination image
- Go into `js/facemorphing.js` and set `CALIBRATION` to `true`.
- Open up the website.
- In the console: run `_startCalibration()`, then move the points around.
- Hit `ENTER` when finished, and save the file that opens.
- Negate `CALIBRATION` and ensure that `PATH_JSON_TO` is set to your newly created JSON file.

That should be all you need!

#### Obesity
Fun fact: barring poor `clmtrackr` output, you can give somebody a little extra weight by running automatic feature detection on the default "from" image and then warping only the other guy's shape.

### Animal image sources
Labeled by their filenames in [this directory](https://github.com/ohjay/facemorphing/tree/master/images/source).

| Filename | Source |
|:--------:|:------:|
| `bear.jpg` | [(link)](https://marketshaman.com/wp-content/uploads/bb-plugin/cache/arxpjnxq9lu-thomas-lefebvre-landscape.jpg) |
| `chameleon.jpg` | [Nick Garbutt](http://www.arkive.org/parsons-chameleon/calumma-parsonii/image-G15419.html) |
| `chickadee.jpg` | [(link)](https://statesymbolsusa.org/sites/statesymbolsusa.org/files/primary-images/blackcappedchickadeebird.jpg) |
| `dog_a.jpg` | [Art News Blog](http://www.artnewsblog.com/dog-portrait-photography/) |
| `dog_b.jpg` | [Viralscape](http://viralscape.com/animal-portraits/dog-portrait-13-2/) |
| `dog_c.jpg` | [Viralscape](http://cdn7.viralscape.com/wp-content/uploads/2015/02/Dog-Portrait-10.jpg) |
| `dog_d.jpg` | [Viralscape](http://cdn5.viralscape.com/wp-content/uploads/2015/02/Dog-Portrait-9.jpg) |
| `dog_f.jpg` | [(link)](http://s.hswstatic.com/gif/animal-stereotype-orig.jpg) |
| `fish_a.jpg` | [(link)](http://www.bupg.co.uk/nl0108.htm) |
| `fish_b.jpg` | [Carl R. Neal](http://www.allenhost.com/gallery/v/Published/Bonaire+2010/Lizard+Fish+Portrait.jpg.html) |
| `fish_c.jpg` | [Tim Laman](https://images.fineartamerica.com/images-medium-large/portrait-of-a-garibaldi-fish-tim-laman.jpg) |
| `fish_d.jpg` | [Chevereto](https://demo.chevereto.com/i/HaH) |
| `fish_e.jpg` | [Dreamstime.com](https://thumbs.dreamstime.com/x/portrait-live-fish-sea-japan-20522465.jpg) |
| `iguana.jpg` | [Paul Wheeler](http://www.paulwheelerphotography.com/photo_4007317.html) |
| `panda.jpg` | [San Diego Zoo](http://animals.sandiegozoo.org/sites/default/files/2016-08/category-thumbnail-mammals_0.jpg) |
| `rabbit.jpg` | [Alamy](http://www.dailymail.co.uk/news/article-2802972/massages-rabbits-studies-sea-monkeys-swimming-patterns-watching-grass-grow-bizarre-projects-taxpayers-funding.html) |
| `tiger.jpg` | [Shirlene Mackin](http://www.lanlinglaurel.com/animal-images/4354655.html) |
