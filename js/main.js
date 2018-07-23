(function() {
	var $toggleApi = $('.toggleApi');
	var suggestionsApi = 'http://ec2-52-71-240-15.compute-1.amazonaws.com:8000/queries.json';
	var $booksSection = $('.booksSection');
	var $books = $('#books');
	var $bookTemplate = $('.booksSection .template.book');
	var $showMore = $('#showMore');
	var $noBooksFound = $('.noBooksFound');
	var $userList = $('#userList');
	var $modeList = $('#modeList');
	var pageSize = 5;
	var books;
	var history;
	var users = [
		// "books" contains offline data for when api not available 
		{ id:'SEARCH', name:'Search...'},
		{ id:'LUAN.THAI', name:'Luan Thai', books: {"itemScores": [{"item": "9781906427795", "score": 32.744484 }, {"item": "9781407109374", "score": 31.76931 }, {"item": "9781741690385", "score": 29.515799 }, {"item": "9781742835204", "score": 23.795525 }, {"item": "9780141321271", "score": 23.74041 }, {"item": "9781741690361", "score": 23.567284 }, {"item": "9781741693201", "score": 23.190563 }, {"item": "9781906427504", "score": 22.270454 }, {"item": "9780140563870", "score": 19.242 }, {"item": "9781741660739", "score": 19.080948 }, {"item": "9781741693232", "score": 19.049526 }, {"item": "9781420204933", "score": 18.989965 }, {"item": "9780980348804", "score": 18.923296 }, {"item": "9780140378450", "score": 18.721355 } ] } },
		{ id:'EMILY.GREENE7', name:'Emily Greene7', books: {"itemScores": [{"item": "9780143307136", "score": 43.288155 }, {"item": "9780857985545", "score": 43.052124 }, {"item": "9780857985644", "score": 39.428455 }, {"item": "9781449436353", "score": 36.8583 }, {"item": "9781921848001", "score": 36.67954 }, {"item": "9781742833545", "score": 36.43331 }, {"item": "9780061996610", "score": 35.871857 }, {"item": "9780857982162", "score": 34.86473 }, {"item": "9781742755403", "score": 34.534225 }, {"item": "9780857985033", "score": 33.61505 }, {"item": "9781760153038", "score": 33.420876 }, {"item": "9780857985484", "score": 33.30102 }, {"item": "9781743627419", "score": 32.704426 }, {"item": "9781784753894", "score": 31.746603 }, {"item": "9781449436346", "score": 31.581043 }, {"item": "9780061944390", "score": 31.319159 }, {"item": "9781407120690", "score": 31.277494 }, {"item": "9781449425661", "score": 30.946484 }, {"item": "9781449407186", "score": 30.784712 }, {"item": "9781449427771", "score": 30.441566 } ] } },
		{ id:'MEI.YUSHITA', name:'Mei Yushita' },
		{ id:'KEVIN.DUONG3', name:'Kevin Duong3' },
		{ id:'MALCOLM.BLAKEY', name:'Malcolm Blakey' },
		{ id:'HARLEM.ARTHUR', name:'Harlem Arthur' },
		{ id:'NATALIE.DUONG3', name:'Natalie Duong3' },
		{ id:'DANIELLE.STRYDOM', name:'Danielle Strydom' },
		{ id:'MICHELLE.TIEU', name:'Michelle Tieu' },
		{ id:'NATASHA.FLAHEY', name:'Natasha Flahey' }
	];

	start();

	function start() {
		buildUserList();
		bindEvents();
	}

	function bindEvents() {
		$showMore.click(function() {showResultsNextPage()});
		$toggleApi.click(function() {
			$toggleApi.toggleClass('on');
			selectUser();
		});
		$userList.change(function() {
			$modeList.trigger('setValue', 'suggestions');
			selectUser();
		});
		$modeList.change(function() {
			selectUser();
		});
	}

	function buildUserList() {
		users.forEach(function(user) {
			$userList.append('<option value="' + user.id + '">' + user.name + '</option>');
			if (user.id == 'SEARCH') {
				var divider = Array(8).join("&#x2500;");
				$userList.append('<option disabled role=separator>' + divider + '</option>');
			}
		});
		$userList.trigger('setValue', users[1].id);
		selectUser();
	}

	function selectUser() {
		var id = $userList.val();
		if (id == 'SEARCH') {
			id = window.prompt("Please enter a USER ID (e.g. LUAN.THAI):");
			if (id) {
				var user = getUserById(id);
				if (!user) {
					id = id.replace(/</g, ''); // Ensures no script injection is possible
					users.push({ id: id, name: id });
					$userList.append('<option value="' + id + '">' + id + '</option>');
				}
			} else {
				id = users[1].id;
			}
			$userList.trigger('setValue', id);
		}
		getBooks(id);
	}

	function getUserById(id) {
		return users.find(function(user){return user.id === id});
	}

	function clearBooks() {
		$books.find('.book').remove();
		$showMore.hide();
		$('body').addClass('loadingBooks');
	}

	function getBooks(id) {
		clearBooks();
		if ($modeList.val()=='history') {
			getHistory(function(){
				books = [];
				history.forEach(function(item) {
					if (item.entityId == $userList.val()) {
						books.push({ item: item.targetEntityId, score: 1})
					}
				});
				showResultsNextPage();
			});
		} else {
			if (!$toggleApi.hasClass('on')) {
				getCachedData(id);
				return;
			}
			$.ajax({
				url: suggestionsApi,
				data: $modeList.val() == 'popular' ? '' : JSON.stringify({'user': id}),
				type: 'post',
				dataType: 'json',
				success: function(response) {			
					books = response.itemScores;
					showResultsNextPage();
				},
				error: function(error) {
					alert('BOOKS API UNREACHABLE.\rRecommendation Engine for Books (PRC) is unreachable. Local cached data is being displayed instead.');
					$toggleApi.click(); // Switch over to cached data
				},
				timeout: 3000 // Let's not wait around if the API is offline
			});
		}
	}

	function getCachedData(id) {
		// Some cached api responses have been added into the
		// "books" column of the "users" json. This is used
		// when the api is unavailable.
		var user = getUserById(id);
		$('body').removeClass('loadingBooks');
		if (user.books) {
			books = Object.create(user.books.itemScores);
		} else {
			books = []
		}
		showResultsNextPage();
	}

	function getHistory(onComplete) {
		$.ajax({
			url: 'http://ec2-52-71-240-15.compute-1.amazonaws.com:8000/events.json?limit=-1&entityType=user&entityId=' + $userList.val() + '&accessKey=MReY8wsp-JlKsjFTYVhnusOzaU_qkSH69TDxPJ2RKJotreQnFqk5KP89IA3APc6c',
			type: 'get',
			success: function(response) {
				$('body').removeClass('loadingBooks');
				history = response;
				onComplete();
			},
			error: function(error) {
				console.log('HISTORY API UNREACHABLE');
			},
			timeout: 3000 // Let's not wait around if the API is offline
		});
	}

	function showResultsNextPage() {
		$('body').removeClass('loadingBooks');
		for (var i = 0; i < pageSize; i++) {
			showNextResult()
		}
	}

	function refreshShowMoreButton() {
		$showMore.css('display', books.length ? 'inline-block':'none');
		$noBooksFound.css('display', !books.length && !$books.find('.book').length ? 'inline-block':'none');
	}

	function showNextResult() {
		var nextBookToGet = getNextBook();
		refreshShowMoreButton();
		if (nextBookToGet) {
			var $book = addBookToPage(); // Note: Book appears with spinner until values are set		
			getBookInfo(nextBookToGet.item, function(book) {
				if (book) {
					setBookValues($book, book);
					if (!nextBookToGet.score) {
						// Currently a book without a score is a "popular" book
						$book.addClass('isPopular');
					}
					// Timeout below ensures that "isLoading" is removed AFTER the book
					// is rendered. This allows css transitions to correctly transition from
					// a loading state to a non loading state.
					setTimeout(function() {$book.removeClass('isLoading')}, 0); 			
				} else {
					console.log('ISBN ' + nextBookToGet.item + ' cannot be found!');
					$book.remove();
					showNextResult();
				}
			})	
			$booksSection.show();				
		}			
	}

	function getNextBook() {
		// Returns next book from OUR api data
		return books.splice(0,1)[0]; // Returns next book and removes from array
	}

	function addBookToPage() {
		return $bookTemplate
			.clone()
			.appendTo($books)
			.removeClass('template')
		;
	}

	function setBookValues($book, book) {
		$book
			.attr('href', book.url)
			.find('.spinner').remove()
		;
		$book.find('.title').text(book.title.length>55 ? book.title.substr(0,53)+'...' : book.title);
		$book.find('.author').text(book.author ? book.author:'');
		$book.find('.year').text(book.year ? book.year:'');
		$book.find('.thumbnail').attr('src', book.thumbnail);
	}

	function getBookInfo(isbn, callback, useAlternateApi) {
		// Looks up full book info from a third party api
		var book = { isbn: isbn };
		var emptyThumbnail = "https://d1csarkz8obe9u.cloudfront.net/posterpreviews/book-cover-flyer-template-6bd8f9188465e443a5e161a7d0b3cf33.jpg?ts=1456287935";
		var info;
		var url = useAlternateApi ? 
			'https://openlibrary.org/api/books?bibkeys=ISBN:' + isbn + '&jscmd=details&format=json'
			:
			'https://www.googleapis.com/books/v1/volumes?q=isbn:' + isbn + '&key=AIzaSyDUZxL5Bycv3qiWOtMfmmqSLWcZrGARUBk'
		;
		$.ajax({
			url: url,
			type: 'get',
			success: function(response) {
				if (!useAlternateApi && !response.totalItems) {
					// If first api (Google) returns no book info,
					// use second api.
					getBookInfo(isbn, callback, true);
				} else {
					if (useAlternateApi) {
						info = response['ISBN:' + isbn];
						if (info) {
							book.title = info.details.title;
							book.thumbnail = info.thumbnail_url ? 
								info.thumbnail_url.replace('-S.jpg','-M.jpg') : emptyThumbnail
							;
							book.url = info.info_url;
							book.year = info.details.publish_date;
							book.author = info.details.authors ? info.details.authors[0].name : '';
						} else {
							book = null;
						}
					} else {
						info = response.items[0].volumeInfo;
						book.title = info.title;
						book.thumbnail = info.imageLinks ?
							info.imageLinks.thumbnail :	emptyThumbnail
						;
						book.url = info.infoLink;
						book.year = info.publishedDate;
						book.author = info.authors ? info.authors[0] : '';
					}
					callback(book);
				}
			},
			error: function(error) {
				console.log('PAGE INFO API ERROR:');
				console.log(error);
				if (!useAlternateApi) {
					getBookInfo(isbn, callback, true);
				} else {
					callback(null);
				}
			}
		});
	}

})()