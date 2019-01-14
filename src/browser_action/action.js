var self_id = 0;
$(function () {
    function setLocalStorage(name, obj) {
        localStorage.setItem('data', JSON.stringify(obj));
    }

    function getLocalStorageObj(name) {
        var retrievedObject = localStorage.getItem(name);
        return JSON.parse(retrievedObject);
    }

    var userObj = getLocalStorageObj('data');
    if (userObj.name) {
        self_id = userObj.user_id;
        $('span.name').html(userObj.name);
        $('.login').hide();
        $('.loggedin').show();
        $.each(userObj.participants, function (user_id, user) {
            var input = $('<label><input type="checkbox" name="user[' + user_id + ']" value="1"/> ' + user + '</label>');
            //if (user_id !== self_id)
            $('.participants').append(input)
        });
        if ($('.participants').html() == "") {
            $('.participants').html("Er is niemand beschikbaar");
        }
        var rouletteNum = 0;

        $.each(userObj.roulettes, function (roulette_id, rouletteObj) {

            $(".roulettes").prepend($("<div class='open_roulette' data-roulette='" + roulette_id + "' style='text-align: left;'><a href='#' style='color: #000'>" + rouletteObj.date + " : " + rouletteObj.item + " " + rouletteObj.action + " (door " + rouletteObj.initiator + ")</a></div><div data-endtime='" + (rouletteObj.end_timestamp) + "' data-poll='" + (rouletteObj.active ? 1 : 0) + "' class='roulette_participants roulette_" + roulette_id + "' data-roulette='" + roulette_id + "' style='display: " + (rouletteObj.active ? "block" : "none") + ";'><h2 style='margin: 5px 0 0 0;'>" + rouletteObj.item + " " + rouletteObj.action + " <span style='font-size: 12px;'>(door " + rouletteObj.initiator + ")</span></h2><div class='end_time' style='padding: 12px;'></div> <div class='spin'></div><div style='text-align: left;' class='participants'></div></div>"));
            rouletteNum++;
            $('.roulette_' + roulette_id + '>.spin').append("<input type='button' class='spin_roulette' data-roulette='" + roulette_id + "' style='width: 100%;' value='Spin deze roulette!'/>");
            fixParticipants(rouletteObj.reactions, roulette_id);
        });

        $(".start_roulette").show();
        $(".roulettes_container").show();
    } else {
        $('.loggedin').hide();
        $('.login').show();
    }

    function fixParticipants(obj, roulette_id) {
        var htmlYes = "";
        var htmlNo = "";
        var htmlWaiting = "";
        $.each(obj, function (user_id, reactionObj) {

            var extraHtml = "";
            console.log("user" + user_id);
            console.log("self" + self_id);
            if (user_id == self_id) {
                extraHtml = "<span class='edit_part' style='display: none'>Ik doe: <a data-roulette='"+roulette_id+"' href='#' class='r_accept'><img src='img/accept.png'/></a> - <a data-roulette='"+roulette_id+"' href='#' class='r_decline'><img src='img/cancel.png'/></a></span>";
            }

            if (reactionObj.reaction == 2) {
                htmlNo = "<span style='display: block; padding: 4px; height: auto; background-color: " + (rouletteNum % 2 ? '#FFF' : '#EEE') + "'>" + reactionObj.name + " <img style='float: right;' src='img/cancel.png'/>"+extraHtml+"</span>";
            } else if (reactionObj.reaction == 1) {
                htmlYes = "<span style='display: block; padding: 4px; height: auto; background-color: " + (rouletteNum % 2 ? '#FFF' : '#EEE') + "'>" + reactionObj.name + " <img style='float: right;' src='img/accept.png'/>"+extraHtml+"</span>";
                console.log(htmlYes);
            } else {
                htmlWaiting = "<span style='display: block; padding: 4px; height: auto; background-color: " + (rouletteNum % 2 ? '#FFF' : '#EEE') + "'>" + reactionObj.name + " <img style='float: right;' src='img/help.png'/>"+extraHtml+"</span>";
            }
        });
        console.log('.roulette_' + roulette_id);

        $('.roulette_' + roulette_id + '>.participants').html(htmlYes + htmlNo + htmlWaiting);
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
        $.post('http://kantoorroulette.nl/api/response', { roulette_id: roulette_id, reaction: "1" }, function(data) {
            if (data.success == 1) {
                fixParticipants(data.participants, roulette_id);
            }
        });
    });
    $('.roulettes').on('click', '.r_decline', function (e) {
        e.preventDefault();
        $(this).parent().html('Bezig..');
        $.post('http://kantoorroulette.nl/api/response', { roulette_id: roulette_id, reaction: "2" }, function(data) {
            if (data.success == 1) {
                fixParticipants(data.participants, roulette_id);
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

    $('.everybody').change(function () {
        if ($(this).is(":checked")) {
            $('p.participants').find('input').prop('checked', false);
            $('.specific').slideUp();
        } else {
            $('.specific').slideDown();
        }
    })

    $('.start_roulette').click(function () {
        initiateRoulette();
    })

    function checkOpenParticipants() {

        $.each($(".roulette_participants:visible"), function (index, el) {

            roulette_id = $(el).data('roulette');
            if ($(el).data('poll') == 1) {
                $.getJSON('http://kantoorroulette.nl/api/getParticipants/roulette_id/' + roulette_id, function (data) {

                    fixParticipants(data, roulette_id);

                });
            } else {
                console.log(roulette_id + " wordt niet gechecked aangezien deze niet actief meer is.");
            }
        });
        timerT = window.setTimeout(checkOpenParticipants, 5000);
    }

    function updateTimer() {

        $.each($(".roulette_participants:visible"), function (index, el) {
            if ($(el).data('endtime') > (Date.now() / 1000)) {
                $(el).find('.edit_part').show();
                $(el).find('.end_time').html(Math.floor($(el).data('endtime') - (Date.now() / 1000)) + " seconden");
            } else {
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
            console.log(data);
        })
    } else {
        console.log("te weinig deelnamers");
    }
}