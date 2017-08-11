Travis CI Status: [![Travis CI Status](https://travis-ci.org/epiclabs-io/inspector.js.svg?branch=master)](https://travis-ci.org/epiclabs-io/inspector.js)

# Inspector.js #

Javascript Library that implements MpegTS and MP4 demuxers.
It also implements AVC (H.264), AAC and MP3 parsers that are used to inspect payload and to report the type of frames within each video/audio track. It doesn't decode content,
just parse it, so inspection process is lightweight and can be done in real time for live streams without impacting CPU consumption.

Besides other things it can be used to analyze the content of MpegTS or MP4 based streams (HLS/DASH/Smooth Streaming).

### How do I get set up? ###

* npm install
* npm run build

### Development guidelines ###

* npm install
* npm run start

Once dev server is started, project is automatically built and compiled whenever you apply any change.
