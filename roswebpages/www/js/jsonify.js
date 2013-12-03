/*
 *  Functions to transform the result of message_details service
 *  to a parable JSON string and to a html list.
 *
 *  Used by rosservice and action client.
 */

// Check if type is a JSON object
function isMessage(type){
    // There is a package name inside type
    if( type.indexOf('/') != -1)
        return true;

    // Time
    if( type.indexOf('time') != -1)
        return true;

    // Duration
    if( type.indexOf('duration') != -1)
        return true;

    return false;
}

// Create a JSON string from rosapi message_details result.
function jsonifyMessage(type, result){
    // Find message in result vector
    var index = -1;
    $.each(result.typedefs, function(i, value){
        if( value.type === type){
            index = i;
            return false;
        }
    });

    if(index < 0){
        console.log("Big jsonify problem: Can't find message in result.");
        return;
    }

    var text = '{';
    var def = result.typedefs[index];
    for(var i = 0; i < def.fieldnames.length; ++i){
        text += def.fieldnames[i];

        // Arrays: Put on names because it gives bad result on types when
        // converting to html lists.
        if( def.fieldarraylen[i] == 0 ) {
            text += '[]';
        }
        // NOTE: This case should never happen
        else if( def.fieldarraylen[i] > 0 ) {
            text += '[' + def.fieldarraylen + ']';
        }

        text += ': ';

        // Test if type is message.
        if( isMessage(def.fieldtypes[i]) ) {
            // Use recursion on next typedefs field in result.          
            text += jsonifyMessage(def.fieldtypes[i], result);
        }
        else {
            text += def.fieldtypes[i];
        }

        // No coma at last iteration.
        if (i != def.fieldnames.length - 1)
            text += ', ';
    }

    return text + '}';
}

// Transform a JSON string into an <ul><li> format that can be displayed 
// on the HTML page
function jsonToUL(text){
    var list = '<ul class="unordered"><li>';
    text.replace(/, /g, ',');

    // Sweep by chars
    $.each(text.split(''), function(index, character){
        if(character === ':' 
                && text.slice(index, index+3).indexOf('{') == -1)
            list += ': <code>';
        else if(character === ',')
            list += '<\/code><\/li><li>';
        else if(character === '{')
            list += '<ul><li>';
        else if(character === '}')
            list += '<\/code><\/li><\/ul>';
        else
            list += character;
    });

    list += '<\/li><\/ul>';
    list.replace(/<li><\/li>/g, ''); // Make sure not to have empty rows
    list.replace(/<code> /g, '<code>'); // Small fix to a better display
    return list;
}
