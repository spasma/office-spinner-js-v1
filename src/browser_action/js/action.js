var iwant_countdown, iwant_timer, data;
var $currentInput, $inputMessage, $messageContainer;
var typing = false;
var participants;
var socket;
var myId;

$(function() {
    wdtEmojiBundle.defaults.emojiSheets = {
        'apple'   : 'sheets/sheet_apple_64.png',
    };
    //
    wdtEmojiBundle.init('.wdt-emoji-bundle-enabled');
    wdtEmojiBundle.changeType('apple');
});

function strip_tags(input, allowed) {
    allowed = (((allowed || '') + '')
        .toLowerCase()
        .match(/<[a-z][a-z0-9]*>/g) || [])
        .join(''); // making sure the allowed arg is a string containing only tags in lowercase (<a><b><c>)
    var tags = /<\/?([a-z][a-z0-9]*)\b[^>]*>/gi,
        commentsAndPhpTags = /<!--[\s\S]*?-->|<\?(?:php)?[\s\S]*?\?>/gi;
    return input.replace(commentsAndPhpTags, '')
        .replace(tags, function ($0, $1) {
            return allowed.indexOf('<' + $1.toLowerCase() + '>') > -1 ? $0 : '';
        });
}


function createMessageHtml(obj) {
    text = "";
    if (obj.type == 'chat')
        text = (obj.time + " <b>" + obj.userName + "</b>:" + " " + strip_tags(obj.message));
    else if (obj.type == 'connected')
        text = (obj.time + "<span class='info new-user'> <i class='fa fa-user-plus'></i> " + strip_tags(obj.message) + "</span>");
    else if (obj.type == 'disconnected')
        text = (obj.time + "<span class='info dis-user'> <i class='fa fa-user-times'></i> " + strip_tags(obj.message) + "</span>");
    else if (obj.type == 'newroulette')
        text = (obj.time + "<span class='info new-roulette'> <i class='fa fa-plus-circle fa-spin'></i> " + strip_tags(obj.message) + "</span>");


    //fa fa-plus-circle


    return '<div class="row"><div class="large-12 medium-12 small-12 columns">' + wdtEmojiBundle.render(text) + '</div></div>';
}

function updateData() {
    data = getLocalStorageObj('data');
    if (!data || !data.user_id) {
        $('.login').show();
        $('.loggedin').hide();
    } else {
        myId = data.user_id;
        $('.login').hide();
        updateParticipants();
        

        var uur = new Date().getHours();
        var tijdsstipText = "";
        if (uur >= 18)
            tijdsstipText = 'Goedenavond';
        else if (uur >= 12)
            tijdsstipText = 'Goedemiddag';
        else if (uur >= 6)
            tijdsstipText = 'Goedemorgen';
        else
            tijdsstipText = 'Goedenacht';

        $("span.dagWens").html(tijdsstipText);
        $("span.name").html(data.name);
        updateRoulettes();
        
        currentRoulette(true);
        setLocalStorage('chatRecQueue', []);
        
        //processInitRoulette();
        
        var chatMessagesObj = getLocalStorageObj('chatHistory');
        var chatMessages = [];
        $.each(chatMessagesObj, function (id, obj) {
            chatMessages.push(createMessageHtml(obj));
        });

        $('.messages-container').html("").append(chatMessages.join("")).scrollTop($messageContainer.scrollHeight);
        $('.loggedin').fadeIn(100);
    }
    $('.load').hide();
}

