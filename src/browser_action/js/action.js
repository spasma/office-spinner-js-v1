var iwant_countdown, iwant_timer, data;
var $currentInput, $inputMessage, $messageContainer;
var typing = false;
var participants;
var socket;
var myId;
var gamble = false;
$(function () {
    wdtEmojiBundle.defaults.emojiSheets = {
        'apple': 'sheets/sheet_apple_64.png',
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

window.addEventListener('storage', storageEventHandlerWindow, false);
function storageEventHandlerWindow(evt) {
    if (evt.key == "settings") {
        settings = getLocalStorageObj('settings');
        if (settings.balance) {
            $('.balance').css('margin-left', '6px').html('(Saldo: '+settings.balance.toFixed(2)+' NLG)');
        }
    }
}

function createMessageHtml(obj) {
    text = "";
    if (obj.type == 'chat')
        text = (obj.time + " <b>" + obj.userName + "</b>:" + " " + strip_tags(obj.message));
    else if (obj.type == 'connected')
        text = (obj.time + "<span class='info new-user'> <i class='fa fa-user-plus'></i> " + strip_tags(obj.message) + "</span>");
    else if (obj.type == 'gamble_success' && gamble)
        text = (obj.time + "<span class='info gamble'> <i class='guldensign success'></i> " + strip_tags(obj.message) + "</span>");
    else if (obj.type == 'gamble_error' && gamble)
        text = (obj.time + "<span class='info gamble'> <i class='guldensign error'></i> " + strip_tags(obj.message) + "</span>");
    else if (obj.type == 'disconnected')
        text = (obj.time + "<span class='info dis-user'> <i class='fa fa-user-times'></i> " + strip_tags(obj.message) + "</span>");
    else if (obj.type == 'newroulette')
        text = (obj.time + "<span class='info new-roulette'> <i class='fa fa-plus-circle fa-spin'></i> " + strip_tags(obj.message) + "</span>");

    return '<div class="row collapse"><div class="small-12">' + wdtEmojiBundle.render(text) + '</div></div>';
}

function updateData(data) {
    if (!data) {
        data = getLocalStorageObj('data');
        jQuery.getJSON('https://kantoorroulette.nl/apiv2/rouletteserver', dataToSend, function (data) {
            setLocalStorage('data', data);
            updateData(data);
        });
    }
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
        if (data.balance !== undefined) {
            gamble = true;
            $('.gamble').show();
            $('.balance').css('margin-left', '6px').html('(Saldo: '+data.balance.toFixed(2)+' NLG)');
            settings = getLocalStorageObj('settings');
            settings.balance = data.balance;
            setLocalStorage('settings', settings);
        }
        updateRoulettes();
        currentRoulette(true);
        setLocalStorage('chatRecQueue', []);

        var chatMessagesObj = getLocalStorageObj('chatHistory');
        var chatMessages = [];
        if (chatMessagesObj !== null)
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
    if (roulettes !== null) {
        $.each(roulettes, function (num, roulette) {

            //$('.roulettes').append('<div class="small-12 columns"><i class="fa fa-plus-circle fa-spin"></i> '+roulette.roulette_item+'</div>')
            var date = new Date(roulette.date);

            if (date.getDate() == new Date().getDate()) {
                if ($('[data-row-roulette="' + roulette.roulette_id + '"]').length) {
                    rouletteContent(roulette);
                    // $('[data-row-roulette="' + roulette.roulette_id + '"] .content').html(newContent);
                } else {
                    $('.roulettes').prepend("<div class='row' data-row-roulette='" + roulette.roulette_id + "'>" +
                        "<div class='small-12 columns'>" +
                        "<div class='click-bar open_roulette' data-roulette='" + roulette.roulette_id + "' style='text-align: left;'>" +
                        "<a href='#' style='color: #cecece'>" + AddZero(date.getHours()) + ":" + AddZero(date.getMinutes()) + " : <i class='fa " + (roulette.roulette_item && roulette.roulette_item.substr(0, 6).toLowerCase() == "koffie" ? "fa-coffee" : "fa-plus-circle") + " " + (roulette.loser ? '' : 'fa-spin') + "'></i> " + roulette.roulette_item + " " + roulette.roulette_what + " aanvraag: " + roulette.initiator + "</a></div>" +
                        "<div class='content'>" +
                        rouletteContent(roulette) +
                        "</div>" +
                        "</div>" +
                        "</div>" +
                        "</div>");
                }
            }
        });


        $('.changeGambleAfterYes').click(function () {
            console.log($(this).closest('[data-row-roulette]').data('row-roulette'));
            setLocalStorage('changeParticipation', {reaction: false, gamble: 1, roulette_id: ($(this).closest('[data-row-roulette]').data('row-roulette'))});
        });
        $('.changeGambleAfterNo').click(function () {
            setLocalStorage('changeParticipation', {reaction: false, gamble: 2, roulette_id: ($(this).closest('[data-row-roulette]').data('row-roulette'))});
        });


        $('.roulettes .row:first .click-bar a').css('color', '#000');
        if ($('.roulette_participants:visible').length == 0 || $('.roulette_participants:visible').length > 1) {
            $('.roulette_participants').hide();
            $('.roulette_participants:first').show();
        }
    }
}
function rouletteContent(roulette) {
    var partHtml = "";
    var date = new Date(roulette.date);
    var numWant = 0;
    for (var user_id in roulette.participants) {
        partHtml = partHtml + "<div data-response='" + roulette.participants[user_id].response + "' class='row columns participant part_" + user_id + "'><div class='large-8 medium-8 small-8 columns name'>" + roulette.participants[user_id].name + "</div><div class='large-3 medium-3 small-3 columns response'>" + responseHtmlDone[roulette.participants[user_id].response] + "</div><div "+(gamble?'':'style="display: none;"')+" class='gamble columns small-1'>"+(roulette.loser?gambleHtmlDone[roulette.participants[user_id].gamble]:((user_id == myId && roulette.participants[user_id].response == 1)?gambleHtmlSelfAfter[roulette.participants[user_id].gamble]:gambleHtml[roulette.participants[user_id].gamble]))+"</div></div>";
        if (roulette.participants[user_id].response == 1) {
            numWant++;
        }
    }

    if ($('[data-row-roulette="' + roulette.roulette_id + '"]').length) {
        $('[data-row-roulette="' + roulette.roulette_id + '"] .participants').html(partHtml);
        if (roulette.loser) {
            var loserNameEl = $('[data-row-roulette="' + roulette.roulette_id + '"] .losers .name').html();
            if (loserNameEl !== roulette.loser + ' was de verliezer') {
                $('[data-row-roulette="' + roulette.roulette_id + '"] .losers .name').html(roulette.loser + ' was de verliezer').css({color: 'red'});
                // $('[data-row-roulette="' + roulette.roulette_id + '"] .losers .message').html('<form><div class="row"><div class="small-9 columns"><input type="text" value="" placeholder="Typ een troostbericht naar '+roulette.loser+'" /></div><div class="small-3 columns"><input type="button" class="button" value="Verstuur"></div></div></form>');
            }
            $('[data-row-roulette="' + roulette.roulette_id + '"] .spin_roulette').hide();
        } else {
            $('[data-row-roulette="' + roulette.roulette_id + '"] .losers').html('Nog geen verliezer bepaald');
            if ((Date.now() - date) < 600) {
                $('.i_want_coffee_toggle').css('opacity', '0.2').css('background-color', '#CCC').css('color', '#333');
            }
        }

        return;
    }

    return "" +
        "<div class='roulette_participants roulette_" + roulette.roulette_id + "' data-roulette='" + roulette.roulette_id + "' style='display: none;'>" +
        "<div class='losers text-center' style='padding-bottom: 4px; font-size: 12px;'><div class='name'></div><div class='message'></div></div> " +
        "<div class='spin text-center'>" +
        (numWant>1?"<a class='button spin_roulette' data-roulette='" + roulette.roulette_id + "' data-spincode='" + roulette.spin_code + "' style='width: 100%;'>Spin deze roulette</a>":"Er zijn niet genoeg deelnemers.. Dat wordt zelf halen "+roulette.initiator+"..") +
        "</div>" +
        "<div class='participants'>" + partHtml + "</div>" +
        "</div>";
}

function updateSettingsWindow() {
    var settings = getLocalStorageObj('settings');
    $.each($('.settings-container input[type=checkbox]'), function (num, el) {
        $(el).prop('checked', settings[$(el).data('setting')]);
    })
}

function resetDisabled() {
    $('.dnd-menu li').removeClass('active');
    $('.dnd-menu li:first').addClass('active');
    $('.disable_coffee .fa').addClass('fa-bell').removeClass('fa-bell-slash');
}

var settings;
var disabledCd = false;
function countDownDisabled() {
    var settings = getLocalStorageObj('settings');
    if (disabledCd)
        clearTimeout(disabledCd);
    var now = new Date();
    var disabledPluginUntill = new Date(settings.disable_plugin);
    var secondsLeft = Math.floor((disabledPluginUntill - now) / 1000);

    if (secondsLeft > 0) {
        $("#DND .remaining").html("nog " + secondsLeft + " seconden.");
        disabledCd = setTimeout(function () {
            countDownDisabled();
        }, 1000);
    } else {
        $("#DND .remaining").html("")
        settings.disable_plugin = false
        setLocalStorage('settings', settings);
    }

}

$(function () {

    var posCb = function (position) {
        var pos = 'la=' + position.coords.latitude + '&lo=' + position.coords.longitude; // TODO SP: Wordt niks mee gedaan, voor toekomstige positiegebasseerde roulette server
        setLocalStorage('pos', pos);
    };
    navigator.geolocation.getCurrentPosition(posCb);


    $currentInput = $('.newMessage').focus();
    $inputMessage = $('.newMessage');
    setLocalStorage('request_response', {});
    $messageContainer = $(".messages-container")[0];
    data = getLocalStorageObj('data');
//  ====================  LOGIN Functions 
    dataToSend = {api_key: (data && data.api_key) ? data.api_key : "none"};

    updateData(false);

    $('.facebookConnect').click(function () {
        var newURL = "https://kantoorroulette.nl/fb/";
        chrome.tabs.create({url: newURL});
    });
    $('.emoji').html(wdtEmojiBundle.render(':)'));
    $('.emoji').click(function () {
        $('.wdt-emoji-popup').css({
            opacity: 1,
            visibility: 'visible',
            bottom: 12,
            top: 'initial',
            width: '100%'
        })
    })

    $('.googleConnect').click(function () {
        var newURL = "https://kantoorroulette.nl/goog/";
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

    $('.dnd-menu a').click(function () {
        var settings = getLocalStorageObj('settings');

        // if (settings.disable_plugin !== false) {
        settings.disabled_last_chosen = $(this).data('time');
        if ($(this).data('time') == "today") {
            var d = new Date();
            d.setHours(24, 0, 0, 0);
            settings.disable_plugin = d;
            $('.disable_coffee .fa').addClass('fa-bell-slash').removeClass('fa-bell');
        } else if ($(this).data('time') == "0") {
            settings.disable_plugin = false;
            $('.disable_coffee .fa').addClass('fa-bell').removeClass('fa-bell-slash');
        } else {
            var t = new Date();
            t.setSeconds(t.getSeconds() + $(this).data('time'));
            settings.disable_plugin = t;
            $('.disable_coffee .fa').addClass('fa-bell-slash').removeClass('fa-bell');
        }

        $('.dnd-menu li').removeClass('active');
        $(this).parent().addClass('active');

        setLocalStorage('settings', settings);

    });


    var settings = getLocalStorageObj('settings');
    var now = new Date();
    if (settings.disable_plugin != false) {
        var disabledPluginUntill = new Date(settings.disable_plugin);
        var secondsLeft = Math.floor((disabledPluginUntill - now) / 1000);

        if (secondsLeft > 0) {
            countDownDisabled();
            $('.disable_coffee .fa').addClass('fa-bell-slash').removeClass('fa-bell');
            $('.dnd-menu li').removeClass('active');
            if ($('.dnd-menu a[data-time="' + settings.disabled_last_chosen + '"]').length) {
                $('.dnd-menu a[data-time="' + settings.disabled_last_chosen + '"]').parent().addClass('active');
            }

        } else {
            settings.disable_plugin = false;
            setLocalStorage('settings', settings);
        }
    }


    $('.settings-toggle').click(function () {
        updateSettingsWindow()

        if ($(this).find('.fa').hasClass('fa-cog')) {
            $(this).find('.fa').toggleClass('fa-cog fa-arrow-circle-left')
            $('.settings-container').slideDown(800);
            $('.chat').fadeOut(800);
            $('.roulettes').fadeTo(800, 0);
            $('.loggedin, .spinner-container').slideUp(800);
        } else {
            $('.settings-container').slideUp(800);
            $('.chat').fadeIn(800);
            $('.roulettes').fadeTo(800, 1);
            $('.loggedin, .spinner-container').slideDown(800);

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

        $(".i_want_coffee_confirm").slideUp(100);
        $(".i_want_coffee_toggle_container").slideDown(300);
        iwant_timer = false;
    });
    $('.i_want_coffee_start').click(function () {
        initiateRoulette();
    });

    $('.roulettes').on('click', '.open_roulette', function () {
        if ($(this).data('roulette') != $('.roulette_participants:visible').data('roulette')) {
            $('.roulette_participants:visible').slideUp(200);
            $('.roulette_' + $(this).data('roulette')).slideToggle(200);
        }


    });
    $('.roulettes, .current_roulette_container').on('click', '.spin_roulette', function () {
        var newURL = "https://kantoorroulette.nl/apiv2/spin/roulette_id/" + ($(this).data('roulette') + "?code=" + $(this).data('spincode'));
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
    if (array instanceof Array && array.length > 1) {

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

var spinnerShowTimeout = false;

window.addEventListener('storage', storageEventHandler, false);
function storageEventHandler(evt) {
    if (evt.key == "chatRecQueue") {
        processNewChatMessages(evt);
    } else if (evt.key == "request_response") {
        requestResponse();
    } else if (evt.key == "current_roulette") {
        currentRoulette();
        updateParticipants();
    } else if (evt.key == "participants") {
        updateParticipants();
    } else if (evt.key == "people_v2") {
        updateParticipants();
    } else if (evt.key == "init_spinner_data") {
        checkSpinnerActive();
        processInitRoulette();
    } else if (evt.key == "spinposition") {
        if (!rouletteSpinStarted)
            processInitRoulette();
        checkSpinnerActive();
        updateSpinPos();
    }
}

function checkSpinnerActive() {
    if (spinnerShowTimeout) {
        clearTimeout(spinnerShowTimeout);
    }
    spinnerShowTimeout = setTimeout(function () {
        $('.spinner:visible').slideUp(1000);
    }, 7000);

    $('.spinner:hidden').slideDown(1000);
}


function updateSpinPos() {
    if (wheel) {
        var spinpos = getLocalStorageObj('spinposition');
        wheel.body.angle = spinpos.bodyAngle;
        arrow.body.angle = spinpos.arrowAngle;
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

var gambleHtml = {
    null: '',
    'undefined': '<i data-tooltip title="deed niet mee met de Gulden-gamble" class="guldensign" style="color: #999;"></i>',
    1: '<i data-tooltip title="doet mee met de Gulden-gamble" class="guldensign" style="color: #1169D6;  border: 1px solid rgba(58, 219, 118, 0.38); padding: 2px 0 2px 4px; margin:0;"></i>',
    2: '<i data-tooltip title="deed niet mee met de Gulden-gamble" class="guldensign" style="color: #999; border: 1px solid rgba(236, 88, 64, 0.38); padding: 2px 0 2px 4px; margin:0;"></i>',
    3: '<i data-tooltip title="deed mee met de Gulden-gamble en zat in de spin" class="guldensign" style="color: #1169D6; border: 1px solid rgba(58, 219, 118, 0.38); padding: 2px 0 2px 4px; margin:0;"></i>', // Deed echt mee
    4: '<i data-tooltip title="deed mee met de Gulden-gamble, maar zat niet in de spin, betaalt dus niks" class="guldensign" style="color: rgba(236, 88, 64, 0.38); border: 1px solid rgba(236, 88, 64, 0.38);"></i>', // Gediskwalificeerd (betaalt niks, niet meegedaan in de spin)
    5: '<i data-tooltip title="deed mee met de Gulden-gamble, maar had geen saldo" class="guldensign" style="color: rgba(236, 88, 64, 0.38); border: 1px solid rgba(236, 88, 64, 0.38);"></i>' // Gediskwalificeerd
};

var gambleHtmlDone = {
    null: '',
    1: '<i data-tooltip title="deed niet mee met de roulette" class="guldensign" style="color: #999; border: 1px solid rgba(236, 88, 64, 0.38); padding: 2px 0 2px 4px; margin:0;"></i>',
    2: '<i data-tooltip title="deed niet mee met de Gulden-gamble" class="guldensign" style="color: #999; border: 1px solid rgba(236, 88, 64, 0.38); padding: 2px 0 2px 4px; margin:0;"></i>',
    3: '<i data-tooltip title="deed mee met de Gulden-gamble en zat in de spin" class="guldensign" style="color: #1169D6; border: 1px solid rgba(58, 219, 118, 0.38); padding: 2px 0 2px 4px; margin:0;"></i>', // Deed echt mee
    4: '<i data-tooltip title="deed mee met de Gulden-gamble, maar zat niet in de spin, betaalt dus niks" class="guldensign" style="color: rgba(236, 88, 64, 0.38); border: 1px solid rgba(236, 88, 64, 0.38);"></i>', // Gediskwalificeerd (betaalt niks, niet meegedaan in de spin)
    5: '<i data-tooltip title="deed mee met de Gulden-gamble, maar had geen saldo" class="guldensign" style="color: rgba(236, 88, 64, 0.38); border: 1px solid rgba(236, 88, 64, 0.38);"></i>' // Gediskwalificeerd
};
var gambleHtmlSelf = {
    'undefined':    '<a class="button changeGambleYes" style="background: #FFF; padding: 2px 0 2px 4px; margin:0;"><i class="guldensign" style="color: #999; cursor: pointer;"></i></a>',
    null:           '<a class="button changeGambleYes" style="background: #FFF; padding: 2px 0 2px 4px; margin:0;"><i class="guldensign " style="color: #999; cursor: pointer;"></i></a>',
    1:              '<a class="button changeGambleNo"  style="text-align: center; background: #FFF; border: 1px solid rgba(58, 219, 118, 0.38); padding: 2px 0 2px 4px; margin:0;"><i class="guldensign " style="color: #1169D6; cursor: pointer;"></i></a>',
    2:              '<a class="button changeGambleYes" style="background: #FFF; border: 1px solid rgba(236, 88, 64, 0.38); padding: 2px 0 2px 4px; margin:0;"><i class="guldensign " style="color: #999; cursor: pointer;"></i></a>'
};
var gambleHtmlSelfAfter = {
    'undefined':    '<a class="button changeGambleAfterYes" style="background: #FFF; padding: 2px 0 2px 4px; margin:0;"><i class="guldensign" style="color: #999; cursor: pointer;"></i></a>',
    null:           '<a class="button changeGambleAfterYes" style="background: #FFF; padding: 2px 0 2px 4px; margin:0;"><i class="guldensign " style="color: #999; cursor: pointer;"></i></a>',
    1:              '<a class="button changeGambleAfterNo"  style="text-align: center; background: #FFF; border: 1px solid rgba(58, 219, 118, 0.38); padding: 2px 0 2px 4px; margin:0;"><i class="guldensign " style="color: #1169D6; cursor: pointer;"></i></a>',
    2:              '<a class="button changeGambleAfterYes" style="background: #FFF; border: 1px solid rgba(236, 88, 64, 0.38); padding: 2px 0 2px 4px; margin:0;"><i class="guldensign " style="color: #999; cursor: pointer;"></i></a>'
};

function updateParticipants() {
    participants = getLocalStorageObj('people_v2');
    var participantAvailableHtml = "";
    var participantIdleHtml = "";
    var participantDisabledHtml = "";

    if (participants !== null) {
        $.each(participants, function (id, object) {
            var date = false;
            if (object.disabled) {
                date = new Date(object.disabled);
                participantDisabledHtml += '<span class="radius disabled label"><span class="disabled status" data-tooltip title="' + object.name + ' wil tot ' + (date.getHours() + ':' + date.getMinutes()) + ' niet gestoord worden."></span>' + object.name + '</span>';
            } else if (object.idle) {
                participantIdleHtml += '<span class="radius idle label"><span class="idle status" data-tooltip title="Deze gebruiker lijkt niet aanwezig te zijn."></span>' + object.name + '</span>';
            } else {
                participantAvailableHtml += '<span class="radius online label"><span class="online status"></span>' + object.name + "</span>";
            }
        });
        if ($('.currently-disabled').html() != participantDisabledHtml) {
            $('.currently-disabled').html(participantDisabledHtml)
        }
        if ($('.currently-idle').html() != participantIdleHtml) {
            $('.currently-idle').html(participantIdleHtml)
        }
        if ($('.currently-available').html() != participantAvailableHtml && participantAvailableHtml !== "") {
            $('.currently-available').html(participantAvailableHtml);
            $('.start_roulette:hidden').fadeIn(1000);
        } else if (participantAvailableHtml == "") {
            $('.start_roulette:visible').hide();
        }
    }
    $(document).foundation();
}
function currentRoulette(noEffect) {
    if (currentRouletteTimer)
        clearInterval(currentRouletteTimer);
    current_roulette = getLocalStorageObj('current_roulette');
    if (!Array.isArray(current_roulette) && (current_roulette !== null && (current_roulette.length || typeof current_roulette == "object") && typeof current_roulette === 'object' && Object.keys(current_roulette.roulette).length !== 0)) {
        if (noEffect) {
            $('.roulette_request_container:visible, .roulettes:visible').hide();
            $('.current_roulette_container:hidden').show();
        } else {
            $('.roulette_request_container:visible, .roulettes:visible').slideUp(400);
            $('.current_roulette_container:hidden').slideDown(400);
        }
        var a = new Date(); // Now
        var b = new Date(current_roulette.roulette.end_date);
        var secondsLeft = Math.floor((b - a) / 1000);

        $('.request_text').html(current_roulette.roulette.roulette_item + " " + current_roulette.roulette.roulette_what + " (aanvraag door " + current_roulette.roulette.initiator + ")");
        $('.request_time').html(secondsLeft + " seconden te gaan.");

        var numWant = 0;
        var numParticipants = Object.keys(current_roulette.participants).length;

        for (var user_id in current_roulette.participants) {
            if ($('.request_participants>.part_' + user_id).length == 0) {
                $('.request_participants').append($("<div data-response='" + current_roulette.participants[user_id].response + "' class='row participant part_" + user_id + "'><div class='large-8 medium-8 small-8 columns name'>" + current_roulette.participants[user_id].name + "</div><div class='large-3 medium-3 small-3 columns response'>" + (myId == user_id ? responseHtmlSelf[current_roulette.participants[user_id].response] : responseHtml[current_roulette.participants[user_id].response]) + "</div><div "+(gamble?'':'style="display: none;"')+" class='gamble small-1 columns'>"+(myId == user_id ?gambleHtmlSelf[current_roulette.participants[user_id].gamble]:gambleHtml[current_roulette.participants[user_id].gamble])+"</div></div>"));
            } else {
                //if ($('.request_participants>.part_'+user_id).data('response') != current_roulette.participants[user_id].response) {
                $('.request_participants>.part_' + user_id + ' .response').html(
                    myId == user_id ? responseHtmlSelf[current_roulette.participants[user_id].response] : responseHtml[current_roulette.participants[user_id].response]
                );

                $('.request_participants>.part_' + user_id + ' .gamble').html(
                    myId == user_id ? gambleHtmlSelf[current_roulette.participants[user_id].gamble] : gambleHtml[current_roulette.participants[user_id].gamble]
                );
                //}
            }
            if (current_roulette.participants[user_id].response == 1 || current_roulette.participants[user_id].response == 2)
                numWant++;
        }

        if (numWant == numParticipants) {
                $('.request_spin').html("<a class='button spin_roulette' data-roulette='" + current_roulette.roulette.roulette_id + "' data-spincode='" + current_roulette.roulette.spin_code + "' style='width: 100%;'>Spin deze roulette</a>");
            $('.i_want_coffee_toggle').css('opacity', '0.2').css('background-color', '#CCC').css('color', '#333');
        } else {
            $('.request_spin').html("");
        }

        $('button.changeYes').click(function () {
            setLocalStorage('changeParticipation', {reaction: 1, roulette_id: current_roulette.roulette.roulette_id})
        });
        $('button.changeNo').click(function () {
            setLocalStorage('changeParticipation', {reaction: 2, roulette_id: current_roulette.roulette.roulette_id})
        });
        $('.changeGambleYes').click(function () {
            setLocalStorage('changeParticipation', {reaction: 1, gamble: 1, roulette_id: current_roulette.roulette.roulette_id});
        });
        $('.changeGambleNo').click(function () {
            setLocalStorage('changeParticipation', {reaction: 1, gamble: 2, roulette_id: current_roulette.roulette.roulette_id});
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

    currentRouletteTimer = setTimeout(function () {
        currentRoulette()
    }, 2000);
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

var rouletteSpinStarted = false;
function processInitRoulette() {
    if (!rouletteSpinStarted) {
        rouletteSpinStarted = true;
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
}
var Colors = {};
var initGebruikers = [];
var users = [];
var users2 = [];
var users3 = [];