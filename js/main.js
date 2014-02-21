
var scene, renderer;

var stats, meter;
var manager;

var debug = 1;

var htracker;

var origDist = null;
var currDist = null;


var head = {x: 0, y: 0, z: 0, angle: 90};

var floor, ceiling, room;

var cc;

var ccLEDs = [
	//todo: add 40 positioned LEDs
	// {p: [x,y,z], n: [0,0,0]}
];

var camera, cameraHelper;

var origCamDist = 130;

var webcamReady = false;
var started = false;

var clock = new THREE.Clock();
var controls;

var theta = 0;

pre();

function pre() {
	init();
}

function init() {

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMapEnabled = true;
	renderer.shadowMapSoft = true;
	renderer.shadowMapWidth = 2048;
	renderer.shadowMapHeight = 2048;
	renderer.shadowMapType = THREE.PCFSoftShadowMap;

	document.body.appendChild(renderer.domElement);

	scene = new THREE.Scene();

	camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 10000);
	camera.position.z = origCamDist;
	camera.position.y = 0;

	cameraHelper = new THREE.CameraHelper(camera);
	//scene.add(cameraHelper);

	controls = new THREE.OrbitControls(camera);

	addCCPrototype();

	addLights();

	addGround();

	addStats();

	setupUI();

	animate();

	setupHeadTracking();

	setupIRTracking();

	window.addEventListener('resize', onWindowResize, false);
}

function setupHeadTracking() {
	var videoInput = document.getElementById('vid');
	var canvasInput = document.getElementById('compare');
	var canvasOverlay = document.getElementById('overlay')
	var debugOverlay = document.getElementById('debug');
	var overlayContext = canvasOverlay.getContext('2d');

	var debugContext = debugOverlay.getContext('2d');

	var settings = {
		ui: 1, // false
		fadeVideo: 1, //true
		debug : debugOverlay,
		calcAngles: true
	};

	var statusMessages = {
		'whitebalance' : 'checking for stability of camera whitebalance',
		'detecting' : 'detecting face',
		'hints' : 'hmm. detecting the face is taking a long time',
		'redetecting' : 'lost track of face, redetecting',
		'lost' : 'lost track of face',
		'found' : 'tracking humanoid face'
	};

	var supportMessages = {
		'no getUserMedia' : 'Unfortunately, the getUserMedia API is not supported in your browser. Try <a href="http://google.com/chrome">downloading Chrome</a> or <a href="http://caniuse.com/stream">another browser that supports getUserMedia</a>. Now using fallback video for facedetection.',
		'no camera' : 'No camera found. Using fallback video for facedetection.'
	};

	// figure out good params for usage?
	//headtrackr.controllers.three.realisticAbsoluteCameraControl(camera, 55, [0,0,0], new THREE.Vector3(0,100,0), {damping : 0.5});

	htracker = new headtrackr.Tracker(settings);
	htracker.init(videoInput, canvasInput);
	htracker.start();

	document.addEventListener('headtrackrStatus', function(ev) {
		var mediamsg = $('#gUMMessage');
		var htmsg = $('#headtrackerMessage');
		
		if (ev.status in supportMessages) {
			var msg = '';
			if (ev.status == 'no getUserMedia') {
				msg = supportMessages[ev.status];
			} else if (ev.status == 'no camera') {
				msg = supportMessages[ev.status];
			} else { //camera, so clear, no this doesn't work
				msg = '';
			}

			mediamsg.html(msg);
		} else if (ev.status in statusMessages) {
			var msg = statusMessages[ev.status];
			console.log(ev.status, msg);
			htmsg.html(msg);

			if (ev.status == 'found') {
				webcamReady = true;
				$('#status-led').show();
				if (!started) {
					$('#intro-msg').html('everything looks good');
					$('#start').addClass('active');
				}
			} else if (ev.status == 'lost' || ev.status == 'redetecting') {
				webcamReady = false;
				$('#status-led').hide();
			}
		}

	}, true);

	document.addEventListener('headtrackingEvent', function(ev) {

		head.x = ev.x.toFixed(2);
		head.y = ev.y.toFixed(2);
		head.z = ev.z.toFixed(2);

		if (!origDist)
			origDist = ev.z.toFixed(2);

		var pcs = ['x:', head.x, ' y:', head.y, 'z: ', head.z];
		var dataStr = pcs.join(' ');

		var _headAngle = (head.angle * (180/Math.PI)).toFixed(1);

		updateTrackingUI();
	});

	document.addEventListener('facetrackingEvent', function(ev) {
		head.angle = ev.angle;

		return;

		// clear canvas
		overlayContext.clearRect(0,0,320,240);
		// once we have stable tracking, draw rectangle
		if (event.detection == "CS") {
			overlayContext.translate(ev.x, ev.y);
			overlayContext.rotate(ev.angle-(Math.PI/2));
			overlayContext.strokeStyle = "#00CC00";
			overlayContext.strokeRect((-(ev.width/2)) >> 0, (-(ev.height/2)) >> 0, ev.width, ev.height);
			overlayContext.rotate((Math.PI/2)-ev.angle);
			overlayContext.translate(-ev.x, -ev.y);
		}
	});

}

