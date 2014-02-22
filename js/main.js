
var scene, renderer, composer;

var stats, meter;
var manager;

var debug = 1;

var htracker;

var origDist = null;
var currDist = null;


var head = {x: 0, y: 0, z: 0, angle: 90};

var floor;
var floorH = -200;

var cc;

var ccLEDs = [
	{p: [100,0,0]},
	{p: [-100,0,0]}
	//todo: add 40 positioned LEDs
	// {p: [x,y,z], n: [0,0,0]}
];

var camera;

var ccRenderer;
var ccCamera, ccCameraHelper;
var ccCamDist = 500;
var ccScene;
var _cc;

var origCamDist = 300;

var webcamReady = false;
var started = false;

var clock = new THREE.Clock();
var controls;

var theta = 0;
var BG_COLOR = 0xcccccc;


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

	renderer.setClearColor(BG_COLOR, 0);

	document.body.appendChild(renderer.domElement);

	scene = new THREE.Scene();
	scene.fog = new THREE.FogExp2( BG_COLOR, 0.0005 );

	if (debug) {
		var axes = new THREE.AxisHelper(30);
		axes.position.y = floorH+2;
		scene.add(axes);
	}

	camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 10, 10000);
	camera.position.z = origCamDist;
	camera.position.y = 0;

	controls = new THREE.OrbitControls(camera);
	controls.maxPolarAngle = Math.PI/2;

	addCCPrototype();

	setupCCCamera();

	addGround();

	addLights();

	addStats();

	setupUI();

	setupPostprocessing();

	animate();

	setupHeadTracking();

	setupIRTracking();

	window.addEventListener('resize', onWindowResize, false);
}

