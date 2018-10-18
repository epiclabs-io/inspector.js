document.getElementById('fileInput')
  .addEventListener('change', onFileChosen, false);

var fileChosen = null;
function onFileChosen(event) {
  fileChosen = event.target.files[0];
}

function abortAllLoading() {
  document.getElementById('loadProgress').value = 0;
  if (request) {
    request.onload = null;
    request.onprogress = null;
    request.onerror = null;
    request.abort();
    request = null;
  }
  if (reader) {
    reader.onload = null;
    reader.onprogress = null;
    reader.onerror = null;
    reader.abort();
    reader = null;
  }
}

var request = null;
function loadRemoteMedia(mediaUrl, onLoaded) {
  abortAllLoading();

  var req = request = new XMLHttpRequest();
  req.open('GET', mediaUrl, true);
  req.responseType = 'arraybuffer';

  req.onload = function () {

    if (req.status >= 400) {
      alert('An error (' + req.status + ') happened trying to load the remote resource: ' + mediaUrl);
      abortAllLoading();
      return;
    }

    var arrayBuffer = req.response;
    onLoaded(arrayBuffer);
  };
  req.onprogress = function (event) {
    document.getElementById('loadProgress').value = (event.loaded / event.total) * 100;
  }
  req.onerror = function () {
    alert('A fatal error happened trying to load the remote resource: ' + mediaUrl);
  }
  req.send(null);
}

var reader = null;
function loadLocalMedia(file, onLoaded) {
  abortAllLoading();

  reader = new FileReader();
  reader.onload = function onFileRead(event) {
    onLoaded(reader.result);
  };
  reader.onprogress = function(event) {
    document.getElementById('loadProgress').value = (event.loaded / event.total) * 100;
  }
  reader.onerror = function () {
    alert('A fatal error happened trying to load the file resource: ' + file);
  }
  reader.readAsArrayBuffer(file);
}

function inspectMedia(type) {
  clearTracksInfo();
  clearAtomsTree();
  clearAtomDetails();

  switch (type) {
  case 'local':
    if (!fileChosen) {
      window.alert('Please choose a file...');
      return;
    }
    document.getElementById('uri').value = fileChosen.name;
    loadLocalMedia(fileChosen, onMediaLoaded.bind(null, fileChosen.name));
    break;
  case 'remote-sample-media':
    var mediaUrl = document.getElementById("mediaUrl").value;
    if (!mediaUrl) {
      window.alert('Please choose a URL...');
      return;
    }
    document.getElementById('uri').value = mediaUrl;
    loadRemoteMedia(mediaUrl, onMediaLoaded.bind(null, mediaUrl));
    break;
  case 'remote-input-url':
    var mediaUrl = document.getElementById('urlInput').value;
    if (!mediaUrl) {
        window.alert('Please input a URL...');
        return;
    }
    document.getElementById('uri').value = mediaUrl;
    loadRemoteMedia(mediaUrl, onMediaLoaded.bind(null, mediaUrl));
    break;
  }
}

function onMediaLoaded(uri, arrayBuffer) {
  document.getElementById('totalBytes')
    .value = arrayBuffer.byteLength;

  var byteArray = new Uint8Array(arrayBuffer);

  var demuxer = createDemuxer(uri);

  demuxer.append(byteArray);
  demuxer.end();

  updateAtomsInfo(demuxer);
  updateTracksInfo(demuxer);
}

function createDemuxer(uri) {
  // Find out demuxer looking at file extension. "Enough" good for this sample
  var ext = uri.split('.').pop();
  if (ext === 'ts') {
    return inspectorjs.createMpegTSDemuxer();
  } else if (ext === 'webm') {
    return inspectorjs.createWebMDemuxer();
  } else { // TODO: add regex here
    return inspectorjs.createMp4Demuxer();
  }
}

function updateTracksInfo(demuxer) {
  var el = document.getElementById('tracks');
  for (var trackId in demuxer.tracks) {
    addTrackInfo(el, demuxer.tracks[trackId]);
  }
}

function addTrackInfo(el, track) {
  var trackEl = document.createElement('div');

  // Add track general info
  trackEl.innerHTML = '<h4>Track # ' + track.id + ' - ' + track.mimeType + '</h4>';

  // Add frame details
  var framesEl = document.createElement('ul');
  for (var frame of track.frames) {
    var frameEl = document.createElement('li');
    frameEl.innerHTML
      = 'Frame: type = ' + frame.frameType + ' | '
      + '[ PTS / DTS = '
      + frame.getDecodingTimestampInSeconds().toFixed(3)
      + ' / '
      + frame.getPresentationTimestampInSeconds().toFixed(3)
      + ' ( '
      + (frame.getDurationInSeconds().toFixed(3) || 0) + ' )'
      + ' @' + frame.bytesOffset
      + ' -> '
      + (frame.bytesOffset + frame.size - 1)
      + ' ( ' + frame.size + ' ) '
      + ' ]'
      ;

    framesEl.appendChild(frameEl);
  }
  trackEl.appendChild(framesEl);

  // Add track info to dom
  el.appendChild(trackEl);
}

function updateAtomsInfo(demuxer) {
  // Only makes sense for MP4 files
  if (demuxer.atoms) {
    var el = document.getElementById('atoms');
    addAtoms(el, demuxer.atoms);
  }
}

// Add information about MP4 atoms
function addAtoms(parent, atoms) {
  if (!atoms || atoms.length === 0) return;

  var containerEl = document.createElement('ul');
  for (var atom of atoms) {
    var atomEl = document.createElement('li');
    atomEl.innerHTML = atom.type + ', ' + atom.size + ' bytes';
    atomEl.onclick = renderAtomDetails.bind(null, atom);

    containerEl.appendChild(atomEl);

    if (atom.atoms && atom.atoms.length > 0) {
      addAtoms(atomEl, atom.atoms);
    }
  }

  parent.appendChild(containerEl);
}

function renderAtomDetails(atom, event) {
  event.stopPropagation();
  var el = document.getElementById('details');
  clearAtomDetails();

  var containerEl = document.createElement('ul');
  for (var p in atom) {
    if (atom.hasOwnProperty(p) && shouldRenderAtom(p, atom)) {
      var item = document.createElement('li');
      item.innerHTML = '<p>' + p + ":<pre>" + JSON.stringify(atom[p], null, 4) + '</pre></p>';
      containerEl.appendChild(item);
      //containerEl.appendChild(document.createElement('br'));
    }
  }

  el.appendChild(containerEl);
}

function clearTracksInfo() {
  var el = document.getElementById('tracks');

  // Remove any child of tracks element
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function clearAtomsTree() {
  var el = document.getElementById('atoms');

  // Remove any child of tracks element
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function clearAtomDetails() {
  var el = document.getElementById('details');
  while (el.firstChild) {
    el.removeChild(el.firstChild);
  }
}

function shouldRenderAtom(p, atom) {
  return p !== 'atoms' && p !== 'containerDataOffset' && p !== 'constructor';
    //&& !Array.isArray(atom[p]);
}
