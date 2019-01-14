var self_id = 0;
var iwant_timer;
var iwant_countdown;

$(function () {
    function setLocalStorage(name, obj) {
        localStorage.setItem('data', JSON.stringify(obj));
    }

    function getLocalStorageObj(name) {
        var retrievedObject = localStorage.getItem(name);
        return JSON.parse(retrievedObject);
    }

    var userObj = getLocalStorageObj('data');
    check(userObj);

    start();

    function check(userObj) {
        if (userObj.name) {
            self_id = userObj.user_id;
            $('span.name').html(userObj.name);
            $('.login').hide();
            $('.loggedin').show();
            var rouletteNum = 0;
            var active = false;
            $(".roulettes").html("");
            $.each(userObj.roulettes, function (roulette_id, rouletteObj) {
                rouletteNum++;
                if (rouletteObj.active)
                    active = true;
                $(".roulettes").prepend($("<div class='open_roulette' style='text-align: left;' data-roulette='" + roulette_id + "'><a href='#' style='color: "+(rouletteObj.active?'#000':'#BBB')+"'>" + (rouletteObj.active?'Nu bezig! ':(rouletteObj.date + " : " + rouletteObj.item + " " + rouletteObj.action + " (aanvraag van " + rouletteObj.initiator+")")) + "</a></div><div data-endtime='" + (rouletteObj.end_timestamp) + "' data-poll='" + (rouletteObj.active ? 1 : 0) + "' class='roulette_participants roulette_" + roulette_id + "' data-roulette='" + roulette_id + "' style='margin: 24px 0 12px 0; display: " + (rouletteObj.active ? "block" : "none") + ";'><h2 style='margin: 5px 0 0 0;'>" + rouletteObj.item + " " + rouletteObj.action + " <span style='font-size: 12px;'>(door " + rouletteObj.initiator + ")</span></h2><div class='end_time' style='padding: 12px 12px 0px 12px;'></div><div class='losers' style='padding: 0px 12px 12px 12px;'></div> <div class='spin'></div><div style='text-align: left; margin: 12px 0 12px 0;' class='participants'></div></div>"));
                if (rouletteObj.loser.length) {
                    $('.roulette_' + roulette_id + '>.losers').html("");
                    $.each(rouletteObj.loser, function(loser_id, loser_obj) {
                        $('.roulette_' + roulette_id + '>.losers').append(loser_obj.time+" <b>"+loser_obj.loser+"</b> was de verliezer ("+loser_obj.spinner+" draaide).<br/>");
                    })
                }
                $('.roulette_' + roulette_id + '>.spin').append("<input type='button' class='spin_roulette' data-roulette='" + roulette_id + "' style='width: 100%;' value='Spin deze roulette!'/>");
                fixParticipants(rouletteObj.reactions, roulette_id);
            });

            $(".currently_available").html("");
            $.each(userObj.participants, function (user_id, user) {
                $(".currently_available").append("- " + user + "<br/>");
            });

            if (rouletteNum) {
                $(".roulettes_container").show();
                $(".currenly_available_container").hide();

                if (active == true) {
                    $(".i_want_coffee_toggle_container").hide();
                } else {
                    $(".currenly_available_container").show();
                }
            } else {
                $(".start_roulette").show();
                $(".roulettes_container").hide();
                $(".currenly_available_container").show();
            }

        } else {
            $('.loggedin').hide();
            $('.login').show();
        }
    }

    function start() {
        var userObj = getLocalStorageObj('data');
        dataToSend = {api_key: (userObj && userObj.api_key) ? userObj.api_key : "none"};

        jQuery.getJSON('http://kantoorroulette.nl/api/rouletteserver', dataToSend, function (data) {
            setLocalStorage('data', data);
            check(data);
            $('.roulette_participants:first').show();
        });
    }

    function fixParticipants(obj, roulette_id, rebuild) {
        rouletteNum = 0;
        if (rebuild)
            $('.roulette_' + roulette_id + '>.participants').html("");


        $.each(obj, function (user_id, reactionObj) {

            var extraHtml = "";
            if (user_id == self_id) {
                extraHtml = "<span class='edit_part'>Ik doe: <a data-roulette='" + roulette_id + "' href='#' class='r_accept'><img src='img/accept.png'/></a> - <a data-roulette='" + roulette_id + "' href='#' class='r_decline'><img src='img/cancel.png'/></a></span>";
            }

            if ($('.roulette_' + roulette_id + '>.participants span[data-userid=' + user_id + ']').length == 0) {
                if (reactionObj.reaction == 2) {
                    $('.roulette_' + roulette_id + '>.participants').append("<span data-userid='" + user_id + "' style='display: block; padding: 4px; height: auto; background-color: " + (rouletteNum % 2 ? '#FFF' : '#EEE') + "'>" + reactionObj.name + " <img class='attendance' style='float: right;' src='img/cancel.png'/>" + extraHtml + "</span>");
                } else if (reactionObj.reaction == 1) {
                    $('.roulette_' + roulette_id + '>.participants').append("<span data-userid='" + user_id + "' style='display: block; padding: 4px; height: auto; background-color: " + (rouletteNum % 2 ? '#FFF' : '#EEE') + "'>" + reactionObj.name + " <img class='attendance' style='float: right;' src='img/accept.png'/>" + extraHtml + "</span>");
                } else {
                    $('.roulette_' + roulette_id + '>.participants').append("<span data-userid='" + user_id + "' style='display: block; padding: 4px; height: auto; background-color: " + (rouletteNum % 2 ? '#FFF' : '#EEE') + "'>" + reactionObj.name + " <img class='attendance' style='float: right;' src='img/help.png'/>" + extraHtml + "</span>");
                }
            } else {
                if (reactionObj.reaction == 2) {
                    $('.roulette_' + roulette_id + '>.participants span[data-userid="' + user_id + '"] img.attendance').attr('src', 'img/cancel.png');
                } else if (reactionObj.reaction == 1) {
                    $('.roulette_' + roulette_id + '>.participants span[data-userid="' + user_id + '"] img.attendance').attr('src', 'img/accept.png');
                } else {
                    $('.roulette_' + roulette_id + '>.participants span[data-userid="' + user_id + '"] img.attendance').attr('src', 'img/help.png');
                }
            }
            rouletteNum++;
        });
    }

    $('.roulettes').on('click', '.spin_roulette', function () {
        var newURL = "http://kantoorroulette.nl/api/spin/roulette_id/" + ($(this).data('roulette'));
        chrome.tabs.create({url: newURL});
    });
    $('.roulettes').on('click', '.open_roulette', function () {
        $('.roulette_' + $(this).data('roulette')).slideToggle();
    });
    $('.roulettes').on('click', '.r_accept', function (e) {
        e.preventDefault();
        $(this).parent().html('Bezig..');
        $.post('http://kantoorroulette.nl/api/response', {roulette_id: roulette_id, reaction: "1"}, function (data) {
            data = jQuery.parseJSON(data);
            if (data.success == 1) {
                fixParticipants(data.participants, roulette_id, true);
            }
        });
    });
    $('.roulettes').on('click', '.r_decline', function (e) {
        e.preventDefault();
        $(this).parent().html('Bezig..');
        $.post('http://kantoorroulette.nl/api/response', {roulette_id: roulette_id, reaction: "2"}, function (data) {
            data = jQuery.parseJSON(data);
            if (data.success == 1) {
                fixParticipants(data.participants, roulette_id, true);
            }
        });

    });

    $('a.select_all').click(function () {
        $('p.participants').find('input').prop('checked', true);
    });
    $('a.select_none').click(function () {
        $('p.participants').find('input').prop('checked', false);
    });

    $('.facebookConnect').click(function () {
        var newURL = "http://kantoorroulette.nl/fb/";
        chrome.tabs.create({url: newURL});
    });

    $('.googleConnect').click(function () {
        var newURL = "http://kantoorroulette.nl/goog/";
        chrome.tabs.create({url: newURL});
    });

    $('.everybody').change(function () {
        if ($(this).is(":checked")) {
            $('p.participants').find('input').prop('checked', false);
            $('.specific').slideUp();
        } else {
            $('.specific').slideDown();
        }
    });

    $('.i_want_coffee_start').click(function () {
        initiateRoulette();
    });
    $('.i_want_coffee_toggle').click(function () {
        $('.i_want_coffee_toggle_container').slideToggle(300);
        if (iwant_timer)
            clearTimeout(iwant_timer);

        iwant_timer = setTimeout(function () {
            $(".i_want_coffee_toggle_container").slideDown(100);
            $(".i_want_coffee_confirm").slideUp(100);
        }, 5000);

        $('.i_want_coffee_close').attr('data-countdown', '6');
        countDown();

        $(".i_want_coffee_confirm").slideToggle(300);
    });
    $('.i_want_coffee_close').click(function () {
        if (iwant_timer)
            clearTimeout(iwant_timer);

        $(".i_want_coffee_toggle_container").slideDown(100);
        $(".i_want_coffee_confirm").slideUp(100);
        iwant_timer = false;
    });

    function countDown() {
        if (iwant_countdown)
            clearTimeout(iwant_countdown);
        if ($('input[data-countdown]').length && parseInt($('.i_want_coffee_close').attr('data-countdown')) > 0) {
            $('.i_want_coffee_close').attr('data-countdown', parseInt($('.i_want_coffee_close').attr('data-countdown')) - 1).val("Nee ("+$('.i_want_coffee_close').attr('data-countdown')+")")
            iwant_countdown = setTimeout(countDown, 1000);
        }
    }

    function checkOpenParticipants() {

        $.each($(".roulette_participants:visible"), function (index, el) {

            roulette_id = $(el).data('roulette');
            if ($(el).data('poll') == 1) {
                $.getJSON('http://kantoorroulette.nl/api/getParticipants/roulette_id/' + roulette_id, function (data) {
                    fixParticipants(data, roulette_id);
                });
            }
        });
        if (timerP)
            clearTimeout(timerP);
        timerP = window.setTimeout(checkOpenParticipants, 7000);
    }
var timerT;
var timerP;
    function updateTimer() {

        $.each($(".roulette_participants:visible"), function (index, el) {
            if ($(el).data('endtime') > (Date.now() / 1000)) {
                $(el).find('.end_time').html(Math.floor($(el).data('endtime') - (Date.now() / 1000)) + " seconden");
            } else {
                $(el).find('.edit_part').hide();
                $(el).find('.end_time').html("Afgelopen");
            }
        });

        timerT = window.setTimeout(updateTimer, 1000);
    }

    updateTimer();
    checkOpenParticipants();
});


function initiateRoulette() {
    if ($('p.participants').find('input:checked').length > 1 || $('.everybody').is(":checked")) {
        $.getJSON('http://kantoorroulette.nl/api/create_request', $('form.roulette_form').serialize(), function (data) {
            if (data.error) {
                $(".i_want_coffee").hide();
                $(".i_want_coffee_error").html(data.error).show();
                $(".i_want_coffee_done").hide();
            } else if (data.success) {
                $(".i_want_coffee").hide();
                $(".i_want_coffee_done").html(data.success).show();
                start();
            }
            $('.i_want_coffee_toggle_container,.i_want_coffee_confirm').slideUp(400);

        });
    } else {
        console.log("te weinig deelnamers");
    }
}