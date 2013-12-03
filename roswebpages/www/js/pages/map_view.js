// Service from rosapi
var topics_for_type;

var viewer;
var gridClient;

// Hide canvas
$('#map').hide();
$('#connect').hide();

// Reload map continuously?
$('#slam-mode').prop('checked', false);
$('a').tooltip({ delay: { show: 300, hide: 100 } });

var oldmaps = [];

// Begin process when ros is connected
window.ros.on('connection', initROS);

function initROS(){
    $('#connect').show();

    // Service to get a list of current topics
    topics_for_type = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/topics_for_type',
        serviceType: 'rosapi/TopicsForType'
    });

    // Update topic list every 5 seconds and call once now.
    updateMapList();
    setInterval( updateMapList, 5000);

    // Subscribe on click or enter pressed
    $('#btn-display').on('click', displayMap );
}

// Update the topic list
function updateMapList(){
    // Only OccupancyGrid messages
    var req = new ROSLIB.ServiceRequest({type: 'nav_msgs/OccupancyGrid'});

    topics_for_type.callService( req, function(result) {
        $.each(result.topics, function(index, value){
            // Create an option if it's a new node node.
            if( oldmaps.indexOf( value ) == -1 ) {
                option = '<option value="' + value + '">' 
                    + value + '<\/option>';
                $('#select-map').append(option);
            }
        });

        // Remove nodes that finsihed.
        $.each(oldmaps, function(index, value){
            if ( result.topics.indexOf( value ) == -1 )
                $('[value="' + value + '"]').remove();
        });

        // Replace list
        oldmaps = result.topics;
    });
}

// Watch the topic provided in the text input.
function displayMap(){
    topic_name = $('#select-map').val();

    if (topic_name == ""){
        console.log("No topic selected...");
        return;
    }
    
    $('#btn-display').button('disconnect').off('click').on('click', disconnect)
            .removeClass('btn-primary').addClass('btn-danger');

    // Size depends on window width. Max is 640.
    w = Math.min(window.innerWidth - 40, 640);
    h = 3 * w / 4;
    
    viewer = new ROS2D.Viewer({
        divID: 'map',
        width: w,
        height: h
    });

    // Setup the map client.
    gridClient = new ROS2D.OccupancyGridClient({
        ros: window.ros,
        topic: topic_name,
        rootObject: viewer.scene,
        continuous: $('#slam-mode').prop('checked')
    });

    // Scale the canvas to fit to the map
    gridClient.on('change', function(){
        console.log("Changed!");
        viewer.scaleToDimensions(
                gridClient.currentGrid.width, gridClient.currentGrid.height);
    });

    // Show canvas.
    $('#map').show();
}

// Disconnect from mjpegserver
function disconnect() {
    // Remove canvas by emptying parent.
    $('#map').empty();
    $('#map').hide();

    // Reinit buttons and inputs
    $('#btn-display').button('connect').off('click').on('click', displayMap)
            .removeClass('btn-danger').addClass('btn-primary');
}
