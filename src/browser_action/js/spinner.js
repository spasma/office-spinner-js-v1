const TWO_PI = Math.PI * 2;
const HALF_PI = Math.PI * 0.5;
// canvas settings
var viewWidth = 800,
    viewHeight = 900,
    viewCenterX = viewWidth * 0.7,
    viewCenterY = viewHeight * 0.7,
    drawingCanvas = document.getElementById("drawing_canvas"),
    ctx,
    timeStep = (1 / 160),
    time = 0;

var ppm = 40, // pixels per meter
    physicsWidth = viewWidth / ppm,
    physicsHeight = viewHeight / ppm,
    physicsCenterX = physicsWidth * 0.5,
    physicsCenterY = physicsHeight * 0.5;

var world;
var loser;
var wheel,
    arrow,
    mouseBody;

var arrowMaterial,
    pinMaterial,
    contactMaterial;

var wheelSpinning = false,
    wheelStopped = true;
var particles = [];

var statusLabel = document.getElementById('status_label');


var startSpeed = 0;

var started = false;
function startAll() {
    if (started === true)
        return;
    started = true;
    $(".ios").hide();
    initDrawingCanvas();
    initPhysics();
    requestAnimationFrame(loop);

}

window.onload = function () {
    initDrawingCanvas();
    initPhysics();
    requestAnimationFrame(loop);
};

var Colors = {};
for (i = 0; i < 19; i++) {
    Colors[i] = '#333';
}

function reverseArr(input) {
    var ret = new Array;
    for (var i = input.length - 1; i >= 0; i--) {
        ret.push(input[i]);
    }
    return ret;
}
var aantalGebruikers = 19;

function initDrawingCanvas() {
    drawingCanvas.width = viewWidth;
    drawingCanvas.height = viewHeight;
    ctx = drawingCanvas.getContext('2d');
}

function initPhysics() {
    world = new p2.World();
    world.solver.iterations = 10;
    world.solver.tolerance = 0;

    arrowMaterial = new p2.Material();
    pinMaterial = new p2.Material();
    contactMaterial = new p2.ContactMaterial(arrowMaterial, pinMaterial, {
        friction: 0.1,
        restitution: 0.0
    });
    world.addContactMaterial(contactMaterial);

    var wheelRadius = 9,
        wheelX = physicsCenterX,
        wheelY = wheelRadius + 4,
        arrowX = wheelX,
        arrowY = wheelY + wheelRadius; //+ 0.625;

    wheel = new Wheel(wheelX, wheelY, wheelRadius, aantalGebruikers, 0.15, 8.2);
    wheel.body.angle = 0; //parseInt((TWO_PI / this.segments)*3); // 0; //(Math.PI / 32.5);

    wheel.body.angularVelocity = 0;

    statusLabel.innerHTML = 'Er is momenteel een roulette gaande..';

    wheel.body.angularVelocity = startSpeed;
    arrow = new Arrow(arrowX, arrowY, 0.5, 1.7);
    mouseBody = new p2.Body();

    world.addBody(mouseBody);
}

function spawnPartices() {
    for (var i = 0; i < 200; i++) {
        var p0 = new Point(viewCenterX, viewCenterY - 64);
        var p1 = new Point(viewCenterX, 0);
        var p2 = new Point(Math.random() * viewWidth, Math.random() * viewCenterY);
        var p3 = new Point(Math.random() * viewWidth, viewHeight + 64);

        particles.push(new Particle(p0, p1, p2, p3));
    }
}
var spanningGezegd = false;
var wieGezegd = false;
var lastSecond = false;
function update() {

    particles.forEach(function (p) {
        p.update();
        if (p.complete) {
            particles.splice(particles.indexOf(p), 1);
        }
    });

    world.step(timeStep * 0.5);
    world.step(timeStep * 0.5);
}

function draw() {
    // ctx.fillStyle = '#fff';
    ctx.clearRect(0, 0, viewWidth, viewHeight);

    wheel.draw();
    arrow.draw();

    particles.forEach(function (p) {
        p.draw();
    });
}

function loop() {
    update();
    draw();

    requestAnimationFrame(loop);
}

function Wheel(x, y, radius, segments, pinRadius, pinDistance) {
    this.x = x;
    this.y = y;
    this.col = $c.rand();
    this.radius = radius;
    this.segments = segments;
    this.pinRadius = pinRadius;
    this.pinDistance = pinDistance;
    this.nameDistance = pinDistance;


    this.pX = this.x * ppm;
    this.pY = (physicsHeight - this.y) * ppm;
    this.pRadius = this.radius * ppm;
    this.pPinRadius = this.pinRadius * ppm;
    this.pPinPositions = [];
    this.pNamePositions = [];

    this.deltaPI = TWO_PI / this.segments;

    this.createBody();
    this.createPins();
}

