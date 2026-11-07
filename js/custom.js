$(document).ready(function() {	

	var oldScrollY = window.scrollY;
    var directionText = document.getElementById('header');

	// bandeau
	var bandeauHead = $('.header .bandeau'),
		bandeauHeadheight = bandeauHead.outerHeight();
	if(bandeauHead.length>0) {
		$('.header').css('margin-top', bandeauHeadheight);
		$('#wrapper').css('padding-top', bandeauHeadheight);
	}

    window.onscroll = function (e) {
        if (oldScrollY < window.scrollY) {
            $('body').removeClass('scrolling_top')
        } else {
            $('body').addClass('scrolling_top')
        }
        oldScrollY = window.scrollY;
    }
	
	// menu fixe //
	function checkScroll()
	{
		var posScroll = $(document).scrollTop();

		if(posScroll>0) 
			$('body').addClass('sticky')
		else
			$('body').removeClass('sticky')
	}

    $(window).scroll(function(){
		checkScroll();
	});
	$(window).resize(function(){
		checkScroll();
	});
	checkScroll();


	// menu mobile + custom mobile //
	function displayMobile()
	{
		if($(window).width()>1200) {
			$('.header').removeClass('active'),
			$('.header_nav').removeClass('active'),
			$('.menu_mobile').removeClass('active'),
			$('body').removeClass('active_overflow')
		}
	}
	$(window).resize(function(){
		displayMobile();
	});
    $(window).scroll(function(){
		displayMobile();
	});
	displayMobile();

	$(".menu_mobile").click(function() {
		$(this).toggleClass("active");
		$("body").toggleClass("active_overflow");
		$(".header").toggleClass("active");
		$(".header_nav").toggleClass("active");
		$(".sub").hide();
		$(".menu li i").removeClass("active");
	});
	$(".menu li i").click(function() {
		$(this).toggleClass('active');
		$(".menu").find('.sub').slideUp();
		if($(this).hasClass("active")){
			$(".menu li i").removeClass('active');
			$(this).next().slideToggle();
			$(this).toggleClass('active');
		}
	});

	
	$(".titre_plus").click(function () {
		$(this).toggleClass('active');
		$(".table_plus").find('.hide').slideUp();
		if ($(this).hasClass("active")) {
			$(".titre_plus").removeClass('active');
			$(this).next().slideToggle();
			$(this).toggleClass('active');
		}
	});

	// scroll to top //
	$(".scroll").click(function() {
		var anchor = $(this).attr("href");
		$('html, body').animate({ scrollTop: $(anchor).offset().top }, 1000, "linear");
		return false;
	});

});


// animation //
(function($) {
	$.fn.visible = function(partial) {
		var $t            = $(this),
			$w            = $(window),
			viewTop       = $w.scrollTop(),
			viewBottom    = viewTop + $w.height() -80,
			_top          = $t.offset().top,
			_bottom       = _top + $t.height(),
			compareTop    = partial === true ? _bottom : _top,
			compareBottom = partial === true ? _top : _bottom;
		return ((compareBottom <= viewBottom) && (compareTop >= viewTop));
	  };
})(jQuery);

function triggerAnimations() {
	$(".animate").each(function(i, el) {
		var el = $(el);
		if (el.visible(true)) {
			el.addClass("play"); 
		}
	});
}

$(document).ready(function() {
	triggerAnimations();
	setTimeout(triggerAnimations, 200);
});

$(window).scroll(function(event) {
	triggerAnimations();
});
