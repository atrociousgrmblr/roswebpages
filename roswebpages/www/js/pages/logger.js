var ros_levels = {
	'1': 'Debug',
	'2': 'Info',
	'4': 'Warning',
	'8': 'Error',
	'16': 'Fatal'
}

var badges = {
	'1': 'badge-success',
	'2': 'badge-info',
	'4': 'badge-warning',
	'8': 'badge-important',
	'16': 'badge-inverse'
}

var texts = {
	'1': 'text-success',
	'2': 'text-info',
	'4': 'text-warning',
	'8': 'text-error',
	'16': 'text-inverse'
}

var table;
$('#logs').hide();

/* Table initialisation */
$(document).ready(function() {
	table = $('#table-rosout').dataTable( {
		"sDom": "<'row'<'span6'l><'span6'f>r>t<'row'<'span6'i><'span6'p>>",
		"sPaginationType": "bootstrap",
        "bLengthChange": false,
        "bDeferRender": true,
        "aaSorting": [[ 0, "desc" ]],

        // Create a hidden collunm containing the ROS level as text.
        "aoColumnDefs": [
            { "bSearchable": true, "bVisible": false, "aTargets": [ 4 ] }
         ],

		"oLanguage": { "sLengthMenu": "_MENU_ records per page" }
	} );
} );

// Begin process when ros is connected
window.ros.on('connection', logger);

function logger(){
    $('#logs').show();

	var sub = new ROSLIB.Topic({
		ros: window.ros,
		name : '/rosout', 
	    messageType : 'rosgraph_msgs/Log'
	});
	sub.subscribe( cb );
}

// Add each log in datatable. Text color and badge is based on level.
function cb(msg) {
    // Convert ROS Time structure to JS Date. (ms = s*10^3 + ns*10^-6)  
    var d = new Date( parseInt(msg.header.stamp.secs) * 1000
        + parseInt(msg.header.stamp.nsecs) / 1000000 );

    // Text color
    p_in = '<p class="' + texts[ msg.level ] + '">'; 
    p_out = '<\/p>';

    // Add row
    table.fnAddData([
        p_in + d.toLocaleTimeString() + p_out, 
        p_in + '<span class="badge ' + badges[ msg.level ] + '">' 
                + msg.level + '<\/span> ' + p_out,
        p_in + msg.name + p_out,
        p_in + msg.msg + p_out,
        ros_levels[ msg.level ]
    ], true);

}
