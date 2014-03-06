(function ($, humanizeDuration) {
  "use strict";
  // http://www.smartjava.org/content/exploring-html5-web-audio-visualizing-sound
  window.AudioContext = window.AudioContext || window.webkitAudioContext;
  window.requestAnimFrame = (function () {
    return  window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame    ||
      function (callback) {
        window.setTimeout(callback, 1000 / 60);
      };
  })();
  var audioContext, analyser, analyser2, javascriptNode, splitter, sourceNode,
    firstSuccessTime, targetSuccessTime,  sustainTime, sustainValue, volume,
    elm_volume_meter, elm_volume_meter_text, elm_meter_container, elm_pie_timer,
    loadLeaderboard, submitScore;

  audioContext = new window.AudioContext();
  analyser = null;
  javascriptNode = null;
  firstSuccessTime = 0;
  targetSuccessTime = 0;
  sustainTime = 1;
  sustainValue = 40;

  volume = 0;

  elm_meter_container = $('#meter_container');
  elm_volume_meter = document.getElementById('volume_meter');
  elm_pie_timer = $('#volume_pie_timer');
  elm_pie_timer.knob({
    min: 0,
    max: sustainTime
  }).val(0);
  elm_pie_timer.parent().hide();
  elm_volume_meter_text = document.getElementById('volume_meter_text');

  sustainValue = elm_volume_meter.high;

  loadLeaderboard = function () {
    window.gapi.client.load('games', 'v1', function () {
      var score_list_config, request;
      //gapi.client.games.leaderboards.get({leaderboardId: "CgkIlZWPs-MEEAIQAQ" }).execute(function(response) {
      score_list_config = {
        collection: 'social',
        leaderboardId: "CgkIlZWPs-MEEAIQAQ",
        timeSpan: 'ALL_TIME',
        maxResults: 20
      };
      request = window.gapi.client.games.scores.list(score_list_config);
      request.execute(function (response) {
        var tbody = $('#leaderboard').removeClass('hide').find('tbody');
        tbody.empty();
        if (response.numScores !== "0") {
          $.each(response.items, function (idx, val) {
            console.log(val);
            var tr = $('<tr>').appendTo(tbody);
            $('<td>').text(val.formattedScoreRank).appendTo(tr);
            $('<td>').text(val.player.displayName).appendTo(tr);
            $('<td>').text(humanizeDuration(val.scoreValue)).appendTo(tr);
          });
        }
      });
    });
  };
  submitScore = function (score) {
    if (!window.gapi) { return; }
    if (score <= 0) { return; }
    window.gapi.client.load('games', 'v1', function () {
      var score_list_config, request;
      score_list_config = {
        leaderboardId: "CgkIlZWPs-MEEAIQAQ",
        score: score
      };
      request = window.gapi.client.games.scores.submit(score_list_config);
      request.execute(function (response) {
        loadLeaderboard();
      });
    });
  };

  window.pageSigninCallback = function (auth) {
    loadLeaderboard();
    if (auth && !auth.error) {
      // Hooray! The user is logged int!
      // If we got here from a sign-in button, we should probably hide it
      $('#signin_button').addClass('hide');
    } else {
      // Common reasons are immediate_failed and user_signed_out
      if (auth && auth.error) {
        console.log('Sign in failed because: ', auth.error);
      }
      $('#signin_button').click(function () {
        window.gapi.auth.signIn();
      }).removeClass('hide');
    }
  };

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

  function get_user_media_error(err) {
    if (console && console.error) {
      console.error('Stream generation failed.', err)
    } else {
      alert('Stream generation failed.');
    }
  }
  function getUserMedia(dictionary, callback) {
    try {
      navigator.getUserMedia =
        navigator.getUserMedia ||
        navigator.webkitGetUserMedia ||
        navigator.mozGetUserMedia;

      navigator.getUserMedia(dictionary, callback, get_user_media_error);
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
      var array;
      // get the average for the first channel
      array =  new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(array);
      volume = getAverageVolume(array);
      elm_volume_meter.value = volume;
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
  (function animloop() {
    window.requestAnimFrame(animloop);
    elm_volume_meter_text.innerHTML = volume.toFixed(2) + " / " + sustainValue;
    if (volume > sustainValue) {
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
        elm_meter_container.addClass('high');
        elm_pie_timer.parent().hide();
      }
    } else {
      if (firstSuccessTime !== 0) {
        submitScore(new Date().getTime() - firstSuccessTime.getTime());
        elm_meter_container.removeClass('high');
        elm_pie_timer.parent().hide();
      }
      firstSuccessTime = 0;
      targetSuccessTime = 0;
    }
  })();
})(window.jQuery, window.humanizeDuration);