function AddZero(num) {
    return (num >= 0 && num < 10) ? "0" + num : num + "";
}
function updateRoulettes() {
    var roulettes = getLocalStorageObj('roulettes');
    //$('.roulettes').html("");
    
    $.each(roulettes, function (num, roulette) {
            
        //$('.roulettes').append('<div class="large-12 medium-12 small-12 columns"><i class="fa fa-plus-circle fa-spin"></i> '+roulette.roulette_item+'</div>')
        var date = new Date(roulette.date);

        if (date.getDate() == new Date().getDate()) {
            if ($('[data-row-roulette="' + roulette.roulette_id + '"]').length) {
                rouletteContent(roulette);
                //$('[data-row-roulette="' + roulette.roulette_id + '"] .content').html(newContent);
            } else {
                $('.roulettes').prepend("<div class='row' data-row-roulette='" + roulette.roulette_id + "'>" +
                    "<div class='large-12 medium-12 small-12 columns'>" +
                    "<div class='click-bar open_roulette' data-roulette='" + roulette.roulette_id + "' style='text-align: left;'>" +
                    "<a href='#' style='color: #cecece'>" + AddZero(date.getHours()) + ":" + AddZero(date.getMinutes()) + " : <i class='fa fa-plus-circle fa-spin'></i> " + roulette.roulette_item + " " + roulette.roulette_what + " (aanvraag van " + roulette.initiator + ")" + "</a></div>" +
                    "<div class='content'>" +
                    rouletteContent(roulette) +
                    "</div>" +
                    "</div>" +
                    "</div>" +
                    "</div>");
            }
        }
    });
    $('.roulettes .row:first .click-bar a').css('color', '#000');
    if ($('.roulette_participants:visible').length == 0)
         $('.roulette_participants:first').show();
}
function rouletteContent(roulette) {
    var partHtml = "";
    var date = new Date(roulette.date);
    for (var user_id in roulette.participants) {
        partHtml = partHtml + "<div data-response='" + roulette.participants[user_id].response + "' class='row columns participant part_" + user_id + "'><div class='large-8 medium-8 small-8 columns name'>" + roulette.participants[user_id].name + "</div><div class='large-4 medium-4 small-4 columns response'>" + responseHtmlDone[roulette.participants[user_id].response] + "</div></div>";
    }

    if ($('[data-row-roulette="' + roulette.roulette_id + '"]').length) {
        $('[data-row-roulette="' + roulette.roulette_id + '"] .participants').html(partHtml);
        $('[data-row-roulette="' + roulette.roulette_id + '"] .losers').html((roulette.loser?roulette.loser+' was de verliezer':'Nog geen verliezer bepaald'));
        return;
    }

    return "" +
        "<div class='roulette_participants roulette_" + roulette.roulette_id + "' data-roulette='" + roulette.roulette_id + "' style='display: none;'>" +
        "<div class='losers text-center' style='padding: 0px 12px 12px 12px; font-size: 12px;'>"+(roulette.loser?roulette.loser+' was de verliezer':'')+"</div> " +
        "<div class='spin text-center'><a class='button spin_roulette' data-roulette='" + roulette.roulette_id + "' data-spincode='" + roulette.spin_code + "' style='width: 100%;'>Spin deze roulette</a></div>" +
        "<div class='participants'>" + partHtml + "</div>" +
        "</div>";
}

