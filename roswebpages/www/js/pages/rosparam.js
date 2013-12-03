var get_param;
var set_param;
var del_param;

$('#view-actions').prop('checked', false);
$('#auto-update').prop('checked', false);
$('#btn-add').attr('disabled', false);

var interval;

// Begin process when ros is connected
window.ros.on('connection', initParams);

/* Table initialisation */
$(document).ready(function() {
	table = $('#table-param').dataTable( {
		"sDom": "<'row'<'span6'l><'span6'f>r>t<'row'<'span6'i><'span6'p>>",
		"sPaginationType": "bootstrap",
        "bLengthChange": false,
        "bDeferRender": true,
        "aaSorting": [[ 0, "desc" ]],
        "aoColumnDefs": [
            { "bSortable": false, "bSearchable": false, 
                "bVisible": false, "aTargets": [ 2 ] }
         ],

		"oLanguage": { "sLengthMenu": "_MENU_ records per page" }
	} );

    // Toggle actions visibility
    $('#view-actions').change( function(){
        state = $(this).prop('checked');
	    table.fnSetColumnVis( 2, state );

        // Row to add parameters
        state ? $('#row-add').show() : $('#row-add').hide();
    });

    $('#auto-update').change( function(){
        if( $(this).prop('checked') )
            interval = setInterval(updateParams, 10000);
        else
            clearInterval( interval );
    });

} );

function initParams(){

    // Service to get the parameters name and values
    get_param = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/get_param',
        serviceType: 'rosapi/GetParam'
    });

    // Service to set a new parameter
    set_param = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/set_param',
        serviceType: 'rosapi/SetParam'
    });

    // Service to delete a parameter
    del_param = new ROSLIB.Service({
        ros: window.ros,
        name: '/rosapi/delete_param',
        serviceType: 'rosapi/DeleteParam'
    });

    $('#params').show();
    
    updateParams();
    //setInterval(updateParams, 10000);

}

function newParam(){
    // Unbind click and disabled button during processing.
    $('#btn-add').attr('disabled', true);

    // Force param name to lower case (mandatory)
    var name = $('#text-param-name').val().toLowerCase();
    var value = $('#text-param-value').val();

    if( name == '' || value == ''){
        $('#text-alert').text("Please fill both name and value fields "
                + "before adding a parameter!");
        $('#alert').removeClass('alert-info').addClass('alert-error').show();
        setTimeout( function(){
            $('#text-alert').text("");
            $('#alert').hide()
                    .removeClass('alert-error').addClass('alert-info');
        }, 4000);
        return;
    }
    
    // Reset inputs.
    $('#text-param-name').val("");
    $('#text-param-value').val("");

    $('#text-param-name').attr('placeholder', "Adding...");

    var req = new ROSLIB.ServiceRequest({
        name: name,
        value: JSON.stringify(value)
    });
    set_param.callService( req, function() {
        $('#text-param-value').attr('placeholder', "Done!");
        
        updateParams();

        // Wait some time before reconnection buttons.
        setTimeout(function(){
            // Reset placeholder
            $('#text-param-name').attr('placeholder', "");
            $('#text-param-value').attr('placeholder', "");

            $('#btn-add').attr('disabled', false);
        }, 2000);
    });
}

// Process the parameters dict (createad by a JSON parse)
function processParams( prefix, parameters ){
    var rows = []; 

    $.each(parameters, function(key, value){
        name = prefix + '/' + key;

        // If value, is a object, process the object (recursion)
        if (typeof value == 'object'){
            processed_rows = processParams(name, value);
            rows = rows.concat(processed_rows);
        }
        else {
            rows.push([
                    name, 
                    value,
                    '<div class="btn-group">'
                    // Edit button
                    + '<button class="btn btn-info" type="button" '
                    + 'onclick="javascript:editParam(\'' + name + '\')">'
                    + '<i class="icon-edit icon-white"><\/i><\/button>'
                    // Delete button
                    + '<button class="btn btn-danger" type="button" '
                    + 'onclick="javascript:delParam(\'' + name + '\')">'
                    + '<i class="icon-trash icon-white"><\/i><\/button>'
                    + '<\/div>' 
            ]);
        }
    });
    
    return rows;
}

// Update the parameters
function updateParams(){

    // Manage alert
    $('#text-alert').text("Updating parameters...");
    $('#alert').show();

    // If you call get_param with empty string, 
    // you receive everything as a JSON object. It avoids doing tons of calls.
    var req = new ROSLIB.ServiceRequest({});

    // Call service to get a new list of params.
    get_param.callService( req, function(result) {
        var rows = processParams('', JSON.parse(result.value) );

        table.fnClearTable();
        table.fnAddData( rows );

        // Inform end of update in alert
        $('#text-alert').text("Updated!");
        $('#alert').removeClass('alert-info')
                .addClass('alert-success').show();
        setTimeout( function(){
            $('#text-alert').text("");
            $('#alert').hide().removeClass('alert-success')
                    .addClass('alert-info');
        }, 2000);
    });
}

// Set a new value for a parameter. Called by edit button on the row.
function editParam(name){

    // Update name in modal
    $('#code-modal').text(name);

    $('#btn-modal').on('click', function(){
        $('#btn-modal').off('click').button('updating')
            .addClass('btn-warning').removeClass('btn-primary');
        var req = new ROSLIB.ServiceRequest({
            name: name,
            value: JSON.stringify( $('#text-modal').val() )
        });
        set_param.callService( req, function() {
            $('#btn-modal').button('updated')
                .addClass('btn-success').removeClass('btn-warning');

            updateParams();
            
            // Hide modal and put back button original style.
            setTimeout(function(){
                $('#text-modal').val('');
                $('#btn-modal').button('update')
                    .addClass('btn-primary').removeClass('btn-success');
                $('#modal-edit').modal('hide');
            }, 1000);
         });
    });

    $('#modal-edit').modal('show');
}

// Delete a parameter. Called by delete button of that parameter.
function delParam( name ){
    var req = new ROSLIB.ServiceRequest({ name: name });
    del_param.callService( req, function() {
        updateParams();
    });
}
