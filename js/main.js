(function ($) {
  "use strict";
  // http://www.smartjava.org/content/exploring-html5-web-audio-visualizing-sound
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  var audioContext, analyser, analyser2, javascriptNode, splitter, sourceNode,
    firstSuccessTime, targetSuccessTime,  sustainTime, sustainValue,
    elm_volume_meter, elm_volume_meter_text, elm_meter_container, elm_pie_timer;

  audioContext = new window.AudioContext();
  analyser = null;
  javascriptNode = null;
  firstSuccessTime = 0;
  targetSuccessTime = 0;
  sustainTime = 1;
  sustainValue = 40;

  elm_meter_container = document.getElementById('meter_container');
  elm_volume_meter = document.getElementById('volume_meter');
  elm_pie_timer = $('#volume_pie_timer');
  elm_pie_timer.knob({
    min: 0,
    max: sustainTime
  }).val(0);
  elm_pie_timer.parent().hide();
  elm_volume_meter_text = document.getElementById('volume_meter_text');

  sustainValue = elm_volume_meter.high;

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

    javascriptNode.onaudioprocess = function () {
      var array, average, classes;
      // get the average for the first channel
      array =  new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(array);
      average = getAverageVolume(array);
      elm_volume_meter.value = average;
      elm_volume_meter_text.innerHTML = average.toFixed(2) + " / " + sustainValue;
      classes = elm_meter_container.getAttribute('class').split(' ');
      classes.remove('high');
      if (average > sustainValue) {
        if (firstSuccessTime === 0) {
          firstSuccessTime = new Date();
          targetSuccessTime = new Date();
          targetSuccessTime.setSeconds(targetSuccessTime.getSeconds() + sustainTime);
          elm_pie_timer.parent().show();

          /*elm_pie_timer.pietimer({
            seconds: sustainTime
          }); */
        }
        elm_pie_timer.val(((targetSuccessTime.getTime() - new Date().getTime()) / 1000).toFixed(2));
        /* If we've sustained it for seconds */
        if (new Date() >= targetSuccessTime) {
          classes.push('high');
          elm_pie_timer.parent().hide();
        }
      } else {
        if (firstSuccessTime !== 0) {
          elm_pie_timer.parent().hide();
        }
        firstSuccessTime = 0;
        targetSuccessTime = 0;
      }
      elm_meter_container.setAttribute('class', classes.join(' '));
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
})(window.jQuery);
