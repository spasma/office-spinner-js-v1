jQuery.fn.random = function () {
    var randomIndex = Math.floor(Math.random() * this.length);
    return jQuery(this[randomIndex]);
};
// COFFEE SMOKE EFFECT
$(function () {
    var a = 0;
    for (; a < 10; a += 1) {
        setTimeout(function b() {
            if ($('.fa-coffee:visible').length) {
                var randEl = $('.fa-coffee:visible').random();

                var a = Math.random() * 1e3 + 5e3, c = $("<div />", {
                    "class": "smoke",
                    css: {opacity: 0, top: randEl.offset().top, left: randEl.offset().left}
                });
                $(c).appendTo("#mainPopup");
                $.when($(c).animate({opacity: 1}, {
                    duration: a / 4, easing: "linear", queue: false, complete: function () {
                        $(c).animate({opacity: 0}, {duration: a / 2, easing: "linear", queue: false})
                    }
                }), $(c).animate({
                    top: 0,
                    marginLeft: (Math.random() > 0.5) ? -Math.random() * 40 : (Math.random() * 40)
                }, {
                    duration: a,
                    easing: "linear",
                    queue: false
                })).then(function () {
                    $(c).remove();
                    b()
                });
            } else {
                setTimeout(b, 1000);
            }
        }, 500 + Math.random() * 2000)
    }
});


// TEXT EFFECTS
// var getTextShadow = function (x, y, hue) {
//     return ', ' + x + 'px ' + y + 'px hsl(' + hue + ', 100%, 50%)';
// };
// var colorTime = 2,
//     waveTheta = 4,
//     maxCount = 4,
//     colorIncrement = -5,
//     waveIncrement = 0.00,
//     xPos = [-0, -1, 0, 0.1, 0.1],
//     yPos = [-1, -1, 0, 0.1, 0.1],
//     props = {};
// var animate = function () {
//     var shadows = '0 0 transparent',
//         hue0 = colorTime % 360,
//         i, j, x, y,
//         iLen = xPos.length,
//         jLen = yPos.length;
//     for (i = 0; i < iLen; i++) {
//         x = xPos[i];
//         for (j = 0; j < jLen; j++) {
//             y = yPos[j];
//             shadows += getTextShadow(x, y, hue0);
//         }
//     }
//     for (i = 1; i < maxCount; i++) {
//         var normI = i / maxCount,
//             hue = ( normI * 360 * 2 + colorTime ) % 360;
//         //x = ~~( ( Math.sin( normI * Math.PI * 2 + waveTheta ) - Math.sin( waveTheta ) )  * 50 );
//         x = i * 2;
//         y = i * 1;
//         shadows += getTextShadow(x, y, hue);
//     }
//     props.groovy.style.textShadow = shadows;
//     colorTime += colorIncrement;
//     waveTheta += waveIncrement;
// };
// var init = function () {
//     props.groovy = document.getElementById('groovy');
//
//     setTimeout(animate, 100);
// };
// window.addEventListener('DOMContentLoaded', init, false);
