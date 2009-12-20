# jQuery.expose

jQuery plugin for *exposing* pars of a web site based on URL fragment (aka "URL hash").

## Example:

	$('view.about').expose(/^([^\/]+)/about\/?$/, function(language) {
		var message;
		if (language === 'sv') message = 'Den här siten är grym';
		else message = 'This site is rad';
		// this refers to the element, just like in jQuery's each iterator.
		$(this).find('p.message').text(message);
	});

The default view, or "index", is the element(s) bound to `""` (the empty string) or a regular expression matching the empty string:

	$('view.home').expose("", function() {
		$(this).html('<p>Welcome! Visit <a href="#en/about">about</a></p>');
	});

The full example (including above snippets):

	<!DOCTYPE HTML>
	<html>
		<head>
			<meta charset="utf-8">
			<script src="jquery-1.3.2.min.js" type="text/javascript" charset="utf-8"></script>
			<script src="jquery.expose.js" type="text/javascript" charset="utf-8"></script>
			<script type="text/javascript" charset="utf-8">
			$(function(){
			
				$('view.home').expose("", function() {
					$(this).html('<p>Welcome! Visit <a href="#en/about">about</a></p>');
				});
			
				$('view.about').expose(/^([^\/]+)\/about\/?$/, function(language) {
					var message;
					if (language === 'sv') message = 'Den här siten är grym';
					else message = 'This site is rad';
					// this refers to the element, just like in jQuery's each iterator.
					$(this).find('p.message').text(message);
				});
			
				// Call once at app start / document load to route current location.
				$.expose();
			});
			</script>
			<style type="text/css" media="screen">
				view { display:none; }
			</style>
		</head>
		<body>
			<header>
				<h1>My awesome site</h1>
			</header>
			<view class="home">
				<p>Replaced by expose handler above</p>
			</view>
			<view class="about">
				<h2>About</h2>
				<p class="message"></p>
				<p>Go back to <a href="#">home</a>.</p>
			</view>
		</body>
	</html>