function setupPostprocessing() {
	composer = new THREE.EffectComposer( renderer );
	var rp = new THREE.RenderPass( scene, camera );

	composer.addPass( rp );

	var effectFXAA = new THREE.ShaderPass(THREE.FXAAShader);
	var width = window.innerWidth;
	var height = window.innerHeight;
	effectFXAA.uniforms['resolution'].value.set(1 / width, 1 / height);
	composer.addPass(effectFXAA);

	var vignettePass = new THREE.ShaderPass( THREE.VignetteShader );
	vignettePass.uniforms[ "darkness" ].value = 0.9;
	vignettePass.uniforms[ "offset" ].value = 0.5;
	vignettePass.renderToScreen = true;

	composer.addPass( vignettePass );
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

function setupCCCamera() {
	ccScene = new THREE.Scene();

	var W = 320, H = 240;
	ccRenderer = new THREE.WebGLRenderer({
		canvas: document.getElementById('ir-cam'),
		antialias: true });
	ccRenderer.setSize(320, 240);
	ccRenderer.setClearColor(0x000000, 0);

	//document.body.appendChild(renderer.domElement);

	ccCamera = new THREE.PerspectiveCamera(50, W/H, 10, 1000);
	ccCamera.position.z = ccCamDist;
	ccScene.add(ccCamera);

	var leds = makeCCLEDs();

	_cc = leds;

	ccScene.add(leds);

	var ccCam = new THREE.PerspectiveCamera(50, W/H, 10, 1000);
	ccCam.position.z = ccCamDist;
	scene.add(ccCam);

	ccCameraHelper = new THREE.CameraHelper(ccCam);
	scene.add(ccCameraHelper);
}

function makeCCLEDs() {
	var container = new THREE.Object3D();

	var color = 0xffffff;
	var mat = new THREE.MeshBasicMaterial({color: color});
	
	var geo = new THREE.SphereGeometry(30, 12, 12);

	for (var i = 0, len = ccLEDs.length; i < len; i++) {
		var led = ccLEDs[i];
		var p = led.p;

		var l = new THREE.Mesh(geo, mat);
		l.position.set(p[0], p[1], p[2]);
		container.add(l);
	}

	return container;
}

function setupIRTracking() {
	//todo: 
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
	var ambientLight = new THREE.AmbientLight(0x404040);
	scene.add( ambientLight );

	var dl = new THREE.DirectionalLight(0xffffff);
	dl.position.x = 400;
	dl.position.y = 400;
	dl.position.z = 300;

	dl.shadowMapHeight = dl.shadowMapWidth = 1024;

	dl.shadowCameraLeft = -128;
	dl.shadowCameraRight = 128;
	dl.shadowCameraTop = 128;
	dl.shadowCameraBottom = -128;

	dl.castShadow = true;
	dl.shadowDarkness = 0.2;

	if (debug && 0) dl.shadowCameraVisible = true;

	scene.add(dl);

	var directionalLight = new THREE.DirectionalLight(0x808080);
	directionalLight.position.x = - 1;
	directionalLight.position.y = 1;
	directionalLight.position.z = - 0.75;
	directionalLight.position.normalize();

	scene.add(directionalLight);

	return;

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
	var floorMaterial = new THREE.MeshLambertMaterial({
		color: BG_COLOR,
		side: THREE.DoubleSide });

	var floorGeometry = new THREE.CircleGeometry( 30*200, 200, 0, Math.PI * 2 );

	var floor = new THREE.Mesh(floorGeometry, floorMaterial);
	floor.rotation.x = 90*(Math.PI/180);
	floor.position.y = floorH;
	floor.receiveShadow = true;

	scene.add(floor);

	var grid = makeGrid(30);
	grid.position.y = floorH+1;
	scene.add(grid);
}

function makeGrid(n) {
	var gridSize = 40;

	var tW = gridSize * n;
	var tH = gridSize * n;

	var size = n/2*gridSize, step = gridSize;

	var geometry = new THREE.Geometry();

	for ( var i = - size; i <= size; i += step ) {
		geometry.vertices.push( new THREE.Vector3( - size, 0, i ) );
		geometry.vertices.push( new THREE.Vector3(   size, 0, i ) );

		geometry.vertices.push( new THREE.Vector3( i, 0, - size ) );
		geometry.vertices.push( new THREE.Vector3( i, 0,   size ) );
	}

	var material = new THREE.LineBasicMaterial({
		color: 0xdddddd,
		linewidth: 1,
		transparent: false });

	var line = new THREE.Line(geometry, material);
	line.type = THREE.LinePieces;

	return line;
}

function setMaterial(node, material) {
	node.material = material;
	if (node.children) {
	  for (var i = 0; i < node.children.length; i++) {
	    setMaterial(node.children[i], material);
	  }
	}
}

function addCCPrototype() {
	manager = new THREE.LoadingManager();

	manager.onProgress = function(item, loaded, total) {
		console.log(item, loaded, total);
	};

	var loader = new THREE.ColladaLoader();
	loader.load('models/cc.dae', function colladaReady(collada) {
		cc = collada.scene;

		var mat = new THREE.MeshPhongMaterial({
			color: 0x000000,
			ambient: 0x111111,
			emissive: 0x000000,
			specular: 0xffffff,
			shininess: 10,
			side: THREE.DoubleSide });

		var parameters = {
			color:  "#000000", // color (change "#" to "0x")
			colorA: "#000000", // color (change "#" to "0x")
			colorE: "#000000", // color (change "#" to "0x")
			colorS: "#ffffff", // color (change "#" to "0x")
			shininess: 10
		};

/*		if (mat.ambient)
			mat.ambient.setHex( parameters.colorA.replace("#", "0x") );
		if (mat.emissive)
			mat.emissive.setHex( parameters.colorE.replace("#", "0x") );
		if (mat.specular)
			mat.specular.setHex( parameters.colorS.replace("#", "0x") ); 
		if (mat.shininess)
			mat.shininess = parameters.shininess;*/

		cc.traverse(function(child) {
			setMaterial(child, mat);

			child.castShadow = true;
			child.receiveShadow = false;
		});

		console.log(cc);

		var s = 20;
		cc.scale.set(s,s,s);

		scene.add(cc);
	});

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

	if (webcamReady && started) {
		cc.rotation.z = Math.PI/2 - head.angle;
		_cc.rotation.z = cc.rotation.z;
	}
	
	//camera.lookAt(scene.position);
	//camera.rotation.z = headAngle - Math.PI/2;

	TWEEN.update();

	renderer.render(scene, camera);
	
	if(ccRenderer) {
		ccRenderer.render(ccScene, ccCamera);
		//console.log('cc render');
	}

	//composer.render();

	//stats.update();
	meter.tick();
}
