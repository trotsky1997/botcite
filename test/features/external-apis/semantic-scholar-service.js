'use strict';

const assert = require( '../../utils/assert.js' );
const SemanticScholarService = require( '../../../lib/external-apis/SemanticScholarService.js' );

describe( 'lib/external-apis/SemanticScholarService.js', () => {

	it( 'maps a paper payload to zotero-compatible citation content', () => {
		const service = new SemanticScholarService( {
			conf: {
				semanticScholar: {
					enabled: true
				}
			}
		} );

		const result = service.toCitation( {
			paperId: 'paper-123',
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
		}, 'https://arxiv.org/abs/1706.03762' );

		assert.deepEqual( result.itemType, 'conferencePaper' );
		assert.deepEqual( result.title, 'Attention is All you Need' );
		assert.deepEqual( result.url, 'https://arxiv.org/abs/1706.03762' );
		assert.deepEqual( result.publicationTitle, 'Neural Information Processing Systems' );
		assert.deepEqual( result.abstractNote, 'Transformer paper' );
		assert.deepEqual( result.creators[ 0 ].firstName, 'Ashish' );
		assert.deepEqual( result.creators[ 0 ].lastName, 'Vaswani' );
	} );

	it( 'enforces a minimum interval between requests', () => {
		const service = new SemanticScholarService( {
			conf: {
				semanticScholar: {
					enabled: true,
					minIntervalMs: 20
				}
			}
		} );
		const calledAt = [];
		const request = {
			logger: {
				log() {
				}
			},
			issueRequest() {
				calledAt.push( Date.now() );
				return Promise.resolve( {
					status: 200,
					body: {
						paperId: `paper-${ calledAt.length }`
					}
				} );
			}
		};

		return Promise.all( [
			service.getPaper( 'DOI:10.1000/test-1', request ),
			service.getPaper( 'DOI:10.1000/test-2', request )
		] ).then( () => {
			assert.deepEqual( calledAt.length, 2 );
			assert.isAtLeast( calledAt[ 1 ] - calledAt[ 0 ], 15 );
		} );
	} );
} );
