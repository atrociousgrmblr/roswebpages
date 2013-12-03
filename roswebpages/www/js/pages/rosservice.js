// rosapi services
var services;
var service_type;
var request_details;

var providers;
var service_host;

var message_details;

// Typeahead options
var options = { 'source': [] };

// Begin process when ros is connected
window.ros.on('connection', initSubscriber);

function initSubscriber(){
    $('#actions').show( );

    // Service to get a list of current services
    services = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/services',
        serviceType: 'rosapi/Services'
    });

    service_type = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/service_type',
        serviceType: 'rosapi/ServiceType'
    });

    request_details = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/service_request_details',
        serviceType: 'rosapi/ServiceRequestDetails'
    });

    message_details = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/message_details',
        serviceType: 'rosapi/MessageDetails'
    });

    providers = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/service_providers',
        serviceType: 'rosapi/ServiceProviders'
    });

    service_host = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/service_host',
        serviceType: 'rosapi/ServiceHost'
    });

    // Update service list in typeahead every 5 seconds and call once now.
    updateServiceList();
    setInterval( updateServiceList, 5000);

    $('#btn-call').click( call );
    $('#btn-send-request').click( sendRequest );
    $('#btn-information').click( information );
}

// Update the service list
function updateServiceList(){
    var req = new ROSLIB.ServiceRequest();
    services.callService( req, function(result) {
        // Reinit with new options.
        options = {
            source: result.services
        };
        $('#text-service').typeahead(options);
    });
}

function information(){
    // Get input value 
    var service = $('#text-service').val();

    if( options.source.indexOf(service) == -1){
        $('#text-alert').text("This service does not exist!");
        $('#alert').show();
        setTimeout( function(){ $('#alert').hide(); }, 5000 );
        return;
    }

    // Empty table
    $('#table-provs tbody').empty();
    $('#modal-provs').hide();

    // Get service type from rosapi
    var req = new ROSLIB.ServiceRequest({ service: service });
    service_type.callService( req, function(result) {
        // Display type in a paragraph above table.
        $('#modal-type-info').text(result.type);
        $('#modal-service-info').text(service);

        providers.callService( req, function(provs) {
            $.each(provs.providers, function(i, v){
                var req_host = new ROSLIB.ServiceRequest({ 
                    service: v + '/get_loggers' 
                });
                service_host.callService( req_host, function(host) {
                    var row = '<tr><td>' + v + '<\/td><td>' 
                            + host.host.trim() + '<\/td><\/tr>';

                    $('#table-provs tbody').append( row );
                    $('#modal-provs').show();
                });
            });
        });
    });
    
    $('#modal-info').modal('show');
}

function sendRequest(){

    var request_fields = {};
    $('#table-request input').each( function() {
        var typed = $(this).val();
        if ( typed.length ){
            // Add doublequotes to strings
            if( $(this).attr('placeholder').indexOf('string') == 0
                    && typed[0] != '"' && typed[0] != '[' ){
                typed = '"' + typed + '"';
            }
            request_fields[ $(this).attr('data') ] = JSON.parse( typed );
        }
    });

    var service_client = new ROSLIB.Service({
        ros: window.ros,
        name: $('#text-service').val(),
        serviceType: $('#type').text()
    });

    var client_request = new ROSLIB.ServiceRequest( request_fields );
    service_client.callService( client_request, function(result) {
        // Remove old message
        $('#table-response tbody').empty();

        // Create a row for each field/value pair.
        $.each(result, function(field, value){
            // Use stringify to be sure to have a string in Value field.
            val = JSON.stringify(value, null, ' ');

            // Remove double quotes if useless
            if( val[0] === '"' )
                val = val.slice(1, -1);

            // Don't display large data. Example: data field of Image msg.
            if(val.length > 500)
                val = "Data was too big to be displayed...";
            row = '<tr><td>' + field + '<\/td><td>' + val + '<\/td><\/tr>';
            $('#table-response tbody').append( row );
        });
        
        $('#response').show();
    });
}