Wheel.prototype = {
    createBody: function () {
        this.body = new p2.Body({mass: 100, position: [this.x, this.y]});
        this.body.angularDamping = 0.0;
        this.body.addShape(new p2.Circle(this.radius));
        this.body.shapes[0].sensor = false; //TODO use collision bits instead

        var axis = new p2.Body({position: [this.x, this.y]});
        var constraint = new p2.LockConstraint(this.body, axis);
        constraint.collideConnected = false;

        world.addBody(this.body);
        world.addBody(axis);
        world.addConstraint(constraint);
    },
    createPins: function () {
        var l = this.segments,
            pin = new p2.Circle(this.pinRadius);

        pin.material = pinMaterial;

        for (var i = 0; i < l; i++) {
            var x = Math.cos(i / l * TWO_PI) * this.pinDistance,
                y = Math.sin(i / l * TWO_PI) * this.pinDistance;

            this.body.addShape(pin, [x, y]);
            this.pPinPositions[i] = [x * ppm, -y * ppm];

        }

        for (var i = 1; i < l * 2; i += 2) {
            var x = Math.cos(i / l * (HALF_PI * 2)) * this.nameDistance,
                y = Math.sin(i / l * (HALF_PI * 2)) * this.nameDistance;
            this.pNamePositions[i] = [x * ppm / 1.2, -y * ppm / 1.2];

        }

    },
    draw: function () {
        ctx.save();
        ctx.translate(this.pX, this.pY);
        ctx.beginPath();
        ctx.fillStyle = '#333333';
        ctx.arc(0, 0, this.pRadius + 4, 0, TWO_PI);
        ctx.fill();

        var rot = -this.body.angle;
        ctx.rotate(rot);

        for (var i = 0; i < this.segments; i++) {
            if (i == 0) {
                ctx.fillStyle = '#ff4d4d';
            } else {
                ctx.fillStyle = i % 2 == 1 ? '#000549' : '#bfc3ff';
            }

            ctx.beginPath();
            ctx.arc(0, 0, this.pRadius, i * this.deltaPI, (i + 1) * this.deltaPI);
            ctx.lineTo(0, 0);

            ctx.closePath();
            ctx.fill();
            ctx.beginPath();

            ctx.fill();
        }
        var currentRotation = (wheel.body.angle % (TWO_PI)) + (this.deltaPI / 4),
            currentSegment = Math.floor((currentRotation / this.deltaPI));

        loser = users2[(currentSegment - 5 >= 0) ? currentSegment - 5 : users2.length + (currentSegment - 5)];
        ctx.fillStyle = '#401911';

        this.pPinPositions.forEach(function (p) {
            ctx.beginPath();
            ctx.arc(p[0], p[1], this.pPinRadius, 0, TWO_PI);
            ctx.fillStyle = '#CCC';
            ctx.fill();
        }, this);
        var num = 0;
        this.pNamePositions.forEach(function (p, i) {
            ctx.beginPath();
            ctx.save();
            var tx = p[0];
            var ty = p[1];
            ctx.translate(tx, ty);
            ctx.rotate(wheel.body.angle);

            ctx.font = "24px Verdana";

            name = users[num];
            if (users[num] == "[special]") {
                name = "Special";
            } else {

            }

            var width = ctx.measureText(" " + name + " ").width;

            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(-40, 5, width, -30);
            ctx.fillStyle = '#000000';

            ctx.fillText(" " + name + " ", -40, 0, 300);

            ctx.translate(-tx, -ty);
            num++;
//				drawTextAlongArc(ctx, users[i], p[0], p[1], $("#radius").val(), $("#angle").val());
            ctx.restore();
            ctx.closePath();
        }, this);

        ctx.restore();
    }
};
function Arrow(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.verts = [];

    this.pX = this.x * ppm;
    this.pY = (physicsHeight - this.y) * ppm;
    this.pVerts = [];

    this.createBody();
}

