
var scene, renderer;
var mesh;

var stats, meter;

var htracker;

var origDist = null;
var currDist = null;

var head = {x: 0, y: 0, z: 0, angle: 90};

var cc;

var camera;
var origCamDist = 130;

var webcamReady = false;

var theta = 0;

pre();

function pre() {
	init();
}

function init() {

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setSize( window.innerWidth, window.innerHeight );
	renderer.shadowMapEnabled = true;
	renderer.shadowMapSoft = true;
	renderer.shadowMapWidth = 2048;
	renderer.shadowMapHeight = 2048;
	renderer.shadowMapType = THREE.PCFSoftShadowMap;

	document.body.appendChild(renderer.domElement);


	camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 10000 );
	camera.position.z = origCamDist;
	camera.position.y = 0;


	scene = new THREE.Scene();

	addLights();

	addGround();

	addCCPrototype();

	addStats();

	setupUI();

	setupTracking();

	animate();


	window.addEventListener( 'resize', onWindowResize, false );
}

function setupTracking() {
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
			webcamReady = true;
			$('#intro-msg').html('everything looks good');
			var msg = statusMessages[ev.status];
			console.log(ev.status, msg);
			htmsg.html(msg);
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
			$('#intro').fadeOut(500, function(ev){
				$('#intro').remove(); });
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
	var light = new THREE.AmbientLight(0x404040);
	scene.add(light);

	var pointLight = new THREE.PointLight(0xFFFFFF);

	pointLight.position.x = 100;
	pointLight.position.y = 20;
	pointLight.position.z = 100;

	//pointLight.castShadow = true;
	//pointLight.shadowDarkness = 0.2;

	scene.add(pointLight);

	var dl = new THREE.DirectionalLight(0xFFFFFF);

	dl.position.x = 100;
	dl.position.y = 200;
	dl.position.z = 100;

	dl.castShadow = true;
	dl.shadowDarkness = 0.2;

	scene.add(dl);
}

function addGround() {

}

function addCCPrototype() {
	var geo = new THREE.BoxGeometry(100, 50, 50);

	var texture = THREE.ImageUtils.loadTexture( 'textures/crate.gif' );
	texture.anisotropy = renderer.getMaxAnisotropy();

	var mat = new THREE.MeshPhongMaterial({ map: texture });

	cc = new THREE.Mesh(geo, mat);

	scene.add(cc);

	cc.position.z = 10;
}

function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );
}

function animate() {
	requestAnimationFrame( animate );
	
	meter.tickStart();
	
	theta += 0.004;

	//var ratio = head.z/origDist;

	//var camDist = origCamDist * Math.pow(ratio, 1.5);

	//hack, need to figure out calibration scheme
	var f = 4;

	cc.position.x = head.x*f;
	cc.position.y = head.y*f;
	cc.position.z = -head.z*f;

	cc.rotation.z = Math.PI/2 - head.angle;

	//camera.position.x = camDist * Math.sin(theta);
	//camera.position.z = camDist * Math.cos(theta);
	
	//camera.lookAt(scene.position);
	//camera.rotation.z = headAngle - Math.PI/2;

	TWEEN.update();

	renderer.render( scene, camera );

	//stats.update();
	meter.tick();
}
