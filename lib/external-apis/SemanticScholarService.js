'use strict';

const BBPromise = require( 'bluebird' );

const { validateZotero } = require( '../Exporter.js' );

const DEFAULT_FIELDS = [
	'title',
	'year',
	'authors',
	'externalIds',
	'venue',
	'publicationVenue',
	'publicationDate',
	'abstract',
	'url',
	'openAccessPdf'
];

class SemanticScholarService {

	constructor( app ) {
		const conf = app.conf.semanticScholar || {};
		this.api = conf.api || 'https://api.semanticscholar.org/graph/v1';
		this.apiKey = conf.apiKey || null;
		this.enabled = !!conf.enabled;
		this.fields = Array.isArray( conf.fields ) && conf.fields.length ?
			conf.fields : DEFAULT_FIELDS;
		this.minIntervalMs = Number.isFinite( conf.minIntervalMs ) ?
			conf.minIntervalMs : 1000;
		this.requestTimeout = Number.isFinite( conf.timeout ) ? conf.timeout : 5000;
		this.searchLimit = Number.isFinite( conf.searchLimit ) ? conf.searchLimit : 2;
		this.preferForArxiv = conf.preferForArxiv !== false;
		this._nextRequestAt = 0;
		this._queue = BBPromise.resolve();
	}

	issueRequest( request, requestOptions ) {
		const headers = {};
		if ( this.apiKey ) {
			headers[ 'x-api-key' ] = this.apiKey;
		}

		const options = {
			uri: `${ this.api }${ requestOptions.path }`,
			headers,
			qs: requestOptions.qs,
			timeout: this.requestTimeout
		};

		return this.rateLimit( () => request.issueRequest( options ) );
	}

	rateLimit( callback ) {
		const scheduled = this._queue.then( () => {
			const now = Date.now();
			const waitMs = Math.max( 0, this._nextRequestAt - now );
			this._nextRequestAt = Math.max( this._nextRequestAt, now ) + this.minIntervalMs;
			return BBPromise.delay( waitMs ).then( callback );
		} );

		this._queue = scheduled.reflect();
		return scheduled;
	}

	getPaper( paperId, request ) {
		if ( !paperId ) {
			return BBPromise.reject( 'No paper id provided' );
		}

		request.logger.log( 'debug/other', `Making request to Semantic Scholar for paper ${ paperId }` );

		return this.issueRequest( request, {
			path: `/paper/${ encodeURIComponent( paperId ) }`,
			qs: {
				fields: this.fields.join( ',' )
			}
		} ).then( ( response ) => {
			if ( response && response.status === 200 && response.body && response.body.paperId ) {
				return response.body;
			}
			return BBPromise.reject( `No Semantic Scholar paper found for ${ paperId }` );
		} );
	}

	search( query, request ) {
		if ( !query ) {
			return BBPromise.reject( 'No search query provided' );
		}

		request.logger.log( 'debug/other', `Making request to Semantic Scholar search for ${ query }` );

		return this.issueRequest( request, {
			path: '/paper/search',
			qs: {
				query,
				limit: this.searchLimit,
				fields: this.fields.join( ',' )
			}
		} ).then( ( response ) => {
			if ( response && response.status === 200 && response.body &&
				Array.isArray( response.body.data ) && response.body.data.length ) {
				return response.body.data.slice( 0, this.searchLimit );
			}
			return BBPromise.reject( `No Semantic Scholar results found for ${ query }` );
		} );
	}

	toCitation( paper, originalQuery ) {
		if ( !paper || !paper.title ) {
			throw new Error( 'Invalid Semantic Scholar paper payload' );
		}

		const externalIds = paper.externalIds || {};
		const doi = externalIds.DOI;
		const arxiv = externalIds.ArXiv;
		const abstract = typeof paper.abstract === 'string' ? paper.abstract.trim() : null;
		const openAccessPdf = paper.openAccessPdf && paper.openAccessPdf.url ?
			paper.openAccessPdf.url : null;
		const venue = paper.publicationVenue && paper.publicationVenue.name ?
			paper.publicationVenue.name : paper.venue;
		const citation = {
			itemType: this.resolveItemType( paper ),
			title: paper.title,
			url: this.resolveUrl( paper, originalQuery ),
			libraryCatalog: 'Semantic Scholar',
			accessDate: ( new Date() ).toISOString().slice( 0, 10 )
		};

		if ( doi ) {
			citation.DOI = doi;
		}
		if ( abstract ) {
			citation.abstractNote = abstract;
		}
		if ( venue ) {
			citation.publicationTitle = venue;
		}
		if ( paper.publicationDate ) {
			citation.date = paper.publicationDate;
		} else if ( paper.year ) {
			citation.date = String( paper.year );
		}
		if ( openAccessPdf && citation.url && !citation.url.startsWith( 'https://doi.org/' ) &&
			!citation.url.startsWith( 'https://arxiv.org/abs/' ) ) {
			citation.url = openAccessPdf;
		}
		if ( paper.paperId || arxiv ) {
			const extra = [];
			if ( paper.paperId ) {
				extra.push( `Semantic Scholar Paper ID: ${ paper.paperId }` );
			}
			if ( arxiv ) {
				extra.push( `arXiv: ${ arxiv }` );
			}
			citation.extra = extra.join( '\n' );
		}
		if ( Array.isArray( paper.authors ) && paper.authors.length ) {
			citation.creators = paper.authors.map( ( author ) => this.authorToCreator( author ) )
				.filter( Boolean );
		}

		return validateZotero( null, citation );
	}

	resolveItemType( paper ) {
		const venueType = paper.publicationVenue && paper.publicationVenue.type ?
			paper.publicationVenue.type.toLowerCase() : '';
		const externalIds = paper.externalIds || {};

		if ( venueType === 'conference' ) {
			return 'conferencePaper';
		}
		if ( venueType === 'journal' ) {
			return 'journalArticle';
		}
		if ( externalIds.ArXiv && !venueType ) {
			return 'preprint';
		}
		return 'journalArticle';
	}

	resolveUrl( paper, originalQuery ) {
		const externalIds = paper.externalIds || {};
		if ( externalIds.DOI ) {
			return `https://doi.org/${ externalIds.DOI }`;
		}
		if ( externalIds.ArXiv ) {
			return `https://arxiv.org/abs/${ externalIds.ArXiv }`;
		}
		if ( typeof originalQuery === 'string' && originalQuery.startsWith( 'http' ) ) {
			return originalQuery;
		}
		if ( paper.openAccessPdf && paper.openAccessPdf.url ) {
			return paper.openAccessPdf.url;
		}
		return paper.url;
	}

	authorToCreator( author ) {
		if ( !author || !author.name ) {
			return null;
		}

		const parts = author.name.trim().split( /\s+/ );
		if ( parts.length === 1 ) {
			return {
				creatorType: 'author',
				lastName: parts[ 0 ]
			};
		}

		return {
			creatorType: 'author',
			firstName: parts.slice( 0, -1 ).join( ' ' ),
			lastName: parts.at( -1 )
		};
	}
}

module.exports = SemanticScholarService;
