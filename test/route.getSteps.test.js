var tape = require('tape');
var route = require('../lib/route');

tape('route.getSteps v4', function(assert) {
  var garage = JSON.parse(JSON.stringify(require('./fixtures/garage.v4')));
  var steps = route.getSteps(garage);
  assert.deepEqual(steps.length, 3, 'creates 3 steps');
  // Don't consider the last "arrival" step
  garage[0].steps.slice(0,-1).forEach(function(step, i) {
    assert.deepEqual(steps[i].distance, step.distance, 'step ' + i + ' distance = ' + steps[i].distance);
    assert.deepEqual(steps[i].duration, step.duration, 'step ' + i + ' duration = ' + steps[i].duration);
  });
  assert.deepEqual(steps.reduce(function(memo, step) {
    memo += step.geometry.coordinates.length;
    return memo;
  }, 0), 7, 'has 7 geom coordinates');
  assert.end();
});

tape('route.getSteps v4 with coordinates of different decimal place lengths', function(assert) {
  var sf = JSON.parse(JSON.stringify(require('./fixtures/sf.v4')));
  var steps = route.getSteps(sf);
  assert.deepEqual(steps.length, sf[0].steps.length, 'creates 7 steps');
  // Don't consider the last "arrival" step
  sf[0].steps.slice(0,-1).forEach(function(step, i) {
    assert.deepEqual(steps[i].distance, step.distance, 'step ' + i + ' distance = ' + steps[i].distance);
    assert.deepEqual(steps[i].duration, step.duration, 'step ' + i + ' duration = ' + steps[i].duration);
  });
  assert.deepEqual(steps.reduce(function(memo, step) {
    memo += step.geometry.coordinates.length;
    return memo;
  }, 0), 93, 'has 93 geom coordinates');
  assert.end();
});

tape('route.getSteps v5', function(assert) {
  var garage = JSON.parse(JSON.stringify(require('./fixtures/garage.v5')));
  var steps = route.getSteps(garage);
  assert.deepEqual(steps.length, 2, 'creates 2 steps');
  assert.deepEqual(steps.reduce(function(memo, step) {
    memo += step.geometry.coordinates.length;
    return memo;
  }, 0), 6, 'has 6 geom coordinates');
  assert.end();
});
