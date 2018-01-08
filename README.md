Travis CI Status: [![Travis CI Status](https://travis-ci.org/epiclabs-io/inspector.js.svg?branch=master)](https://travis-ci.org/epiclabs-io/inspector.js)

# Inspector.js #

Javascript Library that implements MpegTS and MP4 demuxers.
It also implements AVC (H.264), AAC and MP3 parsers that are used to inspect payload and to report the type of frames within each video/audio track. It doesn't decode content,
just parse it, so inspection process is lightweight and can be done in real time for live streams without impacting CPU consumption.

Besides other things it can be used to analyze the content of MpegTS or MP4 based streams (HLS/DASH/Smooth Streaming).

Note: Inspector.js can be used with web workers which allows to inspect big files without blocking UI. Take a look to our samples to see how to use it.

### Quick Start ###
The easiest way to start using inspector.js in your own projects is installing it using npm:
* npm install inspector.js

Once done, and integrated with your web app, you can start using it. Example:
```javascript
var mediaSamplesUrl = 'https://video-dev.github.io/streams/x36xhzz/url_0/url_462/193039199_mp4_h264_aac_hd_7.ts';
var req = new XMLHttpRequest();
req.open('GET', mediaSamplesUrl, true);
req.responseType = 'arraybuffer';

req.onload = function (data) {
var arrayBuffer = req.response;
if (arrayBuffer) {
    var byteArray = new Uint8Array(arrayBuffer);
    var demuxer = inspectorjs.createMpegTSDemuxer();
    demuxer.append(byteArray);
    demuxer.end();

    // You will find tracks information in demuxer.tracks
    console.log(demuxer.tracks);
}
```

### Development guidelines ###
* Install dependencies
  * npm install
* Run devevelopment server
  * npm run start

Once dev server gets started, the project is automatically built whenever you apply any change.
