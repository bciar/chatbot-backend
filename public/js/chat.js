$(document).ready(function() {



	// chat collapse
	$("[data-toggle='chat']").click(function() {
		var toggler = $(this);
		var chatId = toggler.data("target");
		var chat = $(chatId);

		toggler.toggleClass("show");
		chat.toggleClass("show");

	});

});