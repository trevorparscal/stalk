( function () {

/*
 * Data example
 *
 * {
 *		"url": "https:\/\/gerrit.wikimedia.org\/r\/74853",
 *		"project": "mediawiki\/extensions\/Translate",
 *		"jobs": [
 *			{
 *				"url": "https:\/\/integration.wikimedia.org\/ci\/job\/mwext-Translate-phpcs-HEAD\/1501\/",
 *				"voting": false,
 *				"result": "FAILURE",
 *				"name": "mwext-Translate-phpcs-HEAD"
 *			},
 *			{
 *				"url": "https:\/\/integration.wikimedia.org\/ci\/job\/mwext-Translate-lint\/3288\/",
 *				"voting": true,
 *				"result": "SUCCESS",
 *				"name": "mwext-Translate-lint"
 *			},
 *			{
 *				"url": null,
 *				"voting": true,
 *				"result": null,
 *				"name": "mwext-Translate-testextensions-master"
 *			}
 *		],
 *		"id": "74853,2"
 *	}
 */

window.Pipeline = function ( list, data ) {
	// Properties
	this.list = list;
	this.data = data;
	this.$ = $( '<li>' );
	this.$id = $( '<div>' );

	// Initialization
	this.update( data );
	this.$
		.addClass( 'pipeline' )
		.append( this.$id );
};

Pipeline.prototype.update = function ( data ) {
	if ( data ) {
		this.data = data;
	}
	this.$id.text( data.id );
	this.$
		.removeClass( 'pipeline-check' )
		.removeClass( 'pipeline-gate' )
		.removeClass( 'pipeline-post' )
		.addClass( 'pipeline-' + data.type );
};

Pipeline.prototype.resolve = function () {
	this.$.remove();
};

window.PipelineList = function () {
	// Properties
	this.$ = $( '#pipelinelist' );
	this.pipelines = {};
	this.sequence = [];

	// Initialization
	this.$.addClass( 'pipelinelist' );
};

PipelineList.prototype.update = function () {
	$.ajax( {
		'url': 'proxy.php',
		'data': {
			'url': 'https://integration.wikimedia.org/zuul/status.json'
		},
		'dataType': 'json',
		'success': this.onUpdate.bind( this )
	} );
};

PipelineList.prototype.onUpdate = function ( data ) {
	var i, len, j, key, type, queue, heads,
		index = {},
		results = data.contents.pipelines;

	function getType( name ) {
		if ( name.indexOf( 'check' ) !== -1 || name.indexOf( 'test' ) !== -1 ) {
			return 'check';
		}
		if ( name.indexOf( 'gate' ) !== -1 ) {
			return 'gate';
		}
		if ( name.indexOf( 'post' ) !== -1 ) {
			return 'post';
		}
	}

	// Index pipelines by ID
	for ( i = 0, len = results.length; i < len; i++ ) {
		type = getType( results[i].name );
		queue = results[i].change_queues[0];
		if ( queue.name.indexOf( 'VisualEditor' ) !== -1 ) {
			heads = queue.heads[0];
			if ( heads ) {
				j = heads.length;
				while ( j-- ) {
					if ( heads[j].project.indexOf( 'VisualEditor' ) !== -1 ) {
						heads[j].type = type;
						index[heads[j].id] = heads[j];
					}
				}
			}
		}
	}

	// Look for missing pipelines
	for ( key in this.pipelines ) {
		if ( !index[key] ) {
			this.pipelines[key].resolve();
			delete this.pipelines[key];
		}
	}

	// Look for new or modified pipelines
	for ( key in index ) {
		if ( !this.pipelines[key] ) {
			this.pipelines[key] = new Pipeline( this, index[key] );
			this.sequence.push( this.pipelines[key] );
		} else {
			this.pipelines[key].update( index[key] );
		}
	}

	// Re-order pipelines by updated time
	this.sequence.sort( function ( a, b ) {
		return a.data.updated < b.data.updated;
	} );
	for ( i = 0, len = this.sequence.length; i < len; i++ ) {
		this.$.append( this.sequence[i].$ );
	}
};

} () );