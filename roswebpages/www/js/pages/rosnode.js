var topics_service;
var subscribers;
var publishers;
var topic_type;

var services_service;
var providers;
var service_type;
var service_host;

var node;
var nodes;
var oldnodes = [];

hosted = false;

// Hide nodes div until subscription.
$('#nodes').hide();
$('#view-sub').hide();
$('#view-pub').hide();
$('#view-srv').hide();
$('#view-host').hide();

// Begin process when ros is connected
window.ros.on('connection', initNodes);

function initNodes(){
    $('#nodes').show();

    // Service to get a list of current nodes
    nodes = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/nodes',
        serviceType: 'rosapi/Nodes'
    });

    // Service to get a list of current topics
    topics_service = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/topics',
        serviceType: 'rosapi/Topics'
    });

    // Service to get a get a list of nodes publishing a topic
    publishers = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/publishers',
        serviceType: 'rosapi/Publishers'
    });

    // Service to get a get a list of nodes subscribing to a topic
    subscribers = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/subscribers',
        serviceType: 'rosapi/Subscribers'
    });

    // Service to get the type of a topic
    topic_type = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/topic_type',
        serviceType: 'rosapi/TopicType'
    });

    // Service to get a list of current services
    services_service = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/services',
        serviceType: 'rosapi/Services'
    });

    // Service to get a get node providing a service
    providers = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/service_providers',
        serviceType: 'rosapi/ServiceProviders'
    });

    // Service to get the type of a service
    service_type = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/service_type',
        serviceType: 'rosapi/ServiceType'
    });

    service_host = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/service_host',
        serviceType: 'rosapi/ServiceHost'
    });

    // Update topic list in typeahead every 5 seconds and call once now.
    updateNodeList();
    setInterval( updateNodeList, 5000);
    
    setTimeout( function(){
        // Dismiss the information alert.
        $("#alert-ros").alert('close');
    }, 20000 );

    $('#btn-nodes').click(information);

}

// Update the nodes
function updateNodeList(){
    // Call service to get a new list of nodes.
    var req = new ROSLIB.ServiceRequest();
    nodes.callService( req, function(result) {
        $.each(result.nodes, function(index, value){
            // Create an option if it's a new node node.
            if( oldnodes.indexOf( value ) == -1 ) {
                option = '<option value="' + value + '">' 
                    + value + '<\/option>';
                $('#select-nodes').append(option);

            }
        });
        
        // Remove nodes that finsihed.
        $.each(oldnodes, function(index, value){
            if ( result.nodes.indexOf( value ) == -1 )
                $('[value="' + value + '"]').remove();
        });

        // Replace list
        oldnodes = result.nodes;
    });

}

// Subscribe to the topic provided in the text input.
function information() {
    // Clear old fields.
    $('li').remove();

    // Hide lists again
    $('#view-sub').hide();
    $('#view-pub').hide();
    $('#view-srv').hide();
    $('#view-host').hide();

    hosted = false;

    // Get input value 
    node = $('#select-nodes').val();
    
    var req = new ROSLIB.ServiceRequest({});
    
    // Topics
    topics_service.callService( req, function(result) {
        processSubscribers( result.topics );
    });

    topics_service.callService( req, function(result) {
        processPublishers( result.topics );
    });
    
    // Services
    services_service.callService( req, function(result) {
        processProviders( result.services );
    });
}

// Use recursive function to sweep topics and services. 
// That way you get no conflicts.

function processSubscribers( topics ){
    var topic = topics.pop();
    var req = new ROSLIB.ServiceRequest({ topic: topic });
    subscribers.callService( req, function ( subs ) {
        if( subs.subscribers.indexOf(node) != -1){
            topic_type.callService( req, function(type) {
                addField('sub', topic, type.type);
            });
        }
    });
    if( topics.length )
        processSubscribers( topics );
}

function processPublishers( topics ){
    var topic = topics.pop();
    var req = new ROSLIB.ServiceRequest({ topic: topic });
    publishers.callService( req, function( pubs ) {
        if( pubs.publishers.indexOf(node)  != -1){
            topic_type.callService( req, function(type) {
                addField('pub', topic, type.type);
            });
        }
    });
    if( topics.length )
        processPublishers( topics );
}

function processProviders( services ){
    // Providers
    var service = services.pop();
    var req = new ROSLIB.ServiceRequest({ service: service });
    providers.callService( req, function( provs ) {
        if( provs.providers.indexOf(node) != -1){
            service_type.callService( req, function(type) {
                addField('srv', service, type.type);
                if( !hosted )
                    processHost( service );
            });
        }
    });
    if( services.length )
        processProviders( services );
}

function processHost( service ){
    var service_copy = service
    var req = new ROSLIB.ServiceRequest({ service: service_copy });
    service_host.callService( req, function( host ) {
        $('#code-host').text( host.host.trim() );
        $('#view-host').show();
    });
    hosted = true;
}

// Add a description field and show division
function addField(id, name, type){
    var li = '<li>' + name + ': <code>' + type + '<\/code><\/li>';
    $('#ul-' + id).append( li );
    $('#view-' + id).show();
}
