var ac; // Action client

var topics;
var topic_type;
var details; // Provides info on a message type

// Types of subsection in actions.
var types = [ 'goal', 'result', 'feedback' ];

// Map Action status to bootstrap color classes for <p>
// 'error' and 'success' are end states.
var status_texts = {
    "pending": "muted",
    "active": "text-info",
    "preempted": "text-error",
    "succeeded": "text-success",
    "aborted": "text-error",
    "rejected": "text-error",
    "preempting": "text-warning",
    "recalling": "text-warning",
    "recalled": "text-info",
    "lost": "text-error"
};

var status_labels = {
    "pending": "",
    "active": "label-info",
    "preempted": "label-important",
    "succeeded": "label-success",
    "aborted": "label-important",
    "rejected": "label-important",
    "preempting": "label-warning",
    "recalling": "label-warning",
    "recalled": "label-info",
    "lost": "label-important"
};

// Need to force false since it does not always 
// reinit to HTML value during refresh.
$('.input').attr('disabled', false);

$('#select-server').attr('disabled', false);
$('#text-timeout').attr('disabled', false);

// Begin process when ros is connected
window.ros.on('connection', beginAction);

function beginAction(){
    // Show section
    $('#action').show();

    // Bind button
    $('#btn-create-action').on('click', createAction);

    details = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/message_details',
        serviceType: 'rosapi/MessageDetails'
    });

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

    // Update server list every 10 seconds and call once now.
    updateServerList();
    setInterval( updateServerList, 10000);
}

// Update the action server list. Registered servers are put in the select
function updateServerList(){
    var servers = [];
    var req = new ROSLIB.ServiceRequest();
    topics.callService( req, function(result) {
        $.each(result.topics, function(i, v) {
            parts = v.split('/');

            // May be a server if a topic ends with feedback
            if( parts.length > 2 && parts.indexOf('feedback') != -1){
                server_name = parts.slice(0, -1).join('/');

                // Check others mandatory topics
                if( result.topics.indexOf(server_name + '/result') != -1
                    && result.topics.indexOf(server_name + '/status') != -1 ){

                    servers.push( server_name );

                    // Add to options only it does not exist
                    exist = false;
                    $('#select-server option').each( function( index ){
                        if( $(this).val() == server_name ){
                            exist = true;
                        }
                    });

                    if( !exist ){
                        option = '<option value="' + server_name + '">' 
                            + server_name + '<\/option>';
                        $('#select-server').append( option );
                    }
                }
            }
        });
    });

    // Remove server that are not there anymore
    $('#select-server option').each( function( index ){
        if( servers.indexOf( $(this).val() ) == -1 ){
            $(this).remove();
        }
    });
}

function createAction(){
    // Change button style
    $('#btn-create-action').off('click').button('created');
    $('#btn-create-action').removeClass('btn-primary').addClass('btn-success');

    // Disable change on inputs
    $('#actions .select').attr('disabled', true);
    $('#actions .input').attr('disabled', true);

    var server = $('#select-server').val();
    
    // Get topic type
    var req_topic = new ROSLIB.ServiceRequest({ topic: server + '/feedback' });
    topic_type.callService( req_topic, function(result_topic) {

        // Add to actions {server: type}
        var action = result_topic.type.slice(0, -8);

        // Create list of message types. Remove 'Action' at the end.
        var messages = [
            action.slice(0, -6) + 'Goal',
            action.slice(0, -6) + 'Result',
            action.slice(0, -6) + 'Feedback'
        ];

        var client_fields = {
            'ros': window.ros,
            'serverName': server,
            'actionName': action
        };

        // Add a timeout if it is set.
        if( $('#text-timeout').val().length )
            client_fields['timeout'] = parseFloat( $('#text-timeout').val() );

        // Create client
        ac = new ROSLIB.ActionClient( client_fields );

        // Ask API about fields in the action goal, status and feedback
        var req = new ROSLIB.ServiceRequest({ type: action });
        details.callService( req, function(result) {
            // For every message or sub message
            for( i in result.typedefs ){
                // Check if it is goal, result or feedback
                index = messages.indexOf(result.typedefs[i].type);
                if ( index != -1 ){
                    // For every field in the message
                    for(j in result.typedefs[i].fieldnames){
                        // Add a block
                        addField( result.typedefs[i].fieldnames[j],
                                result.typedefs[i].fieldtypes[j],
                                result.typedefs[i].fieldarraylen[j], 
                                types[index]);
                    }
                }
            }

            // Begin an action when send button is clicked
            $('#btn-send-action').on('click', sendAction);
        });
    });
}

