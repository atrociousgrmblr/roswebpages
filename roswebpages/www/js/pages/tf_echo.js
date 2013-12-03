var frames = {};

// Begin process when ros is connected
window.ros.on('connection', tfEcho);

function tfEcho(){
    $('#create').show();

    // Service to get nodes
    var nodes = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/nodes',
        serviceType: 'rosapi/Nodes'
    });
    
	// Subscribe to tf
	var sub = new ROSLIB.Topic({
		ros: window.ros,
		name : '/tf', 
	    messageType : 'tf/tfMessage'
	});

	sub.subscribe( cb );

    // Update topic list in typeahead every 5 seconds.
    setInterval( updateFrameList, 5000);

    // Check if tf2_web_republisher is running.
    var req = new ROSLIB.ServiceRequest({});
    nodes.callService( req, function(result) {
        var running = false;
        $.each(result.nodes, function(){
            if( this.indexOf('tf2_web_republisher') != -1 ){
                running = true;
                return false;
            }
        });
        if( !running )
            $('#alert-mjpeg').show();
    });

    $('#btn-listen').click(transform);
}

// Update the topic list
function updateFrameList(){
    $.each( frames, function(name, last_seen) {
        // Frames older than 5 seconds are removed
        if( Math.floor((new Date()).getTime() / 1000) - last_seen > 5){
            // Remove options and delete frames.
            $('[value="' + name + '"]').remove();
            delete frames[name];
        }
    });
}

// Subscribe to the topic provided in the text input.
function transform(){
    // Create client with src as fixed frame
    var tfClient = new ROSLIB.TFClient({
        ros: window.ros,
        fixedFrame: $('#select-src').val(),
        angularThres: 0.01,
        transThres: 0.01
    });

    tfClient.subscribe($('#select-dest').val(), function( tf ) {
        console.log(tf);
        $.each(tf, function(name, vector){
            $.each(vector, function(position, value){
                if( typeof value == 'number' )
                    $('#td-' + name[0] + position).text( value.toFixed(3) );
            });
        });
    });

    $('#transform').show();
    $('#btn-listen').button('listening').addClass('btn-success')
            .removeClass('btn-primary');
}

// Listen to frames
function cb( msg ) {
    // For each transform in message.
    $.each(msg.transforms, function(i, v){
        // Remove first '/'
        parent = v.header.frame_id.replace('/', '');
        child = v.child_frame_id.replace('/', '');

        // If child exist, then parent exist for sure
        if( Object.keys(frames).indexOf(child) == -1 ){
            addOption(child, v.header.stamp.secs);
            if( Object.keys(frames).indexOf(parent) == -1 )
                addOption(parent, v.header.stamp.secs);
        }

        // Add to array or update time
        frames[ parent ] = v.header.stamp.secs;
        frames[ child ] = v.header.stamp.secs;
    });
}

function addOption( name, time ){
    // Create option
    var option = '<option value="' + name + '">' + name + '<\/option>';

    // Add to select inputs for source and destination.
    $('#select-src').append( option );
    $('#select-dest').append( option );

    // Destination take the value
    $('#select-dest').val( name );
}

// Unsubscribe button callback
$('#btn-stop').click(function(){
    $('#transform').hide();
    $('#btn-listen').button('listen').removeClass('btn-success')
            .addClass('btn-primary');
});
