(function(){

	var apiProtocol = window.location.protocol == 'file:' ? 'http:' : '';
	var recommendationApi = apiProtocol + '//ec2-52-71-240-15.compute-1.amazonaws.com:8000/queries.json';

	window.API = {
		getUsers: function(onSuccess, onError) {
			onSuccess(mockData('users'))
		},

		getLevels: function(onSuccess, onError) {
			get(
				'https://s3.amazonaws.com/prc.pio.doe/prc_challengelevels.json',
				function(response) {
					onSuccess(response['challenge-level'])
				},
				function(error) {
					onSuccess(mockData('levels')['challenge-level'])
				}			
			)
		},

		getRecommendations: function(userId, level, onSuccess, onError) {
			var postData = {'user': userId};
			if (level) {
				postData.fields = {
			      "name": "challenge-level",
			      "values": [level],
			      "bias": -1 
			    }
			}
			post(
				recommendationApi,
				postData,
				function(response) {
					onSuccess(response)
				},
				function(error) {
					onSuccess(mockData('recommendations'))
				}
			)
		},		

		getHistory: function(userId, onSuccess, onError) {
			get(
				apiProtocol + '//ec2-52-71-240-15.compute-1.amazonaws.com:8000/events.json?limit=-1&entityType=user&entityId=' + userId + '&accessKey=MReY8wsp-JlKsjFTYVhnusOzaU_qkSH69TDxPJ2RKJotreQnFqk5KP89IA3APc6c',
				function(response) {
					onSuccess(response)
				},
				function(error) {
					onSuccess(mockData('history'))
				}			
			)			
		},

		getAuthors: function(onSuccess, onError) {
			get(
				'https://s3.amazonaws.com/prc.pio.doe/prc_authors.json',
				function(response) {
					onSuccess(response.author);
				},
				function(error) {
					onSuccess(mockData('authors').author)
				}
			)
		},

		getAuthorBooks: function(userId, level, author, onSuccess, onError) {
			var postData = {
				'user': userId,
				'fields': [
					{
						'name': 'author',
						'values': [author],
						'bias': -1 
					}
				]
			}
			if (level) {
				postData.fields.push({
			      "name": "challenge-level",
			      "values": [level],
			      "bias": -1 
			    })
			}
			post(
				recommendationApi,
				postData,
				function(response) {
					onSuccess(response)
				},
				function(error) {
					onSuccess(mockData('authorBooks'))
				}
			)
		},

		getGenres: function(onSuccess, onError) {
			get(
				'https://s3.amazonaws.com/prc.pio.doe/prc_genres.json',
				function(response) {
					onSuccess(response.genre);
				},
				function(error) {
					onSuccess(mockData('genres').genre)
				}
			)
		},		

		getGenreBooks: function(userId, level, genre, onSuccess, onError) {
			var postData = {
				'user': userId,
				'fields': [
					{
						'name': 'genre',
						'values': [genre],
						'bias': -1 
					}
				]
			}
			if (level) {
				postData.fields.push({
			      "name": "challenge-level",
			      "values": [level],
			      "bias": -1 
			    })
			}			
			post(
				recommendationApi,
				postData,
				function(response) {
					onSuccess(response)
				},
				function(error) {
					onSuccess(mockData('genreBooks'))
				}
			)
		},

		getBook: function(bookId, onSuccess) {
			// Not every api has every book, so a number of apis can be
			// configured. Each will be tried in sequence until the book
			// is found. Book data is mapped to a standard format for the UI.
			var genericCover = "images/blank-cover.jpg";
			var apisToTry = [
				{
					url: 'https://www.googleapis.com/books/v1/volumes?q=isbn:' + bookId + '&key=AIzaSyDUZxL5Bycv3qiWOtMfmmqSLWcZrGARUBk',
					map: function(response) {
						if (response.totalItems) {
							var book = response.items[0].volumeInfo;
							return {
								isbn: bookId,
								title: book.title,
								thumbnail: val(book,'imageLinks.thumbnail') || genericCover,
								url: book.infoLink,
								year: book.publishedDate,
								author: val(book,'authors[0]')
							}
						}
					}
				},
				{
					url: 'https://openlibrary.org/api/books?bibkeys=ISBN:' + bookId + '&jscmd=details&format=json',
					map: function(response) {
						var book = response['ISBN:' + bookId];
						if (book) {
							return {
								isbn: bookId,
								title: val(book,'details.title'),
								thumbnail: val(book,'thumbnail_url').replace('-S.jpg','-M.jpg') || genericCover,
								url: book.info_url,
								year: val(book,'details.publish_date').slice(-4),
								author: val(book,'details.authors[0].name')
							}
						}
					}
				}
			];

			getBook();

			function getBook(apiIndex) {
				apiIndex = apiIndex || 0;
				var api = apisToTry[apiIndex];
				if (api) {
					get(
						api.url,
						function(response) {
							var book = api.map(response);
							if (book) {
								onSuccess(book);
							} else {
								getBook(apiIndex + 1);
							}
						},
						function(error) {
							getBook(apiIndex + 1);
						}
					)
				} else {
					onSuccess(null);
				}
			}
		},

		batch: function(calls, onComplete) {
			var callsComplete = 0;
			var data = {};
			calls.forEach(function(call) {
				if (typeof(call.call) == 'function') {
					call.call(function(response) {
						data[call.returnKey] = response;
						callsComplete ++;
						if (callsComplete === calls.length) {
							onComplete(data);
						}
					})
				}
			})
		}

	};

	function get(url, onSuccess, onError) {
		ajax('get', url, null, onSuccess, onError);
	}

	function post(url, data, onSuccess, onError) {
		ajax('post', url, data, onSuccess, onError);
	}

	function ajax(verb, url, data, onSuccess, onError) {
		$.ajax({
			url: url,
			data: data ? JSON.stringify(data) : '',
			type: verb,
			dataType: verb == 'post' ? 'json' : '',
			success: function(response) {
				if (typeof(onSuccess) == 'function') {
					onSuccess(response);			
				}
			},
			error: function(error) {
				console.log('API UNAVAILABLE (' + url + '):');
				if (typeof(onError) == 'function') {
					onError(error);
				}
			},
			timeout: 3000 // Let's not wait around if the API is offline
		});
	}

	function val(json, keysString) {
		/*
			Returns JSON values without risk of reference error	if keys don't
			exist (in which case an empty string is returned).

			For example, this...
			
				return book && book.details ? book.details.title : '';

			becomes this:
			
				return val(book,'details.title'); 
		*/
		try{ 
			return eval('json.' + keysString)	|| ''
		}
		catch(e){
			return '';
		}
	}

	function mockData(type) {
		return {

			users: [
				{ id: 'SEARCH', name: 'Search...'}, 
				{ id: 'COOPER.DEVER', name: 'Cooper (Grade 11)'}, 
				{ id: 'MAX.TOSELLO', name: 'Max (Grade 10)'}, 
				{ id: 'LUAN.THAI', name: 'Luan (Grade 9)'}, 
				{ id: 'BRYAN.KONG1', name: 'Bryan (Grade 8)'}, 
				{ id: 'NATALIE.DUONG3', name: 'Natalie (Grade 7)'}, 
				{ id: 'EDDIE.WILLIS', name: 'Eddie (Grade 6)'}, 
				{ id: 'SIENNA.CLARK', name: 'Sienna (Grade 5)'}, 
				{ id: 'GEORGIA.THOMAS5', name: 'Georgia (Grade 4)'}, 
				{ id: 'STELLA.ZILLES', name: 'Stella (Grade 3)'}, 
				{ id: 'ETHAN.ELVYLESMANA', name: 'Ethan (Grade 2)'}, 
				{ id: 'HAARIKA.JAGDISHSINGH', name: 'Haarika (Grade 1)'}, 
				{ id: 'BAILEY.CHRAIF', name: 'Bailey (Grade K)'}, 
				{ id: 'unknown', name: 'Fresh Student'}
			],

			levels: { "challenge-level":["K","1","2","3","4","5","6","7","8","9","10","11","12"]},

			recommendations: {
				itemScores: [{"item": "9781906427795", "score": 32.744484 }, {"item": "9781407109374", "score": 31.76931 }, {"item": "9781741690385", "score": 29.515799 }, {"item": "9781742835204", "score": 23.795525 }, {"item": "9780141321271", "score": 23.74041 }, {"item": "9781741690361", "score": 23.567284 }, {"item": "9781741693201", "score": 23.190563 }, {"item": "9781906427504", "score": 22.270454 }, {"item": "9780140563870", "score": 19.242 }, {"item": "9781741660739", "score": 19.080948 }, {"item": "9781741693232", "score": 19.049526 }, {"item": "9781420204933", "score": 18.989965 }, {"item": "9780980348804", "score": 18.923296 }, {"item": "9780140378450", "score": 18.721355 }]
			},

			history: [{"eventId":"cHqYTNVltjxGKXdNkqQP8gAAAS08g2SAgJPBYBicG8s","event":"read","entityType":"user","entityId":"COOPER.DEVER","targetEntityType":"item","targetEntityId":"9780670070541","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:22:56.148Z"},{"eventId":"cHqYTNVltjxGKXdNkqQP8gAAAS08g2SAi1isCFczitI","event":"read","entityType":"user","entityId":"COOPER.DEVER","targetEntityType":"item","targetEntityId":"9780734410160","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:22:08.804Z"},{"eventId":"cHqYTNVltjxGKXdNkqQP8gAAAS08g2SAjgBhKCUdZuU","event":"read","entityType":"user","entityId":"COOPER.DEVER","targetEntityType":"item","targetEntityId":"9780207200038","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:22:17.385Z"},{"eventId":"cHqYTNVltjxGKXdNkqQP8gAAAS08g2SAkMFraAlhUFQ","event":"read","entityType":"user","entityId":"COOPER.DEVER","targetEntityType":"item","targetEntityId":"9780734410894","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:22:19.514Z"},{"eventId":"cHqYTNVltjxGKXdNkqQP8gAAAS08g2SAkhpf5liOD54","event":"read","entityType":"user","entityId":"COOPER.DEVER","targetEntityType":"item","targetEntityId":"9780733614378","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:22:10.857Z"},{"eventId":"cHqYTNVltjxGKXdNkqQP8gAAAS08g2SAlfrucQffMsw","event":"read","entityType":"user","entityId":"COOPER.DEVER","targetEntityType":"item","targetEntityId":"9780744592276","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:22:31.452Z"},{"eventId":"cHqYTNVltjxGKXdNkqQP8gAAAS08g2SAmAlajzyu4eA","event":"read","entityType":"user","entityId":"COOPER.DEVER","targetEntityType":"item","targetEntityId":"9780330413541","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:22:53.802Z"},{"eventId":"cHqYTNVltjxGKXdNkqQP8gAAAS08g2SAmhvxXccndkg","event":"read","entityType":"user","entityId":"COOPER.DEVER","targetEntityType":"item","targetEntityId":"9781740519137","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:22:26.114Z"},{"eventId":"cHqYTNVltjxGKXdNkqQP8gAAAS08g2SAmrChBJ8JZnc","event":"read","entityType":"user","entityId":"COOPER.DEVER","targetEntityType":"item","targetEntityId":"9781920694845","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:22:32.831Z"},{"eventId":"cHqYTNVltjxGKXdNkqQP8gAAAS08g2SAnjlN9NjUFaQ","event":"read","entityType":"user","entityId":"COOPER.DEVER","targetEntityType":"item","targetEntityId":"9780140548969","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:22:53.895Z"},{"eventId":"cHqYTNVltjxGKXdNkqQP8gAAAS08g2SAnl6TzrQyYQs","event":"read","entityType":"user","entityId":"COOPER.DEVER","targetEntityType":"item","targetEntityId":"9781742030081","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:22:41.349Z"},{"eventId":"cHqYTNVltjxGKXdNkqQP8gAAAS08g2SAo3U_WzFmw9I","event":"read","entityType":"user","entityId":"COOPER.DEVER","targetEntityType":"item","targetEntityId":"9780958187831","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:22:19.516Z"},{"eventId":"cHqYTNVltjxGKXdNkqQP8gAAAS08g2SAqH3RECRr-08","event":"read","entityType":"user","entityId":"COOPER.DEVER","targetEntityType":"item","targetEntityId":"9781875875085","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:22:45.583Z"},{"eventId":"cHqYTNVltjxGKXdNkqQP8gAAAS08g2SAqTzJPgH6TqQ","event":"read","entityType":"user","entityId":"COOPER.DEVER","targetEntityType":"item","targetEntityId":"9781741142723","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:22:17.405Z"},{"eventId":"cHqYTNVltjxGKXdNkqQP8gAAAS08g2SArXiICuUAFs0","event":"read","entityType":"user","entityId":"COOPER.DEVER","targetEntityType":"item","targetEntityId":"9781741754605","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:22:56.461Z"},{"eventId":"cHqYTNVltjxGKXdNkqQP8gAAAS08g2SArtPD6mGoS3c","event":"read","entityType":"user","entityId":"COOPER.DEVER","targetEntityType":"item","targetEntityId":"9781863746076","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:22:50.737Z"},{"eventId":"cHqYTNVltjxGKXdNkqQP8gAAAS08g2SAsMJwXtFU9rE","event":"read","entityType":"user","entityId":"COOPER.DEVER","targetEntityType":"item","targetEntityId":"9781862910577","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:22:32.829Z"},{"eventId":"cHqYTNVltjxGKXdNkqQP8gAAAS08g2SAswTHX05LMs8","event":"read","entityType":"user","entityId":"COOPER.DEVER","targetEntityType":"item","targetEntityId":"9780439633765","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:22:47.938Z"},{"eventId":"cHqYTNVltjxGKXdNkqQP8gAAAS08g2SAuiBiGaJ63gA","event":"read","entityType":"user","entityId":"COOPER.DEVER","targetEntityType":"item","targetEntityId":"9781862913608","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:22:25.318Z"}],

			authors: {author:["Verne, Jules","Pierce, Tamora","Duder, Tessa","Carroll, Lewis","Mahy, Margaret","Hathorn, Libby","Herriot, James","Klein, Robin","French, Simon","Stroud, Jonathan","Mattingley, Christobel","Banks, Lynne Reid","Orwell, George"]},

			authorBooks: {"itemScores":[{"item":"9780590451796","score":0.0},{"item":"9780141035871","score":0.0},{"item":"9780141321042","score":0.0}]},

			genres: {genre:["Comedy","Picture books","Poetry","Action adventure","Animal stories","Classics","Family/Relationships","Science fiction","Biographies","Historical fiction","Australian stories","Fantasy","Sports stories","Mystery/Suspense","Drama","School stories","Graphic novels","Love stories","Factual","Short stories"]},
			
			genreBooks: {"itemScores":[{"item":"9780330398138","score":12.114693},{"item":"9780207199110","score":12.054014},{"item":"9780440467014","score":11.74386},{"item":"9780091831608","score":7.000881},{"item":"9780207200427","score":6.664409},{"item":"9781863886420","score":6.4167323},{"item":"9781742750804","score":6.4167323},{"item":"9780552525954","score":6.4167323},{"item":"9780207197802","score":6.3827558},{"item":"9780207200052","score":6.3827558},{"item":"9781862912861","score":6.212424},{"item":"9780746027554","score":6.212424},{"item":"9781406313413","score":6.182085},{"item":"9780207154942","score":6.161591},{"item":"9780207200236","score":6.0490074},{"item":"9780732286798","score":6.0490074},{"item":"9780207200199","score":6.0490074},{"item":"9780207200250","score":6.0490074},{"item":"9781742991245","score":6.0490074},{"item":"9780140370904","score":5.902269}]}
			
		}[type]
	};

})()