function sendAction() {
    $('#btn-send-action').off('click');

    // Create goal by accessing the input in the form
    var goal_fields = {};
    $('#form-goal input').each(function(index){
        // Lock the input
        $(this).attr('disabled', true);

        var typed = $(this).val();
        if ( typed.length ){
            // Add doublequotes to strings
            if( $(this).attr('placeholder').indexOf('string') == 0
                    && typed[0] != '"' && typed[0] != '[' ){
                typed = '"' + typed + '"';
            }
            name = $(this).attr('id').split('-').slice(1,3).join('-');
            goal_fields[$('#label-' + name).text()] = JSON.parse( typed );
        }
    });
    
    var goal_msg = new ROSLIB.Message( goal_fields )

    // Create from the dict
    var ag = new ROSLIB.Goal({ 
        actionClient: ac, 
        goalMessage: goal_msg
    });
    
    ag.on('feedback', function(feedback){
        fillField('feedback', feedback);
    });

    ag.on('result', function(result){
        fillField('result', result);

        // Change button style and bind to be able to send a new goal
        $('#btn-send-action').on('click', sendAction).button()
                .removeClass('btn-success').addClass('btn-primary');

        // Unlock goal inputs
        $('#goal input').attr('disabled', false);
    });

    ag.on('status', function(stat){
        // Map status level (0-9) to keys of statuses
        var txt = Object.keys(status_texts)[ stat['status'] ];

        // Set text in paragraph
        $('#label-status').text( txt.toUpperCase() );

        // Set new style for paragraph
        $('#p-status').removeClass().addClass( status_texts[txt] );
        $('#label-status').removeClass().addClass(
                'label ' + status_labels[txt] );

    });

    ag.on('timeout', function(){
        console.log('Received timeout from ActionClient!');
    });

    // Change button style
    $('#btn-send-action').button('sent')
            .removeClass('btn-primary').addClass('btn-success');

    // Empty inputs on feedback and results
    $('#feedback input').val('');
    $('#result input').val('');

    // Send goal
    if( $('#text-timeout').val().length )
        ag.send( parseFloat( $('#text-timeout').val() ) );
    else
        ag.send();
}

// Fill a form from a message emitted by Action Goal (feedback or result)
function fillField(type, message) {
    // For every input in the type section
    $('#form-' + type + ' span').each(function(){
        name = $(this).attr('id').split('-').slice(1,3).join('-');

        var value;
        // If it is an object, convert to string
        if( typeof message[ $('#label-' + name).text() ] == 'object' ){
            // Convert to JSON string.
            value = JSON.stringify( 
                    message[ $('#label-' + name).text() ], null, ' ');
        }
        else
            value = message[ $('#label-' + name).text() ];
            
        $(this).text( value );
    });


}

// Add a control group (label + input) in the form
function addField(name, type, arraylen, field) {
    // Id suffix contains field nd names. 
    // Conflicts should never happens that way
    var id = field + '-' + name;

    // Choose text or number for input type.
    var input_type = "text";
    if( (type.indexOf('int') != -1 || type.indexOf('byte') != -1
            || type.indexOf('float') != -1 || type.indexOf('bool') != -1 )
                && arraylen != 0 )
        input_type = "number";

    // Block is a control group. It provides a good alignement.
    var cg = '<div class="control-group">';

    // Label is name of field
    cg += '<label class="control-label" for="input-' + id 
            + '" id="label-' + id + '">' + name;

    if(arraylen == 0 & field == 'goal')
        cg += '[]';

    // If type is not int, float, bool or string. Create a modal to explain.
    // Dont make it for time and duration too.
    var help_span = '';
    if( type.indexOf('/') != -1 ){
        help_span = '<a class="btn btn-mini" data-toggle="modal" href="#modal-' 
                + id + '"><i class="icon-eye-open"><\/i> Details<\/a>';

        // Ask API about fields in the action goal, status and feedback
        var req = new ROSLIB.ServiceRequest({ type: type });
        details.callService( req, function(details_result) {

            // Create a JSON string from prototype by itering through 
            // message details
            var text = type + ': ' + jsonifyMessage(type, details_result) + '}';

            var modal = '<div id="modal-' + id + '" class="modal hide"'
                    + ' tabindex="-1" role="dialog"><div class="modal-header">'
                    + '<button type="button" class="close" '
                    + 'data-dismiss="modal" aria-hidden="true">×<\/button>'
                    + '<h4>JSON format for <span class="label label-inverse">'
                    + type + '<\/span><\/h4><\/div>'
                    + '<div class="modal-body"><p>' + jsonToUL(text) 
                    + '<\/p><\/div><\/div>';

            // Add modal to modals div
            $('#modals').append( modal );

            delete details_result;
        });

    }

    // Input has type as placeholder
    cg += '<\/label><div class="controls">';
    
    // Only use true input on goal.
    if( field != 'goal')
        cg += '<span class="uneditable-input ';
    else
        cg += '<input type="' + input_type + '" class=" ';

    cg += 'input-long" placeholder="' + type + '" id="input-' + id + '">';

    if( field != 'goal')
        cg += '<\/span>';
    else
        cg += '<\/input>';

    // Help span if necessary
    if( help_span != '' )
        cg += '<span class="help-block">' + help_span + '<\/span>';

    cg += '<\/div><\/div>';
    

    // Add cintrol div to form
    $('#form-' + field).append( cg );
    $('#' + field).show( );
}

$('#btn-cancel-action').click(function(){
    $('.input').attr('disabled', false);
    $('.select').attr('disabled', false);

    $('#btn-send-action').button('reset')
            .removeClass().addClass('btn btn-primary')
    $('#btn-create-action').button('reset').on('click', createAction)
            .removeClass().addClass('btn btn-primary');
    
    $('#form-goal').empty();
    $('#form-feedback').empty();
    $('#form-result').empty();
    
    $('#modals').empty();

    $('#goal').hide();
    $('#feedback').hide();
    $('#result').hide();
})
