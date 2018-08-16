(function() {
	var sections = [
		{ id: 'recommendations', title:'Recommended books'},
		{ id: 'author', title: 'From authors you might like', init: function(section) {
			$authorList = $('<select id="authorList"></select>').appendTo(section.$.children('.title'));
		}},
		{ id: 'genre', title: 'From genres you might like', init: function(section) {
			$genreList = $('<select id="genreList"></select>').appendTo(section.$.children('.title'));
		}},
		{ id: 'history', title: 'Your reading history'}
	];
	var $authorList;
	var $genreList;
	var $toggleApi = $('.toggleApi');
	var $userList = $('#userList');
	var $levelList = $('#levelsList');
	var pageSize = 5;
	var apiData = {};

	start();

	function start() {
		sections.forEach(function(section) {
			addSection(section);
		});

		API.batch(
			[
				{ call: API.getUsers, returnKey: 'users' },
				{ call: API.getLevels, returnKey: 'levels' },
				{ call: API.getAuthors, returnKey: 'authors' },
				{ call: API.getGenres, returnKey: 'genres' }
			],
			function(data) {
				apiData.users = data.users;
				apiData.levels = data.levels;
				apiData.authors = data.authors;
				apiData.genres = data.genres;
				buildUserList();
				buildLevelsList();
				buildAuthorList();
				buildGenreList();
				$userList.trigger('setValue', apiData.users[1].id);
				selectUser();
			}
		);
	}

	function addSection(section) {
		section.$ = $($('#bookResultsTemplate').html()).appendTo($('#bookResults'));
		section.$.attr('data-type', section.id);
		section.$.find('.title').text(section.title);
		if (typeof(section.init)=='function') {
			section.init(section);
		}
		section.$.find('.showMore').click(function() {
			showResultsNextPage(section);
		});
	}	

	function buildUserList() {
		apiData.users.forEach(function(user) {
			$userList.append('<option value="' + user.id + '">' + user.name + '</option>');
			if (user.id == 'SEARCH') {
				var divider = Array(8).join("&#x2500;");
				$userList.append('<option disabled role=separator>' + divider + '</option>');
			}
		});
		$userList.change(function() {
			selectUser();
		});
	}

	function buildLevelsList() {
		$levelList.append('<option value="">All levels</option>');
		apiData.levels.forEach(function(level) {
			$levelList.append('<option value="' + level + '">Level ' + level + '</option>');
		});
		$levelList.change(function() {
			getBooks();
		});
	}

	function buildAuthorList() {
		apiData.authors.forEach(function(author){
			$authorList.append('<option>' + author + '</option>')
		});
		$authorList.change(function() {
			getBooksForSection($userList.val(), sections[1])
		});
	}

	function buildGenreList() {
		apiData.genres.forEach(function(genre){
			$genreList.append('<option>' + genre + '</option>')
		});
		$genreList.change(function() {
			getBooksForSection($userList.val(), sections[2])
		});
	}

	function selectUser() {
		var id = $userList.val();
		if (id == 'SEARCH') {
			id = window.prompt("Please enter a USER ID (e.g. LUAN.THAI):");
			if (id) {
				var user = getUserById(id);
				if (!user) {
					id = id.replace(/</g, ''); // Ensures no script injection is possible
					apiData.users.push({ id: id, name: id });
					$userList.append('<option value="' + id + '">' + id + '</option>');
				}
			} else {
				id = apiData.users[1].id;
			}
			$userList.trigger('setValue', id);
		}
		getBooks(id);
	}

	function getUserById(id) {
		return apiData.users.find(function(user){return user.id === id});
	}

	function clearSection(section) {
		section.$.find('.book').remove();
		section.$.find('.showMore').hide();
	}

	function getBooks(userId) {
		sections.forEach(function(section) {
			getBooksForSection(userId, section)
		})
	}

	function getBooksForSection(userId, section) {
		clearSection(section);

		if (section.id == 'recommendations') {
			API.getRecommendations(
				userId,
				$levelList.val(),
				function(response) {
					section.books = response.itemScores;
					showResultsNextPage(section);
				}
			);				
		}

		if (section.id == 'author') {
			API.getAuthorBooks(
				userId,
				$levelList.val(),
				$authorList.val(),
				function(response) {
					section.books = response.itemScores;
					showResultsNextPage(section);
				},
				function(error) {
					toggleNoBooksWarning(section, true);
				}
			);				
		}

		if (section.id == 'genre') {
			API.getGenreBooks(
				userId,
				$levelList.val(),
				$genreList.val(),
				function(response) {
					section.books = response.itemScores;
					showResultsNextPage(section);
				},
				function(error) {
					toggleNoBooksWarning(section, true);
				}
			);				
		}

		if (section.id == 'history') {
			API.getHistory(
				userId,
				function(response) {
					section.books = [];
					response.forEach(function(item) {
						if (item.entityId == userId) {
							section.books.push({ item: item.targetEntityId, score: 1})
						}
					});
					showResultsNextPage(section);
				},
				function(error) {
					toggleNoBooksWarning(section, true);
				}
			);				
		}
	}

	function showResultsNextPage(section) {
		$('body').removeClass('loadingBooks');
		for (var i = 0; i < pageSize; i++) {
			showNextResult(section)
		}
	}

	function refreshShowMoreButton(section) {
		section.$.find('.showMore').css('display', section.books.length ? 'inline-block':'none');
		toggleNoBooksWarning(section, !section.$.find('.book').length);
	}

	function toggleNoBooksWarning(section, flag) {
		if (section.$.hasClass('hasNoBooks') != flag) {
			section.$.toggleClass('hasNoBooks');
		}
	}

	function showNextResult(section) {
		var nextBookToGet = getNextBook(section);
		refreshShowMoreButton(section);
		if (nextBookToGet) {
			var $book = addBookToPage(section); // Note: Book appears with spinner until values are set		
			API.getBook(nextBookToGet.item, function(book) {
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
					showNextResult(section);
				}
			})	
		}			
	}

	function getNextBook(section) {
		// Returns next book from OUR api data
		return section.books.splice(0,1)[0]; // Returns next book and removes from array
	}

	function addBookToPage(section) {
		return $($('#bookTemplate').html()).appendTo(section.$.find('.books'))
	}

	function setBookValues($book, book) {
		$book
			.attr('href', book.url)
			.find('.spinner').remove()
		;
		$book.find('.title').text(book.title.length>40 ? book.title.substr(0,38)+'...' : book.title);
		$book.find('.author').text(book.author ? book.author:'');
		$book.find('.year').text(book.year ? book.year:'');
		$book.find('.thumbnail').attr('src', book.thumbnail);
	}

})()
