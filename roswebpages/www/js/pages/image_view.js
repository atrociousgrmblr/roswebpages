var topics_for_type;
var nodes;

// Hide canvas
$('#mjpeg').hide();

// Subscribe on click or enter pressed
$('#btn-watch').on('click', watch );

// Begin process when ros is connected
window.ros.on('connection', initROS);

function initROS(){
    // Dismiss the information alert.
    $("#alert-ros").alert('close');

    // Service to get a list of current topics
    topics_for_type = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/topics_for_type',
        serviceType: 'rosapi/TopicsForType'
    });

    nodes = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/nodes',
        serviceType: 'rosapi/Nodes'
    });

    // Check if MJPEG server is running.
    var req = new ROSLIB.ServiceRequest({});
    nodes.callService( req, function(result) {
        var running = false;
        $.each(result.nodes, function(){
            if( this.indexOf('mjpeg') != -1 ){
                running = true;
                return false;
            }
        });
        if( !running )
            $('#alert-mjpeg').show();
    });

    // Update topic list in typeahead every 5 seconds and call once now.
    updateTopicList();
    setInterval( updateTopicList, 5000);
}

// Update the topic list
function updateTopicList(){
    var req = new ROSLIB.ServiceRequest({type: 'sensor_msgs/Image'});
    topics_for_type.callService( req, function(result) {
        // Reinit with new options.
        var options = {
            source: result.topics
        };
        $('#text-topic').typeahead(options);
    });
}

// Watch the topic provided in the text input.
function watch(){
    $('#btn-watch').button('disconnect')
        .off('click').on('click', disconnect)
        .removeClass('btn-primary').addClass('btn-danger');

    // Size depends on window width. Max is 640.
    w = Math.min(window.innerWidth - 40, 640);
    h = 3 * w / 4;

    // Assert topic name begins with '/'
    topic_name = $('#text-topic').val()
    if( topic_name[0] !== '/' )
        topic_name = '/' + topic_name;
    
    var viewer = new MJPEGCANVAS.Viewer({
      divID: 'mjpeg',
      host: $('#text-host').val(),
      port: parseInt( $('#text-port').val() ),
      width: w,
      height: h,
      topic: topic_name
    });

    // Catch warnings. Tests showed that it always happen at the beginning so
    // wait for 1 second before disconnecting.
    setTimeout( function(){
        // Catch only once.
        viewer.once('warning', function(){ 
            alert("Topic " + topic_name + " is unavailable. Disconnecting...");
            disconnect();
        });
    }, 1000);
    
    // Show canvas.
    $('#mjpeg').show();
}

// Disconnect from mjpegserver
function disconnect() {
    // Remove canvas by emptying parent.
    $('#mjpeg').empty();
    $('#mjpeg').hide();

    // Reinit buttons and inputs
    $('#btn-watch').button('connect')
        .off('click').on('click', watch)
        .removeClass('btn-danger').addClass('btn-primary');
}