function updateSettingsWindow() {
    var settings = getLocalStorageObj('settings');
    $.each($('.settings-container input[type=checkbox]'), function (num, el) {
        $(el).prop('checked', settings[$(el).data('setting')]);
    })
}
$(function () {
    $currentInput = $('.newMessage').focus();
    $inputMessage = $('.newMessage');
    setLocalStorage('request_response', {});
    $messageContainer = $(".messages-container")[0];
    data = getLocalStorageObj('data');
//  ====================  LOGIN Functions 
    dataToSend = {api_key: (data && data.api_key) ? data.api_key : "none"};
    jQuery.getJSON('http://kantoorroulette.nl/apiv2/rouletteserver', dataToSend, function (data) {
        setLocalStorage('data', data);
        updateData();
    });
    updateData();

    $('.facebookConnect').click(function () {
        var newURL = "http://kantoorroulette.nl/fb/";
        chrome.tabs.create({url: newURL});
    });

    $('.googleConnect').click(function () {
        var newURL = "http://kantoorroulette.nl/goog/";
        chrome.tabs.create({url: newURL});
    });

//  ====================  LOGIN Functions 


//  ====================  Koffie Request Functions
    $('.geavanceerd').click(function () {
        if (iwant_timer)
            clearTimeout(iwant_timer);
        if (iwant_countdown)
            clearTimeout(iwant_countdown);
        $('.i_want_coffee_close>span').html("Nee");
        $('.advanced').slideDown();
    });

    $('.disable_coffee').click(function() {
        var settings = getLocalStorageObj('settings');

        if (settings.disable_plugin !== false) {
            settings.disable_plugin = false;
            $('.disable_coffee .fa').addClass('fa-bell').removeClass('fa-bell-slash-o');
        } else {
            $('.disable_coffee .fa').addClass('fa-bell-slash-o').removeClass('fa-bell');
            settings.disable_plugin = 3600;
        }
        setLocalStorage('settings', settings);
    });

    $('.settings-toggle').click(function () {
        updateSettingsWindow()
        console.log($(this));
        console.log($(this).find('.fa'));

        if ($(this).find('.fa').hasClass('fa-cog')) {
            $(this).find('.fa').toggleClass('fa-cog fa-arrow-circle-left')
            $('.settings-container').slideDown(800);
            $('.loggedin').slideUp(800);
        } else {
            $('.settings-container').slideUp(800);
            $('.loggedin').slideDown(800);

            $(this).find('.fa').toggleClass('fa-cog fa-arrow-circle-left')
        }
    });
    $('.settings-container input[type=checkbox][data-setting]').change(function () {
        settings = getLocalStorageObj('settings');
        if ($(this).is(":checked")) {
            settings[$(this).data('setting')] = true;
        } else {
            settings[$(this).data('setting')] = false;
        }
        setLocalStorage('settings', settings);
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

        $(".i_want_coffee_toggle_container").slideDown(300);
        //$(".i_want_coffee_confirm").slideUp(300);
        iwant_timer = false;
    });
    $('.i_want_coffee_start').click(function () {
        initiateRoulette();
    });
    
    $('.roulettes').on('click', '.open_roulette', function () {
        if ($(this).data('roulette') != $('.roulette_participants:visible').data('roulette'))
            $('.roulette_participants:visible').slideUp(200);

        $('.roulette_' + $(this).data('roulette')).slideToggle(200);

    });
    $('.roulettes').on('click', '.spin_roulette', function () {
        var newURL = "http://kantoorroulette.nl/apiv2/spin/roulette_id/" + ($(this).data('roulette')+"?code="+$(this).data('spincode'));
        chrome.tabs.create({url: newURL});
    });
    
    function countDown() {
        if (iwant_countdown)
            clearTimeout(iwant_countdown);
        if ($('.i_want_coffee_close[data-countdown]').length && parseInt($('.i_want_coffee_close').attr('data-countdown')) > 0) {
            $('.i_want_coffee_close').attr('data-countdown', parseInt($('.i_want_coffee_close').attr('data-countdown')) - 1);
            $('.i_want_coffee_close>span').html("Nee (" + $('.i_want_coffee_close').attr('data-countdown') + ")");
            iwant_countdown = setTimeout(countDown, 1000);
        }
    }

//  ====================  Koffie Request Functions


    $(document).foundation();
});

function setLocalStorage(name, obj) {
    localStorage.setItem(name, JSON.stringify(obj));
}

function getLocalStorageObj(name) {
    var retrievedObject = localStorage.getItem(name);
    return JSON.parse(retrievedObject);
}

function opsomming(array, orText) {
    if (array.length > 1) {

        var ret = "";
        var lastItem = array.pop();
        ret = array.join(", ");
        return ret + " " + orText + " " + lastItem;
    }
    else {
        return array[0];
    }
}

function initiateRoulette() {
    $('.i_want_coffee_toggle_container,.i_want_coffee_confirm').slideUp(500);
    $('.i_want_coffee_load').slideDown(500);


    if (iwant_timer)
        clearTimeout(iwant_timer);

    setLocalStorage('newRouletteRequest', {
        item: $('.item').val(),
        what: $('.what').val(),
        timeout: $('.timeout').val()
    });
}

