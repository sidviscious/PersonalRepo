var builder = require("botbuilder");
var restify = require("restify");
const querystring = require('querystring');
var http = require('http');
var yaml = require('js-yaml');
const fs = require('fs');
var randomItem = require('random-item');

//Read Domain File for prompts
var botDomain;
try {
    const config = yaml.safeLoad(fs.readFileSync('domain.yml', 'utf8'));
    botDomain = JSON.parse(JSON.stringify(config, null, 4));    
} catch (e) {
    console.log(e);
}

// Setup Restify Server
var server = restify.createServer();

server.listen(process.env.port || process.env.PORT || 3978, function () {
    console.log('%s listening to %s', server.name, server.url);
});

// Create chat connector for communicating with the Bot Framework Service
var connector = new builder.ChatConnector();

// Listen for messages from users 
server.post('/api/messages', connector.listen());

// Create your bot with a function to receive messages from the user
// Create bot and default message handler

var inMemoryStorage = new builder.MemoryBotStorage();
var bot = new builder.UniversalBot(connector)
    .set('storage', inMemoryStorage);

var session_address;

// root dialog

var actionName = "";
var request = require("request");
var saved_session;

bot.dialog('/', function (session, args) {
    //session.sendTyping();
    session_address = session.message.address;
    saved_session = session;
    RasaParse(session.message.text, session);
}
);

function RasaParse(msgToParse) {

    var options = {
        method: 'GET',
        url: 'http://localhost:5005/conversations/sid/parse',
        qs: { q: msgToParse },
    };
    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        var parsedBody = JSON.parse(body);
        console.log('RasaParse Response: ' + body);
        if (parsedBody && parsedBody.next_action) {
            actionName = parsedBody.next_action;
            pingRasaTillActionListen(actionName);
        }
    });

}

function pingRasaTillActionListen(actionName) {
    console.log("Current Action: " + actionName);

    if (actionName != "action_listen") {
        var msg = new builder.Message().address(session_address);
        var template = randomItem(botDomain.templates[actionName]);
        console.log('Template Used: ' + template);
        if (template) {
            //msg.text(template);
            //bot.send(msg);

            if (template.buttons) {
                var prompts = [];
                template.buttons.forEach(function (s) {
                    prompts.push(s.payload);
                });
                builder.Prompts.choice(saved_session, template.text, prompts, { listStyle: builder.ListStyle.button });
            }
            else {
                if (template.image) {
                    msg.attachmentLayout(builder.AttachmentLayout.carousel);
                    msg.attachments([new builder.HeroCard(saved_session)
                        .title(template.text)
                        .images([builder.CardImage.create(saved_session, template.image)])]);
                    bot.send(msg);
                }
                else {
                    if (template.text)
                        msg.text(template.text);
                    else
                        msg.text(template);
                    bot.send(msg);
                }
            }
        }
        else {
            msg.text('default message');
            bot.send(msg);
        }

        var postOptions = {
            method: 'POST',
            url: 'http://localhost:5005/conversations/sid/continue',
            headers: { 'content-type': 'applicaton/json' },
            body: { 'executed_action': actionName, 'events': [] },
            json: true
        };

        request(postOptions, function (error, response, pbody) {
            if (error) throw new Error(error);
            console.log(pbody);
            var nextAction = "";
            if (pbody && pbody.next_action) {
                nextAction = pbody.next_action;
                console.log(nextAction);
                pingRasaTillActionListen(nextAction);
            }
        });
    }
    else {
        actionName = "";
        saved_session.endDialog();
    }
}



