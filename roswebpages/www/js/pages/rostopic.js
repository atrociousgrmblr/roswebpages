// rosapi services
var topics;
var topic_type;
var message_details;

var publishers;
var subscribers;
var service_host;

// ROSLIB Subscriber and publisher
var subscriber;

// Typeahead options
var options = { 'source': [] };

// Begin process when ros is connected
window.ros.on('connection', initSubscriber);

function initSubscriber(){
    $('#actions').show( );

    // Service to get a list of current topics
    topics = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/topics',
        serviceType: 'rosapi/Topics'
    });

    // Service to get the type of a topic (can't subscribe without)
    topic_type = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/topic_type',
        serviceType: 'rosapi/TopicType'
    });

    message_details = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/message_details',
        serviceType: 'rosapi/MessageDetails'
    });

    subscribers = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/subscribers',
        serviceType: 'rosapi/Subscribers'
    });

    publishers = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/publishers',
        serviceType: 'rosapi/Publishers'
    });

    service_host = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/service_host',
        serviceType: 'rosapi/ServiceHost'
    });

    // Update topic list in typeahead every 5 seconds and call once now.
    updateTopicList();
    setInterval( updateTopicList, 5000);

    $('#btn-subscribe').click( subscribe );
    $('#btn-publish').click( publish );
    $('#btn-information').click( information );
}

// Update the topic list
function updateTopicList(){
    var req = new ROSLIB.ServiceRequest();
    topics.callService( req, function(result) {
        // Reinit with new options.
        options = {
            source: result.topics
        };
        $('#text-topic').typeahead(options);
    });

}

function information(){
    // Get input value 
    var topic = $('#text-topic').val();

    if( options.source.indexOf(topic) == -1){
        $('#text-alert').text("This topic does not exist!");
        $('#alert').show();
        setTimeout( function(){ $('#alert').hide(); }, 5000 );
        return;
    }

    // Empty tables
    $('#table-subs tbody').empty();
    $('#table-pubs tbody').empty();
    
    $('#modal-subs').hide();
    $('#modal-pubs').hide();

    // Get topic type from rosapi
    var req = new ROSLIB.ServiceRequest({ topic: topic });
    topic_type.callService( req, function(result) {
        // Display type in a paragraph above table.
        $('#modal-type-info').text(result.type);
        $('#modal-topic-info').text(topic);

        publishers.callService( req, function(pubs) {
            processHosts('pubs', pubs.publishers);
        });

        subscribers.callService( req, function(subs) {
            processHosts('subs', subs.subscribers);
        });
    });
    
    $('#modal-info').modal('show');
}

function processHosts( type, nodes ){
    var node = nodes.pop();
    // Every node should have that service avalaible.
    var req = new ROSLIB.ServiceRequest({ service: node + '/get_loggers' });
    service_host.callService( req, function(result) {
        var row = '<tr><td>' + node + '<\/td><td>' 
                + result.host.trim() + '<\/td><\/tr>';

        $('#table-' + type +  ' tbody').append( row );
        $('#modal-' + type).show();

        // Recursion until no more nodes.
    });

    if( nodes.length )
        processHosts( type, nodes );
}

// Publish in the topic provided in the text input.
function publish(){
    // Get input value 
    var topic = $('#text-topic').val();

    if( options.source.indexOf(topic) == -1){
        $('#topic-name').val( topic );
        $('#modal-topic').modal('show');
        return;
    }

    // Get topic type from rosapi
    var req = new ROSLIB.ServiceRequest({ topic: topic });
    topic_type.callService( req, function(result) {
        // Display type in a paragraph above table.
        $('#modal-type-publish').text(result.type);
        $('#modal-topic-publish').text(topic);
        
        var req_details = new ROSLIB.ServiceRequest({ type: result.type });
        message_details.callService( req_details, function(details){
            createModal( topic, result.type, details );
        });
    });
}

function createTooltip( name, type ){
    var req = new ROSLIB.ServiceRequest({ type: type });
    message_details.callService(req, function(result) {

        // Create a JSON string for prototype 
        // by itering through message details
        text = type + ': ' + jsonifyMessage(type, result) + '}';

        var popover = '<a href="#">' + name + '<\/a>';
        $('#td-pub-' + name).append( popover );
        $('#td-pub-' + name + ' a').popover({
            'html': true,
            'title': '<code>' + type + '</code> details',
            'content': jsonToUL(text)
        });
    });
}

