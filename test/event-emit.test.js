var test = require('tape');
var Emitter = require('../lib/event-emit');
var EmitterPlace = Emitter.EmitterPlace;
var locationEvent = require('../lib/event-emit').locationEvent;
var route = require('../lib/route');
var garage = JSON.parse(JSON.stringify(require('./fixtures/garage.v5')));

test('locationEvents', function(t) {
  t.test('garage', function(assert) {
    var geojson = route(garage);
    var expected = [
      { bearing: 0,                  coords: [ -77.032395, 38.912603 ] },
      { bearing: -89.99993718633088, coords: [ -77.032595, 38.912603 ] },
      { bearing: -89.99997393323372, coords: [ -77.032678, 38.912603 ] },
      { bearing: 0,                  coords: [ -77.032678, 38.91315 ] },
      { bearing: 0.6460836158993326, coords: [ -77.032675, 38.913357 ] }
    ];
    for (var j = 0; j < geojson.geometry.coordinates.length; j++) {
      assert.deepEqual(locationEvent({
        next: geojson.geometry.coordinates[j],
        last: { coords: geojson.geometry.coordinates[j-1] }
      }), expected[j]);
    }
    assert.end();
  });
  t.end();
});

test('emit.all', function(t) {
  t.test('garage', function(assert) {
    var emitter = new Emitter(route(garage), 100);
    var geojson = emitter.all();
    var expected = JSON.parse(JSON.stringify(require('./expected/garage-events')));
    for (var i = 0; i < expected.length; i++) {
      var a = geojson[i];
      var b = expected[i];
      assert.ok(Math.abs(a.bearing - b.bearing) < 0.000001);
      assert.ok(Math.abs(a.coords[0] - b.coords[0]) < 0.000001);
      assert.ok(Math.abs(a.coords[1] - b.coords[1]) < 0.000001);
    }
    assert.end();
  });

  t.test('garage [time]', function(assert) {
    var start = +new Date;
    for (var i = 0; i < 10; i++) {
      var geojson = route(garage);
      var emitter = new Emitter(geojson, 100);
      emitter.all();
    }
    var time = +new Date - start;
    assert.ok(true, time + 'ms for 10 reps');
    assert.end();
  });

  t.test('garage [num events]', function(assert) {
    var emitter = new Emitter(route(garage), 100);
    var events = emitter.all();
    assert.ok(Math.abs(garage.routes[0].duration - (events.length * .1)) < 1, 'Num events * interval should correspond to route duration');
    assert.end();
  });

  t.end();
});

test('emit.next', function(t) {
  t.test('garage', function(assert) {
    var expected = JSON.parse(JSON.stringify(require('./expected/garage-events')));
    var emitter = new Emitter(route(garage), 100);
    for (var i = 0; i < expected.length; i++) {
      step = emitter.next();
      var b = expected[i];
      assert.ok(Math.abs(step.bearing - b.bearing) < 0.000001);
      assert.ok(Math.abs(step.coords[0] - b.coords[0]) < 0.000001);
      assert.ok(Math.abs(step.coords[1] - b.coords[1]) < 0.000001);
    }
    assert.equal(emitter.next(), null);
    assert.end();
  });

  t.end();
});

test('emit.next acceldecel', function(assert) {
  var geojson = route(JSON.parse(JSON.stringify(require('./fixtures/garage.v5'))), { spacing: 'acceldecel' });
  var emitter = new Emitter(geojson, 2000);

  var ev = emitter.next();
  var num = 0;
  // Request events until the last event (indicated by `null`) is reached.
  while (ev) {
    assert.equal(ev.coords.length, 2, 'event ' + num + ' coords');
    assert.equal(typeof ev.bearing, 'number', 'event ' + num + ' bearing');
    assert.equal(typeof ev.speed, 'number', 'event ' + num + ' speed');
    if (num === 0) {
      assert.deepEqual(ev.speedchange, undefined, 'event ' + num + ' speedchange');
    } else {
      assert.equal(typeof ev.speedchange, 'number', 'event ' + num + ' speedchange');
    }
    num++;
    ev = emitter.next();
  }
  assert.deepEqual(ev, null, 'last event is null');
  assert.end();
});

test('speed placer', function(t) {
  var garage = JSON.parse(JSON.stringify(require('./fixtures/garage.v5')));
  var garageSteps = garage.routes[0].legs[0].steps;
  var geojson = route.buildTrace(garageSteps, { spacing: 'acceldecel' }); 
  var place = new EmitterPlace(geojson, true);

  t.deepEqual(place.times, [
    0,
    2086,
    5354,
    6935,
    14625,
    14687,
    20384
  ]);
  t.deepEqual(place.coords, [
    [ -77.032395, 38.912603 ],
    [ -77.03242338052249, 38.912603000020766 ],
    [ -77.032595, 38.912603 ],
    [ -77.032678, 38.912603 ],
    [ -77.032678, 38.91315 ],
    [ -77.03267793641194, 38.9131543875888 ],
    [ -77.032675, 38.913357 ]
  ]);
  t.deepEqual(place.speeds, [
    4.239076929829525,
    4.239076929829525,
    20.580506174556888,
    28.48368037697154,
    28.482824403352883,
    28.482824403352883,
    0
  ]);
  t.deepEqual(place.dists, [
    0,
    2.4562913514815197,
    17.309697889401946,
    24.493222513572633,
    65.58772563346119,
    66.03865963511971,
    87.29824204000374
  ]);

  var last;
  for (var i = 0; i < place.times.length; i++) {
    var p = place.point(place.times[i], last);
    delete p.bearing;
    if (p.speedchange === undefined) {
      t.deepEqual(p, {
        coords: place.coords[i],
        speed: place.speeds[i]
      });      
    } else {
      t.deepEqual(p, {
        coords: place.coords[i],
        speed: place.speeds[i],
        speedchange: place.speeds[i] - place.speeds[i - 1] 
      });
    }
    last = p;
  }

  t.deepEqual(place.point(3000, { coords: [ -77.03242338052249, 38.912603000020766 ]}), {
    coords: [ -77.03244251940518, 38.912603000030884 ],
    bearing: -89.99995506617553,
    speed: 8.809476663513983
  });

  t.deepEqual(place.point(6000, { coords: [ -77.032595, 38.912603 ]}), {
    coords: [ -77.03264101805723, 38.912603000007245 ],
    bearing: -89.99997394272637,
    speed: 23.809760149737066
  });

  t.end();
});

test('seeker', function(t) {
  t.test('austin', function(assert) {
    var austin = JSON.parse(JSON.stringify(require('./fixtures/austin.v5')));
    var geojson = route(austin);
    var step;
    var results = [];
    for (var i = 0; i < 2; i++) {
      var emitter = new Emitter(geojson, 100, i);
      for (var j = 0; j < 5; j++) {
        step = emitter.next();
        results.push(step);
      }
    }

    t.deepEqual((results[0].coords), route(austin).geometry.coordinates[0]);
    t.deepEqual((results[5].coords), route(austin).geometry.coordinates[1]);
    results.splice(5,1); // remove the starter position for the second emission event
    for (k = 1; k < results.length; k++) {
      t.ok(results[k].bearing > 90 && results[k].bearing < 180, 'Bearing should be between 90 and 180');
      t.ok(results[k].coords[0] > results[k-1].coords[0], 'Longitude should be larger than previous step if bearing is between 90 and 180');
      t.ok(results[k].coords[1] < results[k-1].coords[1], 'Latitude should be smaller than previous step if bearing is between 90 and 180');
    }
    assert.end();
  });
  t.end();
});
