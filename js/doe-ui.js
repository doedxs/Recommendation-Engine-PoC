(function() {

	window.DOE = {
		droplists: {
			refresh: setupCustomDroplists
		}
	}

	setupCustomDroplists();

	function setupCustomDroplists() {
		// Converts select tags with "doe_droplist" class into
		// custom droplists which can be styled in any way (by
		// styling the "doe_droplist-styled" element)

		// To set a value:  $('#mySelectTag').trigger('setValue', value)

		$('select.doe_droplist:not(.isConstructed)').each(function() {
			var $select = $(this);
			$select
				.addClass('isConstructed')
				.focus(function() {
					// Before opening the droplist, set a consistent droplist
					// font size and lock the dimensions of the select so things
					// do not move.
					$select
						.css('min-width', $select.width())
						.css('height', $select.height())
						.css('font-size', $('html').css('font-size'))
						.parent().addClass('doe_focusRing')
					;	
				})
				.blur(function() {
					// Revert "open" droplist styles so select can
					// resize if list content changes dynamically.  
					$select
						.css('font-size', 'inherit')
						.css('min-width', 0)
						.css('height', 'auto')
						.parent().removeClass('doe_focusRing')
					;	
				})
				.on('setValue', function(event, val) {
					if (typeof val != 'undefined') {
						$select.val(val); 
					}
					$select.siblings()
						.text($select.find('option:selected').text())
						.data('value', $select.val())
					;
				})
				.change(function() {
					$select.trigger('setValue')
				})
				.wrap('<div class="doe_droplist-wrapper"></div>')
			;
			$('<div class="doe_droplist-styled" aria-hidden="true"></div>').insertBefore($select);
			if ($select.attr('id')) {
				$select.parent().attr('id', $select.attr('id')+'_wrapper');
			}
			$select.siblings().text($select.find('option:selected').text());
		})
	}

})()