function call(){
    // Get input value 
    var service = $('#text-service').val();

    if( options.source.indexOf( service ) == -1){
        $('#text-alert').text("Can't call an unexistent service...");
        $('#alert').show();
        setTimeout( function(){ $('#alert').hide(); }, 5000 );
        return;
    }

    var req = new ROSLIB.ServiceRequest({ service: service });
    service_type.callService( req, function(result) {
        // Display type in a paragraph above table.
        $('#type').text(result.type);

        var req_details = new ROSLIB.ServiceRequest({ type: result.type });
        request_details.callService( req_details, function(details){

            // Empty table and modals       
            $('#table-request tbody').empty();
            $('#field-modals').empty();

            // Only display first level
            srv = details.typedefs[0];
            for( i in srv.fieldnames ){
                requestField( srv.fieldtypes[i], 
                        srv.fieldnames[i], srv.fieldarraylen[i]);
            }

            $('#request').show();
            $('#cancel').show();
        });
    });
}

function requestField(fieldtype, fieldname, fieldarray){
    var arr = fieldarray != -1 ? '[]' : '';
    
    var input_type = "text";
    if( (fieldtype.indexOf('int') != -1 
            || fieldtype.indexOf('float') != -1
            || fieldtype.indexOf('byte') != -1
            || fieldtype.indexOf('char') != -1
            || fieldtype.indexOf('bool') != -1 ) && arr == '' )
        input_type = "number";

    var row = '<tr><td>' + fieldname;

    // If type is not int, float, bool or string. 
    // Create a modal to explain.
    // Dont make it for time and duration too.
    if( fieldtype.indexOf('/') != -1 ){
        row += ' <a class="btn btn-mini" data-toggle="modal" href="#modfield-'
                + fieldname + '"><i class="icon-eye-open"><\/i> Details<\/a>';

        var req = new ROSLIB.ServiceRequest({ type: fieldtype });
        message_details.callService(req, function(result) {

            // Create a JSON string for prototype 
            // by itering through message details
            text = fieldtype + ': ' + jsonifyMessage(fieldtype, result) + '}';

            var modal = '<div id="modfield-' + fieldname 
                    + '" class="modal hide" tabindex="-1" role="dialog">'
                    + '<div class="modal-header">'
                    + '<button type="button" class="close" '
                    + 'data-dismiss="modal" aria-hidden="true">×'
                    + '<\/button><h4>JSON format for <span '
                    + 'class="label label-inverse">' + fieldtype 
                    + '<\/span><\/h4><\/div><div class="modal-body"><p>' 
                    + jsonToUL(text) + '<\/p><\/div><\/div>';

            // Add modal to modals div
            $('#field-modals').append( modal );
        });
    }

    row += '<\/td><td><input type="' + input_type
            + '" placeholder="' + fieldtype + arr
            + '" class="input-medium" data="' 
            + fieldname + '"><\/td><\/tr>';

    $('#table-request tbody').append( row );
}

// Used by onclicks in listing modal.
function setService( service ){
    $('#text-service').val( service );
}

function listServices(){
    $('#table-list tbody').empty();
    
    $.each(options.source, function(i, v){
        var req = new ROSLIB.ServiceRequest({ service: v });
        service_type.callService( req, function(result) {
            var row = '<tr><td>' + v + '<\/td><td>' + result.type
                    + '<\/td><td><button class="btn" data-dismiss="modal" '
                    + 'onclick="javascript:setService(\'' + v
                    + '\')">Choose<\/button><\/td><\/tr>';
            $('#table-list tbody').append( row );
        });
    });

    $('#modal-list').modal('show');
}

// Cancel button callback
$('#btn-cancel').click(function(){
    $('#table-request tbody').empty();
    $('#table-response tbody').empty();
    
    $('#field-modals').empty();

    $('#response').hide();
    $('#request').hide();
});
