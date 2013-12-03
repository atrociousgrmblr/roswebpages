// TF Tree drawer by Adrien Tronche.

/*

   Elements form should be:

    FRAME_ID: {
        level: 1 to X,
        position: 1 to X,
        text: paper.text(), 
        box: paper.rect(),
        connection: paper.connection(),
        parent: PARENT_ID,
        time: LAST_TIME_SEEN (ros.time.secs),
        transform: LAST_TRANSFORM
    }

*/
var elements = {};

// Gradient green to yellow to red.
var colors = ['#00cc00', '#33cc00', '#66cc00','#99cc00', '#cccc00', '#FFFF00',
        '#FFCC00', '#ff9900', '#ff6600', '#FF3300 ', '#FF0000' ]; 

var paper;

// Dict object: {level: "number of element at that level" }
var population = {};

// Constants for drawing
var rect_a = 7;
var font_size = 12;
var w = 240;
var h = 100;

// TF trees are supposed to be wide so display on mobile devices is hard.
// 'Mobile view' mode replace underscores by line breaks in names
$('#mobile-view').prop('checked', false);

var time_adjustement = 0;

// Begin process when ros is connected
window.ros.on('connection', tf);

function tf(){
    // Create paper for drawing elements. Size will be adjusted in draw()
    paper = Raphael('holder', 640 , 400);

    // Subscribe to tf
    var sub = new ROSLIB.Topic({
        ros: window.ros,
        name : '/tf', 
        messageType : 'tf/tfMessage'
    });

    sub.subscribe( cb );

    // Draw every 2 seconds
    setInterval(draw, 3000);

    // Update modal every 500ms 
    setInterval(updateModal, 500);
}

// TF: Create the Tree.
function cb( msg ) {
    // For every transforms in the message.
    for( i in msg.transforms ){
        // Process parent. var is called father since parent apears to be a
        // keywors in javascript (not always)
        father = msg.transforms[i].header.frame_id.replace('/','');
        if( $.inArray(father, Object.keys(elements)) == -1){
            element = {};
            element['level'] = 1;
            element['position'] = 1;
            element['parent'] = 'no_parent';
            elements[father] = element;
        }

        // Process child
        child = msg.transforms[i].child_frame_id.replace('/','');
        if( $.inArray(child, Object.keys(elements)) == -1){
            element = {};
            element['level'] = elements[father]['level'] + 1;
            element['position'] = 1;		
            // Updated before drawing.
            element['parent'] = father;
            elements[child] = element;
        }
        else{
            // Update name
            if (father !== elements[child]['parent'])
                elements[child]['parent'] = father;

            // Update levels
            if ( elements[ elements[child]['parent'] ]['level'] + 1 
                    != elements[child]['level'] ){
                adjustLevels(father);
            }
        }

        // Update last appearance times
        elements[father]['time'] = msg.transforms[i].header.stamp.secs;
        elements[child]['time'] = msg.transforms[i].header.stamp.secs;

        elements[child]['transform'] = msg.transforms[i].transform;
    }
    
    time_adjustment = Math.floor((new Date()).getTime() / 1000) - 
            msg.transforms[0].header.stamp.secs;
}

// Recursive function to adjust levels
function adjustLevels(name){
    $.each(elements, function(k, v){
        if( v['parent'] == name ){
            v['level'] = elements[name]['level'] + 1;
            adjustLevels(k);
        }
    });
}

// Recursive function to adjust horizontal positions
function adjustPositions(level){
    // Construct and array of pairs for the level: ['frame', 'parent_position']
    parent_position = [];
    $.each(elements, function(k, v){
        if( v['level'] == level ){
            parent_position.push( [k, elements[ v['parent'] ]['position'] ]);
        }
    });

    // No elements at that level, positioning done.
    if ( !parent_position.length )
        return;

    // Keep population
    population[level] = parent_position.length;

    // Sort by levels
    parent_position.sort(function(a, b) {return a[1] - b[1]});
    for(var i = 0; i < parent_position.length; i +=1 ){
        elements[parent_position[i][0]]['position'] = i + 1;
    }

    // Process next level
    adjustPositions(level + 1);
}

