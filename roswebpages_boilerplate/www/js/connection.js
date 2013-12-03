var hostname = "";

// Get hostname by spliting URL 
$("#text-host").val(document.URL.split(':')[1].replace("//", ""));

// Connect to ROS via a button
$('#btn-connect').bind('click', connect);

function connect() {
    // Change style of connect button
    $('#btn-connect').button('loading');
    $('#btn-connect').removeClass('btn-primary').addClass('btn-warning');

    hostname = 'ws://' + $('#text-host').val() + ':9090';
    window.ros.connect( hostname );

    window.ros.on('error', function(error) {
	alert("ROS connection failed with the error:" + error);
    });

    window.ros.on('connection', function() {
        $('#btn-connect').unbind('click')
        $('#btn-connect').button('complete').button('toggle');
        $('#btn-connect').removeClass('btn-warning').addClass('btn-success');
    });
}
