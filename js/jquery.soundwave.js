(function ($, tinycolor) {
  "use strict";

  $.fn.sound_wave = function () {
    window.CanvasRenderingContext2D.prototype.clear =
    window.CanvasRenderingContext2D.prototype.clear || function (preserveTransform) {
      if (preserveTransform) {
        this.save();
        this.setTransform(1, 0, 0, 1, 0, 0);
      }

      this.clearRect(0, 0, this.canvas.width, this.canvas.height);

      if (preserveTransform) {
        this.restore();
      }
    };
    var requestAnimFrame = (function () {
      return  window.requestAnimationFrame ||
      window.webkitRequestAnimationFrame ||
      window.mozRequestAnimationFrame    ||
      function (callback) {
        window.setTimeout(callback, 1000 / 60);
      };
    })();
    this.each(function () {

      var canvas = this;
      var context = canvas.getContext('2d');
      context.clear();

      var settings = {
        line_width: canvas.width / 10,
        line_gap: canvas.width / 10,
        angle: 10,
        angle_growth: 0.10,
        color: '#0000FF'
      }

      var radius = canvas.height / 2;
      var x_growth = settings.line_width + settings.line_gap;

      var times = [];
      var colors = [];
      var total_slices = Math.ceil((canvas.width - settings.line_width) / x_growth);
      for (var i = 0; i < total_slices; i++)
      {
        times.push(i);
        if (tinycolor) {
          colors.push(tinycolor.darken(settings.color, total_slices * i).toRgbString());
        } else {
          var blue = ( 255 / total_slices ) * (i+1);
          var color = 'rgb(0,0,'+blue.toFixed(0)+')';
          colors.unshift(color);
        }
      }
      times.forEach(function (offset) {
        var x = (-radius + settings.line_width) + x_growth * offset;
        var start_angle = -(Math.PI / settings.angle) - (settings.angle_growth * offset);
        var end_angle = (Math.PI / settings.angle) + (settings.angle_growth * offset);
        context.beginPath();
        context.lineWidth = settings.line_width;
        context.arc(x, radius/*y*/, radius, start_angle, end_angle, false/*counter_clockwise*/);

        /*
        console.log(color);
        */
        context.strokeStyle = colors.pop();
        context.stroke();
      });
    });
    return this;
  };
})(window.jQuery, window.tinycolor);