// Update tree by removing old transforms (UNUSED for now)
function updateTree(){
    $.each(elements, function(k, v){
        // If 10 second without seeing a frame, delete the whole branch.
        if( Math.floor((new Date()).getTime() / 1000) 
                - time_adjustment - v['time'] > 9 ){
            deleteBranch(k);
        }
    });
}

// Recursive function to delete a tf frame and all its children in the tree
function deleteBranch(name){
    $.each(elements, function(k, v){
        if( name == v['parent'] ){
            delete elements[k];
            deleteBranch(k);
        }
    });
}

// Draw tf tree
function draw(){
    paper.clear();

    // Remove old frames
    updateTree();

    // Dont draw if less than two elements (should never happen)
    if (Object.keys(elements).length < 2)
        return;

    // Adjust positions on levels
    delete population;
    population = {};
    population[1] = 1;	// Must be always only one element on level 1.
    adjustPositions(2); // No need to adjust level 1, start at two.

    // Clear all paper and reset size to fit new tree.
    paper_w = window.innerWidth - 50;
    paper_h = h * Object.keys(population).slice(-1)[0]; // h * levels
    paper.setSize(paper_w, paper_h);

    mobile_view = $('#mobile-view').prop('checked');

    // Draw elements
    $.each(elements, function(k, v){

        // Get a color from last time frame was seen
        icolor = Math.floor((new Date()).getTime() / 1000) 
                - time_adjustement - v['time'];
        color = icolor < 0 ? colors[0] : colors[icolor];

        // Format text be removing first / and replacing _ by line breaks if
        // mobile view is on (checkbox)
        name = mobile_view ? k.replace(/_/g,'\n') : k;

        // Create text element	
        v['text'] = paper.text( 
                paper_w * (v['position'] - 0.5) / population[ v['level'] ], 
                20 + h * (v['level'] - 1), name );
        v['text'].attr('font-size', font_size).data('name', k);

        // Create rectangle around text by using bounding box.
        bbox = v['text'].getBBox();
        v['box'] = paper.rect(
                bbox.x - 8 , bbox.y - 3, bbox.width + 16, bbox.height + 6, 3);
        v['box'].attr({
            fill: color, 
            stroke: color, 
            'fill-opacity': 0, 
            'stroke-width': 2}).data('name', k);

        // Text must be in front of rect.
        v['text'].toFront();

        // Events: When box or text is clicked, open modal with transform.
        if(v['level'] > 1){			
            v['box'].click( displayInfos );
            v['text'].click( displayInfos );
        }
    });

    // Draw connections once all elements are done.
    $.each(elements, function(k, v){
        if( v['parent'] != 'no_parent' ){
            // Get bounding box on child and parent
            cbbox = elements[k]['box'].getBBox();
            pbbox = elements[v['parent']]['box'].getBBox();

            // Create a path : M is starting point, L means 'line to'
            str = 'M' + (pbbox.x + pbbox.width / 2) + ',' + pbbox.y2
                    + 'L' + (cbbox.x + cbbox.width / 2) + ',' + cbbox.y;
            v['connection'] = paper.path( str );

            // Add an arrow at the end.
            v['connection'].attr({
                'arrow-end': 'classic-wide-long', 
                'stroke-width': 2, 
                'fill': 'black'
            });
        }
    });
}

// Display a new frame in modal
function displayInfos(){
    name = this.data('name');
    $('#modal-name').text( name );
    $('#modal-parent').text( elements[name]['parent'] );
    $('#modal-transform').modal('show');
}

function updateModal(){
    // Find good element
    index = $.inArray($('#modal-name').text(), Object.keys(elements));
    if (index != -1){
        // Double each to get to x, y, z values.
        element = elements[ Object.keys(elements)[index] ];
        $.each(element['transform'], function(type, vector){
            $.each(vector, function(field, value){
                $('#modal-' + type[0] + field).text( value.toFixed(3) );
            });
        });
    }		
}

