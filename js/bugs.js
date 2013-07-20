( function () {

var svgns = 'http://www.w3.org/2000/svg',
	xlinkns = 'http://www.w3.org/1999/xlink';

window.Bug = function ( list, data ) {
	// Properties
	this.list = list;
	this.data = data;
	this.element = document.createElementNS( svgns, 'g' );
	this.legs = document.createElementNS( svgns, 'use' );
	this.head = document.createElementNS( svgns, 'use' );
	this.shell = document.createElementNS( svgns, 'use' );
	this.anim = document.createElementNS( svgns, 'animateMotion' );
	this.mpath = document.createElementNS( svgns, 'use' );
	this.model = Bug.models[Math.floor( Math.random() * Bug.models.length )],

	// Initialization
	this.update();
	this.legs.setAttributeNS( xlinkns, 'href', '#' + this.model + '-legs' );
	this.head.setAttributeNS( xlinkns, 'href', '#' + this.model + '-head' );
	this.shell.setAttributeNS( xlinkns, 'href', '#' + this.model + '-shell' );
	this.mpath.setAttributeNS( xlinkns, 'href', '#bug-' + this.data.id + '-path' );
	this.anim.setAttribute( 'dur', '800s' );
	this.anim.setAttribute( 'rotate', 'auto' );
	this.anim.setAttribute( 'repeatCount', 'indefinite' );
	this.anim.setAttribute( 'path', Bug.getRandomPath( this.list.rect, list.rect ) );
	this.element.setAttribute( 'id', 'bug-' + this.data.id );
	this.element.appendChild( this.legs );
	this.element.appendChild( this.head );
	this.element.appendChild( this.shell );
	this.element.appendChild( this.anim );
	this.anim.appendChild( this.mpath );
	list.element.appendChild( this.element );
};

Bug.models = [ 'fat', 'skinny' ];

Bug.getRandomPath = function ( rect ) {
	var i,
		path = [
			'M',
			Math.random() * rect.width,
			Math.random() * rect.height
		];

	for ( i = 0; i < 20; i++ ) {
		path.push(
			'C',
			Math.random() * rect.width,
			Math.random() * rect.height,
			Math.random() * rect.width,
			Math.random() * rect.height,
			Math.random() * rect.width,
			Math.random() * rect.height
		);
	}
	path.push(
		'C',
		Math.random() * rect.width,
		Math.random() * rect.height,
		Math.random() * rect.width,
		Math.random() * rect.height,
		path[1],
		path[2]
	);
	return path.join( ' ' ) + 'z';
};

Bug.prototype.update = function ( data ) {
	if ( data ) {
		this.data = data;
	}
	this.shell.setAttribute( 'class', 'shell severity-' + this.data.severity );
};

Bug.prototype.resolve = function () {
	// Remove bug
	this.legs.remove();
	this.head.remove();
	this.shell.remove();

	// Stop animating
	this.anim.endElement();

	// Add splat
	this.splat = document.createElementNS( svgns, 'use' );
	this.splat.setAttributeNS( xlinkns, 'href', '#splat' );
	this.element.appendChild( this.splat );
	this.element.setAttribute( 'class', 'resolved' );
	this.splat.setAttribute( 'class', 'severity-' + this.data.severity );

	// Remove completely in 15 minutes
	setTimeout( this.onCleanup.bind( this ), 900000 );

	// Release memory
	this.list = null;
	this.data = null;
	this.legs = null;
	this.head = null;
	this.shell = null;
};

Bug.prototype.onCleanup = function () {
	this.splat.remove();
	this.anim.remove();
	this.mpath.remove();
	this.element.remove();
	this.splat = null;
	this.anim = null;
	this.mpath = null;
	this.element = null;
};

window.BugList = function() {
	// Properties
	this.canvas = document.getElementById( 'buglist' );
	this.element = document.createElementNS( svgns, 'g' );
	this.rect = this.canvas.getBoundingClientRect();
	this.bugs = {};
	this.updates = 0;

	// Initialization
	this.canvas.appendChild( this.element );
};

BugList.prototype.update = function () {
	$.ajax( {
		'url': 'https://bugzilla.wikimedia.org/jsonrpc.cgi',
		'data': {
			'method': 'Bug.search',
			'params': JSON.stringify( [
				{
					'limit': 500,
					'product': 'VisualEditor',
					'resolution': '',
					'severity': [ 'blocker', 'critical', 'major' ]
				}
			] )
		},
		'dataType': 'jsonp',
		'success': this.onUpdate.bind( this )
	} );
};

BugList.prototype.onUpdate = function ( data ) {
	var i, len, key,
		index = {},
		results = data.result.bugs;

	// Index bugs by ID
	for ( i = 0, len = results.length; i < len; i++ ) {
		index[results[i].id] = results[i];
	}

	// Look for missing bugs
	for ( key in this.bugs ) {
		if ( !index[key] ) {
			this.bugs[key].resolve();
		}
	}

	// Look for new or modified bugs
	for ( key in index ) {
		if ( !this.bugs[key] ) {
			this.bugs[key] = new Bug( this, index[key] );
		} else {
			this.bugs[key].update( index[key] );
		}
	}

	this.updates++;
};

} () );
