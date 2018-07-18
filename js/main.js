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
		var id = getUserById($userList.val()).id;
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
		// History data is currently a data dump for all students and
		// only gets on startup.
		if (!history) {
			history = [{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAgIq2TTwSA_Q","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780733312618","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAhJjkqV0_vbE","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780670029327","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAhM5tPHSsc08","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781865046013","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAiHyBHut4JcY","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780590551755","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.088Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAivIbWv7FLbk","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780670041572","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAj9qMRoVsAT0","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781877003783","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAkBuwxTqq8wA","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781862913509","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAkWpGpA7hfHk","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780670042494","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAkyl1XD5k1pc","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780207174278","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.088Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAlkUpMZA49YA","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780140554786","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAl1z1pTubU7g","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780744563139","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAl6ArjO9L1kY","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780140502961","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAmmshdqJp-oo","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780670896608","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAm4fc6CO95QA","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780140509717","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAnwyjRhnsxrE","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780734304506","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.088Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAn4A2-rzcsbo","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780864617286","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAn4ZWjynLa3M","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780140544039","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiApECtzKNLYAE","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781865049359","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiApz4-sLnEy9g","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780385602907","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAqQ1GhXDZvKE","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780140509724","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAr_ZHzleRIYU","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780734304582","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAuBg9JWR0hB8","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781846432521","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAuefNNilJz-I","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780864611321","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.088Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAu13rLML2JJc","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781863888479","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAu571bDRR8Ko","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780001713222","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAvCsSDdWOUP4","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781760293918","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAvFBCvTmHUSM","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780552545648","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAvVb9jR3kPv0","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780733307492","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAv4dYX-0gZVM","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781876289515","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.088Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAASXk0jiAv7jULJj3N3E","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780140564198","properties":{},"eventTime":"2010-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:26:24.087Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAgx9HEE1qbco","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781405211222","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.021Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAg9_y6bJPxLY","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780744570175","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.021Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAhNTPQKhSo_4","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781921529047","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.021Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAhWLnwaST3FI","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781862914124","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.022Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAiWzg2qHMCNM","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780688008468","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.021Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAi1lO0mxOEEY","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780744575743","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.022Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAjLYU4uJT7M8","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780733306143","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.022Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAluxy76uI65U","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780552545648","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.022Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAmtnlzvZ0UAk","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781863888479","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.022Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAnGbzcT8HpEs","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781564025968","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.022Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAnHvUqbPNO04","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781844285006","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.022Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAn67nKb7QZvg","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781406308662","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.021Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAor26LzS9VmM","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780140542370","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.021Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAou8LEVyR7rA","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780099408390","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.022Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SApYuCgWY-sIo","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781862913523","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.021Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SApkO07VeCUFs","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781865046013","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.021Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAqW0m21CTf_o","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781862913509","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.021Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAqxjsC2IOHhM","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780744531480","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.022Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAs2btzLCzZXs","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780744549348","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.021Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAtAkGXJhDdvs","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780744561654","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.022Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAtEzL9ohBG8w","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780140501179","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.022Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAt7CaAfII1qc","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781865044484","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.022Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAt_wW3dbQBSY","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780440415497","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.021Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAuFFJtBjgcSY","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781405211246","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.021Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAuZQPs7LtGS0","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781862911949","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.022Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAu9UIV-Vn4b4","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781921150739","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.021Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAveqZc9U63Qk","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780207189142","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.022Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAS08g2SAv_1ng5lK7Oc","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780670029327","properties":{},"eventTime":"2011-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:21:45.022Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATSUNJCAgliq7PGD_oI","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780207198960","properties":{},"eventTime":"2012-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:18:24.462Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATSUNJCAhVgNGO5xZ2E","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780734401748","properties":{},"eventTime":"2012-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:18:24.463Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATSUNJCAhd-2ABpjfiM","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780140568226","properties":{},"eventTime":"2012-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:18:22.385Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATSUNJCAhotwdZ0LBa0","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780143501756","properties":{},"eventTime":"2012-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:18:36.588Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATSUNJCAizYuUap9Ies","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780141311357","properties":{},"eventTime":"2012-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:18:38.708Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATSUNJCAlXrdiIVv6XI","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780330423892","properties":{},"eventTime":"2012-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:18:16.792Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATSUNJCAmAF7euRJSMY","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781921690532","properties":{},"eventTime":"2012-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:18:16.791Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATSUNJCAnZ1gZSiYxt8","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780416774207","properties":{},"eventTime":"2012-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:18:35.737Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATSUNJCAnmwg9zsCy_8","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781921529696","properties":{},"eventTime":"2012-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:18:27.997Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATSUNJCAn1L398KtZME","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780207188398","properties":{},"eventTime":"2012-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:18:16.792Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATSUNJCAn9AX6VpbuFQ","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781862913394","properties":{},"eventTime":"2012-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:18:28.003Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATSUNJCAoDCbYx2GLpQ","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780141311296","properties":{},"eventTime":"2012-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:18:38.530Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATSUNJCArF18LIesgkw","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781869438265","properties":{},"eventTime":"2012-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:18:28.504Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATSUNJCAsRKQ_0C3_aU","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781864482423","properties":{},"eventTime":"2012-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:18:36.590Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATSUNJCAtRTrefKYOz8","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780141311388","properties":{},"eventTime":"2012-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:18:10.316Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATSUNJCAuHdF_Rz6m0w","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780141311340","properties":{},"eventTime":"2012-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:18:10.316Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATvxDBiAgblPTS6EZRk","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780734405074","properties":{},"eventTime":"2013-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:13:30.141Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATvxDBiAhpDfWrkzcvo","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781841212760","properties":{},"eventTime":"2013-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:13:45.632Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATvxDBiAh4Y3jNvPzKM","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781876615000","properties":{},"eventTime":"2013-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:13:46.077Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATvxDBiAj3wa0QfXh1A","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781864482423","properties":{},"eventTime":"2013-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:13:30.142Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATvxDBiAj8YxStEhN9w","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780143301417","properties":{},"eventTime":"2013-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:13:39.063Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATvxDBiAj83pEPF_tY4","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781864486889","properties":{},"eventTime":"2013-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:13:46.169Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATvxDBiAkOM6u2Ewok8","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781863881203","properties":{},"eventTime":"2013-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:13:45.632Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATvxDBiAlB0re2oX0hA","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780141311357","properties":{},"eventTime":"2013-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:13:46.001Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATvxDBiAlN-Qz23Zm_s","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780751339222","properties":{},"eventTime":"2013-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:13:43.940Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATvxDBiAmUQCdFHsfaw","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781921564079","properties":{},"eventTime":"2013-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:13:41.511Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATvxDBiAmXnHVH7X-gU","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781741148770","properties":{},"eventTime":"2013-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:13:41.833Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATvxDBiAqCVoO1xL7eg","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780734401748","properties":{},"eventTime":"2013-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:13:45.632Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATvxDBiAsDiZdtQdbVA","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781921564062","properties":{},"eventTime":"2013-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:13:39.150Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATvxDBiAtmxH56Ibkx0","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781904550754","properties":{},"eventTime":"2013-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:13:43.943Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATvxDBiAtxs2x6vITQE","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780140381481","properties":{},"eventTime":"2013-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:13:45.631Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATvxDBiAt1kB9FFW3hU","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780007105472","properties":{},"eventTime":"2013-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:13:41.820Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAATvxDBiAv8KisPLVSlI","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780749702724","properties":{},"eventTime":"2013-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T22:13:57.305Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUNIvUSAgWxblMbRNBs","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780747591078","properties":{},"eventTime":"2014-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:17:58.269Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUNIvUSAlHqBYXjRmaA","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781921541780","properties":{},"eventTime":"2014-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:18:02.036Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUNIvUSAlj01SSqUIoE","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780868966434","properties":{},"eventTime":"2014-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:17:58.269Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUNIvUSAmVAKuVjB3v4","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781844430888","properties":{},"eventTime":"2014-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:18:00.853Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUNIvUSAmqyBxjfh0Hw","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781864481709","properties":{},"eventTime":"2014-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:17:42.336Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUNIvUSAosxYGWkRffw","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780141308807","properties":{},"eventTime":"2014-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:17:46.742Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUNIvUSAo3bkeKine90","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780141314563","properties":{},"eventTime":"2014-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:18:00.852Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUNIvUSAo4Hs2UjqO34","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780140543629","properties":{},"eventTime":"2014-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:17:43.321Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUNIvUSApNACKYP0lPk","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780744592276","properties":{},"eventTime":"2014-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:17:59.964Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUNIvUSAqPYKEQlrUrA","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781741754827","properties":{},"eventTime":"2014-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:17:43.321Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUNIvUSAq5I1zNbCFDk","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780141306551","properties":{},"eventTime":"2014-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:17:46.742Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUNIvUSArKlmnJJvyS8","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780670072361","properties":{},"eventTime":"2014-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:17:43.714Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUNIvUSAs9g0fzKpN6Q","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781742030081","properties":{},"eventTime":"2014-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:18:01.507Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUNIvUSAuAEi5eJgbKY","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780141311357","properties":{},"eventTime":"2014-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:17:46.742Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUNIvUSAuCmDvl673SI","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780747562184","properties":{},"eventTime":"2014-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:18:02.036Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUNIvUSAuVP1rpe157U","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780207196089","properties":{},"eventTime":"2014-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:18:06.324Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUqgbnCAgAFfjhyUZQI","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780747584667","properties":{},"eventTime":"2015-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:12:44.237Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUqgbnCAgGdNRbdite8","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780747591078","properties":{},"eventTime":"2015-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:12:44.045Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUqgbnCAgU9k6CdYKWs","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780330360784","properties":{},"eventTime":"2015-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:13:43.550Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUqgbnCAgqY-FUCmpN4","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780141319148","properties":{},"eventTime":"2015-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:14:31.475Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUqgbnCAhDsAwBZ-7as","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780958162548","properties":{},"eventTime":"2015-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:13:58.606Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUqgbnCAkcVwkVlxewI","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780702238802","properties":{},"eventTime":"2015-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:13:48.725Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUqgbnCAnOgZMcgBrlw","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780747558194","properties":{},"eventTime":"2015-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:12:27.869Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUqgbnCAnxWNuxAOyGE","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781407109084","properties":{},"eventTime":"2015-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:14:33.072Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUqgbnCAokqSzVRAtgI","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781862913929","properties":{},"eventTime":"2015-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:13:47.608Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUqgbnCAqU-HuGsI_vg","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781741697520","properties":{},"eventTime":"2015-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:12:44.046Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUqgbnCAqhowQcv4d8U","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780747546290","properties":{},"eventTime":"2015-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:12:19.776Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUqgbnCArHvPRFbw6mE","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780747562184","properties":{},"eventTime":"2015-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:12:35.523Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUqgbnCArubwrUzL-ms","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780747550990","properties":{},"eventTime":"2015-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:12:22.646Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUqgbnCAsEtEy9k7WQY","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780439358064","properties":{},"eventTime":"2015-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:14:02.862Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUqgbnCAsa6oBuEFPkQ","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781921529788","properties":{},"eventTime":"2015-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:13:48.772Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUqgbnCAvinEgrgTo90","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780385742887","properties":{},"eventTime":"2015-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:14:43.280Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUqgbnCAvlc1IsgkId8","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780141319131","properties":{},"eventTime":"2015-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:14:40.125Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAUqgbnCAv8-tY9D5c8s","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781741697735","properties":{},"eventTime":"2015-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:14:02.862Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVH4H5yAlZmdAmt_taM","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780747562184","properties":{},"eventTime":"2016-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:07:45.955Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVH4H5yAn8mPuEx_G9Q","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780747550990","properties":{},"eventTime":"2016-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:08:02.640Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVH4H5yAolY3b4gmfik","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780747546290","properties":{},"eventTime":"2016-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:07:50.479Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVlU9ySAgIpjbaGjfzw","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781741690330","properties":{},"eventTime":"2017-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:03:45.286Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVlU9ySAgLU4TqXEo_s","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781407109084","properties":{},"eventTime":"2017-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:03:37.357Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVlU9ySAhi4NPSC7PnI","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780439358064","properties":{},"eventTime":"2017-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:03:09.077Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVlU9ySAiFOMZIpJKfc","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780064401845","properties":{},"eventTime":"2017-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:03:03.898Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVlU9ySAjn30zd5afGQ","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781407109367","properties":{},"eventTime":"2017-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:03:21.711Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVlU9ySAj0jpzpXn0LM","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780141317571","properties":{},"eventTime":"2017-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:02:49.546Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVlU9ySAkL2tiJ2zdXY","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780141304878","properties":{},"eventTime":"2017-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:02:53.807Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVlU9ySAkV0iZEilfkY","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780140435221","properties":{},"eventTime":"2017-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:03:18.100Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVlU9ySAkzffLIFDugg","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780747591078","properties":{},"eventTime":"2017-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:03:17.393Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVlU9ySAlZCpqdXOjAA","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780751565355","properties":{},"eventTime":"2017-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:02:39.903Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVlU9ySAoCwMpe2XVBg","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780747546290","properties":{},"eventTime":"2017-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:03:37.741Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVlU9ySAow7e8BwQfDM","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781862302815","properties":{},"eventTime":"2017-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:03:03.357Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVlU9ySAsAGnBy1llLI","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780007534944","properties":{},"eventTime":"2017-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:02:57.017Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVlU9ySAsjitsxupkh8","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781741690347","properties":{},"eventTime":"2017-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:03:45.286Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVlU9ySAte2OE1PFq-c","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780007420414","properties":{},"eventTime":"2017-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:03:45.286Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVlU9ySAtgTX5TN-tVs","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9781741690354","properties":{},"eventTime":"2017-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:02:49.539Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVlU9ySAt9-mWXXRqq8","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780006754022","properties":{},"eventTime":"2017-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:03:21.868Z"},{"eventId":"qa-nQnhjfkpjyjFbCM3I-QAAAVlU9ySAuu1wXru_HsY","event":"read","entityType":"user","entityId":"LUAN.THAI","targetEntityType":"item","targetEntityId":"9780747584667","properties":{},"eventTime":"2017-01-01T00:00:00.000+11:00","creationTime":"2018-06-28T05:03:01.039Z"}];

			// API CURRENTLY NOT CROSS ORIGIN AND CANNOT BE USED

			// $.ajax({
			// 	url: 'https://s3.amazonaws.com/prc.pio.doe/events.json',
			// 	type: 'get',
			// 	success: function(response) {
			// 		$('body').removeClass('loadingBooks');
			// 		books = response.itemScores;
			// 		showResultsNextPage();
			// 	},
			// 	error: function(error) {
			// 		console.log('HISTORY API UNREACHABLE');
			// 	},
			// 	timeout: 3000 // Let's not wait around if the API is offline
			// });
		}
		onComplete();
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