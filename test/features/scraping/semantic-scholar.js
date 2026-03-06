'use strict';

const nock = require( 'nock' );

const assert = require( '../../utils/assert.js' );
const Server = require( '../../utils/server.js' );

describe( 'Semantic Scholar supplementation', () => {

	const server = new Server();

	before( () => server.start( {
		port: 1982,
		zotero: false,
		semanticScholar: {
			enabled: true,
			minIntervalMs: 1000,
			searchLimit: 2
		}
	} ) );

	after( () => {
		nock.cleanAll();
		return server.stop();
	} );

	it( 'resolves arXiv URLs through Semantic Scholar when enabled', () => {
		nock( 'https://api.semanticscholar.org' )
			.get( '/graph/v1/paper/ARXIV%3A1706.03762' )
			.query( true )
			.reply( 200, {
				paperId: 'paper-1706.03762',
				title: 'Attention is All you Need',
				externalIds: {
					ArXiv: '1706.03762'
				},
				authors: [
					{ name: 'Ashish Vaswani' },
					{ name: 'Noam Shazeer' }
				],
				publicationVenue: {
					type: 'conference',
					name: 'Neural Information Processing Systems'
				},
				publicationDate: '2017-06-12',
				abstract: 'Transformer paper'
			} );

		return server.query( 'https://arxiv.org/abs/1706.03762', 'mediawiki', 'en' )
			.then( ( res ) => {
				assert.status( res, 200 );
				assert.deepEqual( res.body[ 0 ].title, 'Attention is All you Need' );
				assert.deepEqual( res.body[ 0 ].itemType, 'conferencePaper' );
				assert.deepEqual( res.body[ 0 ].url, 'https://arxiv.org/abs/1706.03762' );
				assert.isInArray( res.body[ 0 ].source, 'Semantic Scholar', 'Expected Semantic Scholar source' );
			} );
	} );
} );
