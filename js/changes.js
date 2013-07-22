( function () {

/*
 * Data example
 *
 *	{
 *		"kind": "gerritcodereview#change",
 *		"id": "mediawiki%2Fextensions%2FVisualEditor~master~I4adede9e05fd2236cee50ce03f597e8ff6b1914d",
 *		"project": "mediawiki/extensions/VisualEditor",
 *		"branch": "master",
 *		"topic": "bug/47742",
 *		"change_id": "I4adede9e05fd2236cee50ce03f597e8ff6b1914d",
 *		"subject": "[WIP] Source code editing",
 *		"status": "NEW",
 *		"created": "2013-06-14 06:09:03.000000000",
 *		"updated": "2013-07-20 14:03:52.000000000",
 *		"mergeable": true,
 *		"_sortkey": "002687eb00010c07",
 *		"_number": 68615,
 *		"owner": {
 *			"name": "StoneBird"
 *		}
 *	}
 */

window.Change = function ( list, data ) {
	// Properties
	this.list = list;
	this.data = data;
	this.$ = $( '<li>' );
	this.$number = $( '<div>' );
	this.$subject = $( '<div>' );
	this.$topic = $( '<div>' );
	this.$owner = $( '<div>' );

	// Initialization
	this.update( data );
	this.$number.addClass( 'change-number' );
	this.$subject.addClass( 'change-subject' );
	this.$topic.addClass( 'change-topic' );
	this.$owner.addClass( 'change-owner' );
	this.$
		.addClass( 'change' )
		.append( this.$number, this.$subject, this.$topic, this.$owner );
};

Change.prototype.resolve = function () {
	this.$.remove();
};

Change.prototype.update = function ( data ) {
	if ( data ) {
		this.data = data;
	}
	this.$number.text( data._number );
	this.$subject.text( data.subject );
	this.$topic.text( data.topic );
	this.$owner.text( data.owner.name );
	if ( data.mergeable ) {
		this.$.addClass( 'change-mergable' );
	} else {
		this.$.removeClass( 'change-mergable' );
	}
};

window.ChangeList = function () {
	// Properties
	this.$ = $( '#changelist' );
	this.changes = {};
	this.sequence = [];

	// Initialization
	this.$.addClass( 'changelist' );
};

ChangeList.prototype.update = function () {
	$.ajax( {
		'url': 'proxy.php',
		'data': {
			'url': 'https://gerrit.wikimedia.org/r/changes/?q=' + escape( [
				'status:open',
				'project:mediawiki/extensions/VisualEditor',
				'-label:Code-Review<=-1',
				'-label:Verified<=-1'
			].join( ' ' ) )
		},
		'dataType': 'json',
		'success': this.onUpdate.bind( this )
	} );
};

ChangeList.prototype.onUpdate = function ( data ) {
	var i, len, key,
		index = {},
		results = JSON.parse( data.contents.substr( 5 ) );

	// Index changes by ID
	for ( i = 0, len = results.length; i < len; i++ ) {
		index[results[i].id] = results[i];
	}

	// Look for missing pipelines
	for ( key in this.changes ) {
		if ( !index[key] ) {
			this.changes[key].resolve();
			delete this.changes[key];
		}
	}

	// Look for new or modified changes
	for ( key in index ) {
		if ( !this.changes[key] ) {
			this.changes[key] = new Change( this, index[key] );
			this.sequence.push( this.changes[key] );
		} else {
			this.changes[key].update( index[key] );
		}
	}

	// Re-order changes by updated time
	this.sequence.sort( function ( a, b ) {
		return a.data.updated < b.data.updated;
	} );
	for ( i = 0, len = this.sequence.length; i < len; i++ ) {
		this.$.append( this.sequence[i].$ );
	}
};

} () );