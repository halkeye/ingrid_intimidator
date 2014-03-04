(function () {
  "use strict";
  // http://www.smartjava.org/content/exploring-html5-web-audio-visualizing-sound
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  var audioContext, analyser, analyser2, javascriptNode, splitter, sourceNode, container, lastSuccessTime;

  audioContext = new window.AudioContext();
  analyser = null;
  javascriptNode = null;
  lastSuccessTime = 0;

  Array.prototype.remove = function () {
    var what, a = arguments, L = a.length, ax;
    while (L && this.length) {
      what = a[--L];
      while ((ax = this.indexOf(what)) !== -1) {
        this.splice(ax, 1);
      }
    }
    return this;
  };

  function error() {
    alert('Stream generation failed.');
  }
  function getUserMedia(dictionary, callback) {
    try {
      navigator.getUserMedia =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia;

      navigator.getUserMedia(dictionary, callback, error);
    } catch (e) {
      alert('getUserMedia threw exception :' + e);
    }
  }

  function gotStream(stream) {
    // Create an AudioNode from the stream.
    var mediaStreamSource = audioContext.createMediaStreamSource(stream);

    javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);
    javascriptNode.connect(audioContext.destination);

    // setup a analyzer
    analyser = audioContext.createAnalyser();
    analyser.smoothingTimeConstant = 0.3;
    analyser.fftSize = 1024;

    analyser2 = audioContext.createAnalyser();
    analyser2.smoothingTimeConstant = 0.0;
    analyser2.fftSize = 1024;

    // create a buffer source node
    //sourceNode = audioContext.createBufferSource();
    splitter = audioContext.createChannelSplitter();

    // connect the source to the analyser and the splitter
    mediaStreamSource.connect(splitter);

    // connect one of the outputs from the splitter to
    // the analyser
    splitter.connect(analyser, 0, 0);
    splitter.connect(analyser2, 1, 0);

    // connect the splitter to the javascriptnode
    // we use the javascript node to draw at a
    // specific interval.
    analyser.connect(javascriptNode);
    container = document.getElementById('meter_container');

    javascriptNode.onaudioprocess = function () {
      var array, average, classes;
      // get the average for the first channel
      array =  new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(array);
      average = getAverageVolume(array);
      document.getElementById('volume_meter').value = average;
      document.getElementById('volume_meter_text').innerHTML = average;
      classes = container.getAttribute('class').split(' ');
      classes.remove('high');
      if (average > 60) {
        classes.push('high');
      }
      container.setAttribute('class', classes.join(' '));
    };
  }

  function getAverageVolume(array) {
    var values, average, length, i;
    values = 0;
    length = array.length;

    // get all the frequency amplitudes
    for (i = 0; i < length; i++) {
      values += array[i];
    }

    average = values / length;
    return average;
  }

  getUserMedia({audio: true}, gotStream);
})();