function requestResponse() {
    var response = getLocalStorageObj('request_response');
    if (response.type) {
        if (response.type == 'success') {
            $(".i_want_coffee_done").html(response.message).slideDown(500).delay(5000).slideUp(500);
        } else if (response.type == 'error') {
            $(".i_want_coffee_error").html(response.message).slideDown(500).delay(5000).slideUp(500);
        }
        $('.i_want_coffee_load').slideUp(500);
    }
}

function cleanInput(input) {
    return $('<div/>').text(input).text();
}

function sendMessage() {
    var message = $inputMessage.val();
    message = cleanInput(message);
    // if there is a non-empty message and a socket connection
    if (message) {
        $inputMessage.val('');
        // tell server to execute 'new message' and send along one parameter
        queueObj = getLocalStorageObj('chatSentQueue');
        var chatQueue = queueObj ? queueObj : [];

        chatQueue.push(message);
        setLocalStorage('chatSentQueue', chatQueue);
    }
}

$(window).keydown(function (event) {
    //if (!(event.ctrlKey || event.metaKey || event.altKey)) {
    //$currentInput.focus();
    //}
    // When the client hits ENTER on their keyboard
    if (event.which === 13) {
        sendMessage();
        typing = false;
    }
});


window.addEventListener('storage', storageEventHandler, false);
function storageEventHandler(evt) {
    console.log(evt);
    if (evt.key == "chatRecQueue") {
        processNewChatMessages(evt);
    } else if (evt.key == "request_response") {
        requestResponse();
    } else if (evt.key == "current_roulette") {
        currentRoulette();
    } else if (evt.key == "participants") {
        updateParticipants();
    } else if (evt.key == "init_spinner_data") {
        //processInitRoulette();
    } else if (evt.key == "spinposition") {
        //updateSpinPos();
    }
}


function updateSpinPos() {
    if (wheel) {
        var spinpos = getLocalStorageObj('spinposition');
        wheel.body.angle = spinpos.angle;
        wheel.body.angularVelocity = spinpos.angularVelocity;

    }
}

var current_roulette;
var currentRouletteTimer;

var responseHtml = {
    null: '<i class="fa fa-spinner fa-spin"></i>',
    1: '<i class="fa fa-check-circle"></i> Ja',
    2: '<i class="fa fa-times-circle"></i> Nee'
};
var responseHtmlSelf = {
    null: '<i class="fa fa-spinner fa-spin"></i> <button style="padding: 1px 6px; margin-top: 6px; margin:0;" class="button changeYes right">Ik ook</button>',
    1: '<i class="fa fa-check-circle"></i> Ja <button style="padding: 1px 6px;  margin-top: 6px; margin:0;" class="button changeNo right">Toch niet</button>',
    2: '<i class="fa fa-times-circle"></i> Nee <button style="padding: 1px 6px; margin-top: 6px; margin:0;" class="button changeYes right">Toch wel</button>'
};
var responseHtmlDone = {
    null: '<i class="fa fa-question-circle"></i> Geen reactie',
    1: '<i class="fa fa-check-circle"></i> Ja',
    2: '<i class="fa fa-times-circle"></i> Nee'
};