// Add input to the publish modals marching the message detaisl given in arg
function createModal( topic, type, details ){

    // Empty table            
    $('#table-publish tbody').empty();

    // Only display first level
    msg = details.typedefs[0];
    for( i in msg.fieldnames ){
        var arr = msg.fieldarraylen[i] != -1 ? '[]' : '';
        
        var input_type = "text";
        if(( msg.fieldtypes[i].indexOf('int') != -1 
                || msg.fieldtypes[i].indexOf('float') != -1
                || msg.fieldtypes[i].indexOf('byte') != -1
                || msg.fieldtypes[i].indexOf('char') != -1
                || msg.fieldtypes[i].indexOf('bool') != -1 ) && arr != '[]')
            input_type = "number";

        var row = '<tr><td id="td-pub-' + msg.fieldnames[i] + '">';
        
        if( msg.fieldtypes[i].indexOf('/') != -1 ){
            createTooltip( msg.fieldnames[i], msg.fieldtypes[i] );
        }
        else
            row += msg.fieldnames[i];

        row += '<\/td><td><input type="' + input_type
                + '" placeholder="' + msg.fieldtypes[i] + arr
                + '" class="input-long" data="' + msg.fieldnames[i] 
                + '"><\/td><\/tr>';

        $('#table-publish tbody').append( row );
    }

    $('#modal-publish').modal('show');

    // Publish button callback
    $('#btn-modal-publish').on('click', function(){
        $('#btn-modal-publish').off('click');

        var message_fields = {};
        $('#table-publish input').each( function() {
            var typed = $(this).val();
            if ( typed.length ){
                // Add doublequotes to strings
                if( $(this).attr('placeholder').indexOf('string') == 0
                        && typed[0] != '"' && typed[0] != '[' ){
                    typed = '"' + typed + '"';
                }
                message_fields[ $(this).attr('data') ] = JSON.parse( typed );
            }
        });

        var publisher = new ROSLIB.Topic({
            ros: window.ros,
            name: topic, 
            messageType: type
        });

        var msg = new ROSLIB.Message( message_fields );

        if( ! $('#hz').prop('checked') ){
            publisher.publish( msg );
            publishEnd();
        }
        // Publish at a given rate
        else{
            var period = parseInt( $('#input-rate').val() );
            var timer = setInterval( function(){ 
                publisher.publish( msg );
            }, period );
            $('#btn-modal-publish').button('publishing')
                    .removeClass('btn-primary').addClass('btn-warning');
            $('#btn-modal-cancel').show();
            $('#btn-modal-cancel').on('click', function(){
                $('#btn-modal-cancel').hide();
                $('#btn-modal-cancel').off('click');
                clearInterval( timer );
                publishEnd();
            });
        }
    });
}

function publishEnd() {
    $('#btn-modal-publish').button('published')
            .removeClass('btn-warning').addClass('btn-success');

    setTimeout(function(){
        $('#modal-publish').modal('hide');
        $('#btn-modal-publish').button('publish')
                .removeClass('btn-success').addClass('btn-primary');
    }, 2000);
}

// Called if topic does not exist.
function createTopic(){
    var topic = $('#topic-name').val();
    var type = $('#topic-type').val();
    
    // Display type in a paragraph above table.
    $('#modal-type-publish').text(type);
    $('#modal-topic-publish').text( topic );
    
    var req_details = new ROSLIB.ServiceRequest({ type: type });
    message_details.callService( req_details, function(details){
            createModal( topic, type, details );
    });
}

// Subscribe to the topic provided in the text input.
function subscribe(){
    // Get input value 
    var topic = $('#text-topic').val();

    if( options.source.indexOf(topic) == -1){
        $('#text-alert').text("Can't subscribe to an unexistant topic...");
        $('#alert').show();
        setTimeout( function(){ $('#alert').hide(); }, 5000 );
        return;
    }

    $('#btn-subscribe').button('unsubscribe');
    $('#btn-subscribe').removeClass('btn-primary').addClass('btn-success');
    $('#unsubscribe').show();

    // Get topic type from rosapi
    var req = new ROSLIB.ServiceRequest({ topic: topic });
    topic_type.callService( req, function(result) {
        // Display type in a paragraph above table.
        $('#type').text(result.type);

        subscriber = new ROSLIB.Topic({
            ros: window.ros,
            name : topic, 
            messageType : result.type
        });
	    subscriber.subscribe( cb );
    });

}

function cb( msg ) {
    // Remove old message
    $('#table-topic tbody').empty();

    // Create a row for each field/value pair.
    $.each(msg, function(field, value){
        // Use stringify to be sure to have a string in Value field.
        val = JSON.stringify(value, null, ' ');

        // Remove double quotes if useless
        if( val[0] === '"' )
            val = val.slice(1, -1);

        // Don't display large data. Example: data field of Image msg.
        if(val.length > 500)
            val = "Data was too big to be displayed...";
        row = '<tr><td>' + field + '<\/td><td>' + val + '<\/td><\/tr>';
        $('#table-topic tbody').append( row );
    });

    $('#message').show();
}

function setTopic( topic ){
    $('#text-topic').val( topic );
}

function listTopics(){
    $('#table-list tbody').empty();
    $.each(options.source, function(index, topic){
        var req = new ROSLIB.ServiceRequest({ topic: topic });
        topic_type.callService( req, function(result) {
            var row = '<tr><td>' + topic + '<\/td><td>' + result.type
                    + '<\/td><td><button class="btn" data-dismiss="modal" '
                    + 'onclick="javascript:setTopic(\'' + topic 
                    + '\')">Choose<\/button><\/td><\/tr>';
            $('#table-list tbody').append( row );
        });
    });
    $('#modal-list').modal('show');
}

// Unsubscribe button callback
$('#btn-unsubscribe').click(function(){
    subscriber.unsubscribe();
    delete subscriber;
    $('#unsubscribe').hide();
    $('#message').hide();
    $('#btn-subscribe').button('subscribe').removeClass('btn-success')
        .addClass('btn-primary');

    // Empty table
    $('#table-topic tbody').empty();
});
