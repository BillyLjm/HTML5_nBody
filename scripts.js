/**
 * n-body simulation scripts
 * Utilises HTML canvas
 * @author: Billy.Ljm
 * @date: 26 July 2015
 */

var canvas;
var ctx;
var animation;
var bodies = [];
var numBodies = 5000; // number of bodies
var radius = 3; // radius of bodies
var initspeed = 10; // initial speed of bodies
var gridwidth = radius * 5 // width of grid for collision detection

// cache
var diameter = 2 * radius; // body diameter
var diamsq = Math.pow(diameter, 2); // diameter squared

function init() {
	/**
	 * Initialisation function, called right after document loaded
	 */
	// function called when the page is loaded
	canvas = document.querySelector("#myCanvas");
	ctx = canvas.getContext('2d');
	
	// For initial value
	canvas.width = window.innerWidth;
	canvas.height = window.innerHeight;
	
	// create new bodies
	for (i = 0; i < numBodies; i++) {
		bodies.push(new randBody());
	}
	
	animation = requestAnimationFrame(animationLoop)

	// For dealing with window resize
	window.onresize = function() {
		// resize canvas
		canvas.width = window.innerWidth;
		canvas.height = window.innerHeight;
		
		// move all bodies into resized canvas
		for (i = 0; i < bodies.length; i++) {
			bodies[i].x = Math.min(bodies[i].x, canvas.width);
			bodies[i].y = Math.min(bodies[i].y, canvas.height);
		}
	};
}

function animationLoop(timeStamp) {
	/**
	 * animation loop
	 */
	update();
	draw();
	animation = requestAnimationFrame(animationLoop);
}

function randBody() {
	/**
	 * creates a body w/ random position & velocity
	 */
	this.x = Math.random() * canvas.width;
	this.y = Math.random() * canvas.height;
	this.vx = (Math.random() - 0.5) * 2 * initspeed;
	this.vy = (Math.random() - 0.5) * 2 * initspeed;
}

function draw() { 
	/**
	 * Draw all the bodies
	 */
	ctx.save();
	ctx.clearRect(0, 0, canvas.width, canvas.height)
	for (i = 0; i < bodies.length; i++) {
		ctx.beginPath();
		ctx.arc(bodies[i].x, bodies[i].y, radius, 0, 2*Math.PI);
		ctx.stroke();
	}
	ctx.restore();
}

function update() {
	/**
	 * updates bodies[], main loop
	 */
	// create bins for grid-based collision detection
	spatialgrid = [];
	for (i = 0; i < Math.ceil(canvas.width/gridwidth); i++) {
		spatialgrid[i] =[];
		for (j = 0; j < Math.ceil(canvas.height/gridwidth); j++) {
			spatialgrid[i][j] = [];
		}
	}
	
	var maxgridx, maxgridy, mingridx, mingridy; // used later in binning for collision detection
	for (i = 0; i < bodies.length; i++){
		// move bodies
		bodies[i].x += bodies[i].vx;
		bodies[i].y += bodies[i].vy;
		
		// check for collision w/ walls
		if (bodies[i].x - radius < 0){
			bodies[i].x = 2 * radius - bodies[i].x;
			bodies[i].vx = -bodies[i].vx;
		}
		else if (bodies[i].x + radius > canvas.width) {
			bodies[i].x = 2 * (canvas.width - radius) - bodies[i].x;
			bodies[i].vx = -bodies[i].vx;
		}
		if (bodies[i].y - radius < 0){
			bodies[i].y = 2 * radius - bodies[i].y;
			bodies[i].vy = -bodies[i].vy;
		}
		else if (bodies[i].y + radius > canvas.height) {
			bodies[i].y = 2 * (canvas.height - radius) - bodies[i].y;
			bodies[i].vy = -bodies[i].vy;
		}
		
		// bin corners of bounding box of bodies
		mingridx = (bodies[i].x/gridwidth) >> 0;
		mingridy = (bodies[i].y/gridwidth) >> 0;
		maxgridx = ((bodies[i].x + radius)/gridwidth) >> 0;
		maxgridy = ((bodies[i].y + radius)/gridwidth) >> 0;
		
		// bin bodies into every intersecting grid (for grid-based collision detection)
		if (mingridx != maxgridx && mingridy != maxgridy) {
			spatialgrid[mingridx][mingridy].push(bodies[i]);
			spatialgrid[maxgridx][mingridy].push(bodies[i]);
			spatialgrid[mingridx][maxgridy].push(bodies[i]);
			spatialgrid[maxgridx][maxgridy].push(bodies[i]);
		}
		else if (mingridx != maxgridx) {
			spatialgrid[mingridx][mingridy].push(bodies[i]);
			spatialgrid[maxgridx][mingridy].push(bodies[i]);
		}
		else if (mingridy != maxgridy) {
			spatialgrid[mingridx][mingridy].push(bodies[i]);
			spatialgrid[mingridx][maxgridy].push(bodies[i]);
		}
		else {
			spatialgrid[mingridx][mingridy].push(bodies[i]);
		}
	}
	
	// check for collisions within grid
	var body1, body2; // to store reference to body being checked, for better readability
	var xsep, ysep, distsq; // to calculate  euclidean distance b/w centre of bodies
	var swapvx1, swapvy1, swapvx2, swapvy2; // to calculate magnitude of velocity swap on collision
	var tmp; // to remember values in very short-term
	for (i = 0; i < spatialgrid.length; i++) {
		for (j = 0; j < spatialgrid[i].length; j++) {
			// short-circuit if grid is empty
			if (spatialgrid[i][j].length < 1) {
				continue;
			}
			
			// if grid non-empty, check for collisions b/w all enclosed bodies
			for (ind1 = 0; ind1 < spatialgrid[i][j].length; ind1++) {
				for (ind2 = 0; ind2 < ind1; ind2++) {
					// get 2 bodies
					body1 = spatialgrid[i][j][ind1];
					body2 = spatialgrid[i][j][ind2];
					
					// calculate euclidean distance
					xsep = body1.x - body2.x;
					ysep = body1.y - body2.y;
					distsq = Math.pow(xsep, 2) + Math.pow(ysep, 2);
					
					// if collided
					if (distsq < diamsq) {
						// calculate velocities being swapped
						tmp = (body1.vx * xsep + body1.vy * ysep) / distsq // velocity component of body 1 in direction of axis of collision
						swapvx1 = tmp * xsep;
						swapvy1 = tmp * ysep;
						tmp = (body2.vx * xsep + body2.vy * ysep) / distsq // velocity component of body 2 in direction of axis of collision
						swapvx2 = tmp * xsep;
						swapvy2 = tmp * ysep;
						
						// swap velocities
						body1.vx = body1.vx - swapvx1 + swapvx2;
						body1.vy = body1.vy - swapvy1 + swapvy2;
						body2.vx = body2.vx - swapvx2 + swapvx1;
						body2.vy = body2.vy - swapvy2 + swapvy1;
						
						// separate bodies along collision axis
						tmp = diameter / Math.sqrt(distsq) - 1
						body1.x += xsep * tmp
						body1.y += ysep * tmp
					}
				}
			}
		}
	}
}