function setupIRTracking() {

}

function updateTrackingUI() {
	var pcs = ['x:', head.x, ' y:', head.y, 'z: ', head.z];
	var dataStr = pcs.join(' ');

	var _headAngle = (head.angle * (180/Math.PI)).toFixed(1);

	var info = $('#tracking-info');
	info.html(dataStr + '<span class="pull-right">'+_headAngle+'&deg;</span>');
}

function setupUI() {
	var $start = $('#start');
	var $helper = $('#helper');

	$start.on('mousedown', function(ev){
		if (webcamReady) return;

		$helper.animate({
			opacity: 1,
		}, 1000/60*4, function() { });

		$helper.fadeTo(60, 1);
	});

	$start.on('mouseup', function(ev){
		if (webcamReady) return;
		$helper.fadeTo(300, 0.0);
	});

	$start.on('click', function(ev){
		if (!webcamReady) {
			console.log('webcam not enabled');
		} else {
			started = true;
			$('#intro').fadeOut(500, function(ev){
				$(this).remove();
				$helper.remove();
			});
		}
	});


	$('#reinit-btn').on('click', function(ev){
			if (!webcamReady) return;
			htracker.stop();htracker.start();
			origDist = null;
		});

	var $sidebar = $('#sidebar');

	$('#modes').on('click', '.btn', function(ev){
		var $this = $(ev.currentTarget);
		$this.siblings().removeClass('selected');
		$this.addClass('selected');
	});
}

function addStats() {

var config = {
	interval:  100,     // Update interval in milliseconds.
	smoothing: 10,      // Spike smoothing strength. 1 means no smoothing.
	show:      'fps',   // Whether to show 'fps', or 'ms' = frame duration in milliseconds.
	toggleOn:  'click', // Toggle between show 'fps' and 'ms' on this event.
	decimals:  0,       // Number of decimals in FPS number. 1 = 59.9, 2 = 59.94, ...
	maxFps:    60,      // Max expected FPS value.
	threshold: 100,     // Minimal tick reporting interval in milliseconds.

	// Meter position
	position: 'absolute', // Meter position.
	zIndex:   10,         // Meter Z index.
	left:     'auto',      // Meter left offset.
	top:      'auto',      // Meter top offset.
	right:    '0',     // Meter right offset.
	bottom:   '0',     // Meter bottom offset.
	margin:   '0 0 0 0',  // Meter margin. Helps with centering the counter when left: 50%;

	// Theme
	theme: 'oculus', // Meter theme. Build in: 'dark', 'light', 'transparent', 'colorful'.
	heat:  0,      // Allow themes to use coloring by FPS heat. 0 FPS = red, maxFps = green.

	// Graph
	graph:   1, // Whether to show history graph.
	history: 20 // How many history states to show in a graph.
};

	meter = new FPSMeter($('#meter-container')[0], config);

	//stats = new Stats();
	//document.body.appendChild(stats.domElement);
}