function updateParticipants() {
    participants = getLocalStorageObj('participants');
    var participantHtml = "";

    $.each(participants, function (id, name) {
        participantHtml += "<span class='radius success label'>" + name + "</span>";
    });
    if ($('.currently-available').html() != participantHtml) {
        $('.currently-available').html(participantHtml)
    }
}
function currentRoulette(noEffect) {
    if (currentRouletteTimer)
        clearInterval(currentRouletteTimer);
    current_roulette = getLocalStorageObj('current_roulette');
    if (Object.keys(current_roulette.roulette).length !== 0) {
        if (noEffect) {
            $('.roulette_request_container:visible, .roulettes:visible').hide();
            $('.current_roulette_container:hidden').show();
        } else {
            $('.roulette_request_container:visible, .roulettes:visible').slideUp(400);
            $('.current_roulette_container:hidden').slideDown(400);
        }
        var a = new Date(); // Now
        var b = new Date(current_roulette.roulette.end_date);
        var secondsLeft = Math.floor((b-a)/1000);

        $('.request_text').html(current_roulette.roulette.roulette_item+" "+current_roulette.roulette.roulette_what+" (aanvraag door "+current_roulette.roulette.initiator+")");
        $('.request_time').html(secondsLeft+" seconden te gaan.");

        var numWant = 0;
        var numParticipants = Object.keys(current_roulette.participants).length;

        for (var user_id in current_roulette.participants) {
            if ($('.request_participants>.part_'+user_id).length == 0) {
                $('.request_participants').append($("<div data-response='"+current_roulette.participants[user_id].response+"' class='row participant part_"+user_id+"'><div class='large-8 medium-8 small-8 columns name'>"+current_roulette.participants[user_id].name+"</div><div class='large-4 medium-4 small-4 columns response'>"+(myId == user_id ? responseHtmlSelf[current_roulette.participants[user_id].response] : responseHtml[current_roulette.participants[user_id].response])+"</div></div>"));
            } else {
                //if ($('.request_participants>.part_'+user_id).data('response') != current_roulette.participants[user_id].response) {
                    $('.request_participants>.part_'+user_id+' .response').html(
                        myId == user_id ? responseHtmlSelf[current_roulette.participants[user_id].response] : responseHtml[current_roulette.participants[user_id].response]
                    );
                //}
            }
            if (current_roulette.participants[user_id].response == 1 || current_roulette.participants[user_id].response == 2)
                numWant++;
        }

console.log(numWant == numParticipants, numWant, numParticipants);
        if (numWant == numParticipants) {
            $('.request_spin').html("<a class='button spin_roulette' data-roulette='" + current_roulette.roulette.roulette_id + "' data-spincode='" + current_roulette.roulette.spin_code + "' style='width: 100%;'>Spin deze roulette</a>");
        } else {
            $('.request_spin').html("");
        }

        $('button.changeYes').click(function() {
            setLocalStorage('changeParticipation', {reaction: 1, roulette_id: current_roulette.roulette.roulette_id})
        });
        $('button.changeNo').click(function() {
            setLocalStorage('changeParticipation', {reaction: 2, roulette_id: current_roulette.roulette.roulette_id})
        });
        
        //$('.request_participants').html();

    } else {
        updateRoulettes();
        if (noEffect) {
            $('.roulette_request_container:hidden, .roulettes:hidden').show();
            $('.current_roulette_container:visible').hide();
        } else {
            $('.roulette_request_container, .roulettes').slideDown(400);
            $('.current_roulette_container').slideUp(400);
        }
    }
    
    currentRouletteTimer = setTimeout(function() { currentRoulette() }, 2000);
}

function processNewChatMessages(evt) {
    var newMessages = getLocalStorageObj('chatRecQueue');
    $.each(newMessages, function (id, messageObj) {
        $('.messages-container').append(createMessageHtml(messageObj));
    });
    setLocalStorage('chatRecQueue', []);
    $('.messages-container').stop().animate({
        scrollTop: $(".messages-container").prop('scrollHeight')
    });
}

function processInitRoulette() {
    var spinner_data = getLocalStorageObj('init_spinner_data');
    if (spinner_data && spinner_data.users) {
        
        initGebruikers = spinner_data.initGebruikers;
        users = spinner_data.users;
        users2 = spinner_data.users2;
        //users3 = spinner_data.users3;
        //aantalGebruikers = spinner_data.aantalGebruikers;
        //
        for (i = 0; i < users.length; i++) {
            Colors[i] = $c.rand();
        }
        
        $("#drawing_canvas").show();
        startAll();
    }
}
var Colors = {};
var initGebruikers=[];
var users=[];
var users2=[];
var users3=[];