Arrow.prototype = {
    createBody: function () {
        this.body = new p2.Body({mass: 0.0, position: [this.x, this.y]});
        this.body.addShape(this.createArrowShape());

        var axis = new p2.Body({position: [this.x, this.y]});
        var constraint = new p2.RevoluteConstraint(this.body, axis, {
            worldPivot: [this.x, this.y]
        });
        constraint.collideConnected = false;

        var left = new p2.Body({position: [this.x - 2, this.y]});
        var right = new p2.Body({position: [this.x + 2, this.y]});
        var leftConstraint = new p2.DistanceConstraint(this.body, left, {
            localAnchorA: [-this.w * 2, this.h * 0.25],
            collideConnected: false
        });
        var rightConstraint = new p2.DistanceConstraint(this.body, right, {
            localAnchorA: [this.w * 2, this.h * 0.25],
            collideConnected: false
        });
//			var s = 32,
//				r = 4;
        var r = 1;
        var s = 0.1;
        leftConstraint.setStiffness(s);
        leftConstraint.setRelaxation(r);
        rightConstraint.setStiffness(s);
        rightConstraint.setRelaxation(r);

        world.addBody(this.body);
        world.addBody(axis);
        world.addConstraint(constraint);
        world.addConstraint(leftConstraint);
        world.addConstraint(rightConstraint);
    },

    createArrowShape: function () {
        this.verts[0] = [0, this.h * 0.25];
        this.verts[1] = [-this.w * 0.5, 0];
        this.verts[2] = [0, -this.h * 0.75];
        this.verts[3] = [this.w * 0.5, 0];

        this.pVerts[0] = [this.verts[0][0] * ppm, -this.verts[0][1] * ppm];
        this.pVerts[1] = [this.verts[1][0] * ppm, -this.verts[1][1] * ppm];
        this.pVerts[2] = [this.verts[2][0] * ppm, -this.verts[2][1] * ppm];
        this.pVerts[3] = [this.verts[3][0] * ppm, -this.verts[3][1] * ppm];

        var shape = new p2.Convex(this.verts);
        shape.material = arrowMaterial;

        return shape;
    },
    hasStopped: function () {
        var angle = Math.abs(this.body.angle % TWO_PI);
        return (angle < 1e-3 || (TWO_PI - angle) < 1e-3);
    },
    update: function () {

    },
    draw: function () {
        ctx.save();
        ctx.translate(this.pX, this.pY);
        ctx.rotate(-this.body.angle);

        ctx.fillStyle = '#CCCCCC';
        ctx.beginPath();
        ctx.moveTo(this.pVerts[0][0], this.pVerts[0][1]);
        ctx.lineTo(this.pVerts[1][0], this.pVerts[1][1]);
        ctx.lineTo(this.pVerts[2][0], this.pVerts[2][1]);
        ctx.lineTo(this.pVerts[3][0], this.pVerts[3][1]);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }
};
/////////////////////////////
// your reward
/////////////////////////////
Particle = function (p0, p1, p2, p3) {
    this.p0 = p0;
    this.p1 = p1;
    this.p2 = p2;
    this.p3 = p3;

    this.time = 0;
    this.duration = 3 + (Math.random() * 2);
    this.color = 'hsl(' + Math.floor(Math.random() * 360) + ',100%,50%)';

    this.w = 20;
    this.h = 12;

    this.complete = false;
};
Particle.prototype = {
    update: function () {
        this.time = Math.min(this.duration, this.time + timeStep);

        var f = Ease.outCubic(this.time, 0, 1, this.duration);
        var p = cubeBezier(this.p0, this.p1, this.p2, this.p3, f);

        var dx = p.x - this.x;
        var dy = p.y - this.y;

        this.r = Math.atan2(dy, dx) + HALF_PI;
        this.sy = Math.sin(Math.PI * f * 10);
        this.x = p.x;
        this.y = p.y;

        this.complete = this.time === this.duration;
    },
    draw: function () {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.r);
        ctx.scale(1, this.sy);

        ctx.fillStyle = this.color;
        ctx.fillRect(-this.w * 0.5, -this.h * 0.5, this.w, this.h);

        ctx.restore();
    }
};
Point = function (x, y) {
    this.x = x || 0;
    this.y = y || 0;
};
/////////////////////////////
// math
/////////////////////////////
/**
 * easing equations from http://gizma.com/easing/
 * t = current time
 * b = start value
 * c = delta value
 * d = duration
 */
var Ease = {
    inCubic: function (t, b, c, d) {
        t /= d;
        return c * t * t * t + b;
    },
    outCubic: function (t, b, c, d) {
        t /= d;
        t--;
        return c * (t * t * t + 1) + b;
    },
    inOutCubic: function (t, b, c, d) {
        t /= d / 2;
        if (t < 1) return c / 2 * t * t * t + b;
        t -= 2;
        return c / 2 * (t * t * t + 2) + b;
    },
    inBack: function (t, b, c, d, s) {
        s = s || 1.70158;
        return c * (t /= d) * t * ((s + 1) * t - s) + b;
    }
};

function cubeBezier(p0, c0, c1, p1, t) {
    var p = new Point();
    var nt = (1 - t);

    p.x = nt * nt * nt * p0.x + 3 * nt * nt * t * c0.x + 3 * nt * t * t * c1.x + t * t * t * p1.x;
    p.y = nt * nt * nt * p0.y + 3 * nt * nt * t * c0.y + 3 * nt * t * t * c1.y + t * t * t * p1.y;

    return p;
}

function resizeName() {
    colorName();
    confettiGekte();
}

function colorName() {
    $("#loser").css({"color": $c.rand()});

}

function confettiGekte() {
    spawnPartices();
}