function addLights() {
	var light = new THREE.AmbientLight(0xffffff);
	scene.add(light);

	var pl = new THREE.PointLight(0x3878ff);

	pl.position.x = 100;
	pl.position.y = 200;
	pl.position.z = 100;

	window.pl = pl;

	scene.add(pl);

	var dl = new THREE.DirectionalLight(0xFFFFFF);

	dl.position.x = -200;
	dl.position.y = -200;
	dl.position.z = 100;

	window.dl = dl;

	scene.add(dl);

	var dl = new THREE.DirectionalLight(0xFFFFFF);

	dl.position.x = 200;
	dl.position.y = 50;
	dl.position.z = 200;

	window.dl = dl;

	scene.add(dl);	
}

function addGround() {
	var planeTexture = new THREE.Texture( generateTexture(0) );
	planeTexture.wrapS = THREE.RepeatWrapping;
	planeTexture.wrapT = THREE.RepeatWrapping;
	planeTexture.repeat.x = 2;
	planeTexture.repeat.y = 2;			
	planeTexture.needsUpdate = true;

	var planeGeometry = new THREE.CubeGeometry(1024,1024,1024);
	planeMaterial = new THREE.MeshPhongMaterial({map: planeTexture});
	planeMaterial.side = THREE.BackSide;
	floor = new THREE.Mesh(planeGeometry, planeMaterial);
	floor.rotation.x = -Math.PI/2;
	floor.position.y = 300;

	floor.castShadow = false;
	floor.receiveShadow = true;

	//scene.add(floor);

	ceiling = new THREE.Mesh(planeGeometry, planeMaterial);
	ceiling.rotation.x = -Math.PI/2;
	ceiling.rotation.y = -Math.PI;
	ceiling.position.y = 0;
	scene.add(ceiling);
}

function generateTexture(minus, width, length) {
	var min = minus || false;
	var w = width || 2;
	var l = length || 14;

	var canvas = document.createElement('canvas');
	canvas.width = 512;
	canvas.height = 512;

	var context = canvas.getContext('2d');

	context.fillStyle="#000000";
	context.fillRect(0,0,512,512);

	context.fillStyle="#ffffff";

	for (var x = 0; x < 16; x++) {
		for (var y = 0; y < 16; y++) {
			context.fillRect(32*x,32*y+6,l,w);
			if (min && (y+x)%2 == 0) {
				continue;
			}
			context.fillRect(32*x+6,32*y,w,l);

		};
	};

	return canvas;

}

function addCCPrototype() {
	manager = new THREE.LoadingManager();

	manager.onProgress = function(item, loaded, total) {
		console.log(item, loaded, total);
	};

	var loader = new THREE.ColladaLoader();
	loader.load('models/cc.dae', function colladaReady(collada) {

		cc = collada.scene;

		var s = 20;
		cc.scale.set(s,s,s);

		scene.add(cc);
	} );

}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize(window.innerWidth, window.innerHeight);
	//controls.handleResize();
}

function animate() {
	requestAnimationFrame(animate);
	
	//controls.update( clock.getDelta() );
	meter.tickStart();
	
	theta += 0.004;

	//var ratio = head.z/origDist;

	//var camDist = origCamDist * Math.pow(ratio, 1.5);

	//hack, need to figure out calibration scheme
	var f = 4;

	/*
	cc.position.x = head.x*f;
	cc.position.y = head.y*f;
	cc.position.z = -head.z*f;
	*/

	console.log(cc);

	if(webcamReady && started)
		cc.rotation.z = Math.PI/2 - head.angle;
	
	//camera.lookAt(scene.position);
	//camera.rotation.z = headAngle - Math.PI/2;

	TWEEN.update();

	renderer.render(scene, camera);

	//stats.update();
	meter.tick();
}
