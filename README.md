#ROS Web Pages#

[ROS][2] tools for your browser.
Powered by [RobotWebTools][3]' [roslibjs][4], [Bootstrap][5] and some
other libraries.
Developped at [IntRoLab][1].

Please note that this project in still **unstable**.

##Introduction##

the `ROS Web Pages` are designed to be displayed on computers, tablets
and smartphones. Smartphones and tablets are primary targets since you
can't access ROS on those and it fills a need to see what's going on the
robot without having to go back to a workstation.

It's the reason why we use [Bootstrap][5] (responsive version) as main
design for the web pages.

Supported on:

* Computer OS:
    * `Ubuntu`: *Firefox* and *Chromium*.
    * `Windows`: Both *Chrome* and *Firefox* should be fine. 
    Internet Explorer* was never tested.
    * `MacOSX`: **TO BE TESTED** but should be fine since Iphone/Ipad work
* Mobile OS:
    * `IOS`: Worked great on Safari on Iphones 3GS and 5 and Ipad 2
    * `Android`: Chrome and Firefox. Not working on some default browsers. 
    * `Windows Phone`: **WILL BE TESTED THE DAY I HAVE ACCESS TO ONE**

Please use recent version of your browsers.

##How to run##
This project needs at least `rosbridge`, `rosapi` and `roswww` to be running.
Once it's good you can access the index page from:
    
    http://{ROS_MASTER_IP}:{ROSWWW_PORT}/roswebpages/

For example, when running on localhost and without changing `roswww` port:

    http://localhost/roswebpages/

##Pages##

###Command-line tools###

* `rosnode`: List nodes and get informations. Displays subscriptions, 
publications and services provided.
* `rostopic`: List topics, subscribe, publish and get informations.
    * *list*: You can either search for topics or list them 
    (not recommended when there are too many).
    * *subscribe*: Don't display large data.
    * *publish*: Use `JSON` parsing to fill objects.
    * *information*: Display subscribers and publishers along their hosts.
* `rosparam`: List parameters names and values in a table. Sorting and
filtering is possible (which is very cool when you robot has 1300+ 
parameters).
* `rosservice`: `Working very like rostopic`, you can call services.

###TF###

* `view_frames`: Display the TF tree. Colors depends on last time a frame
was broadcasted.
* `tf_echo`: Like the command-line tool, listen to the transform between
two frames. This one need [tf2_web_republisher][10] to be running.

###Display###

* `image_view`: Watch *sensor_msgs/Image* topics. It needs [mjpeg_server][8]
to be running. ROS connection is not mandatory on this page, it is used to
provide a valid list of watchable topics.
* `map_view`: **NOT WORKING**

###Other###

* `logger`: Display ROS logs from /rosout in a table. Like with parameters,
sorting and filtering is availables. Text colors depend on levels 
(debug, info, warning, error and fatal).
* `action_client`: Designed to be a generic action client. It gives you a
list of avalaible action servers, you can then create a client, send a 
goal and watch feedback and results.

##Boilerplate##

Want to create ROS web pages for your project or robot? Check out the
`roswebpages_boilerplate`. You can copy and rename the package.
It should contain enough to get you started.

##Dependencies##

All dependencies are directly included in the project.

* [Datatables][6]: Super useful for displaying logs and parameters.
This plugin enable easy filtering, sorting and pagination of datas. There
is also a plugin to [make it work on bootstrap's tables][7].

* [RaphaelJS][8]: Cool library to draw in Javascript. We use it in the
`view_frames` page.

[1]: http://introlab.3it.usherbrooke.ca "Introlab"
[2]: http://ros.org "ROS"
[3]: http://robotwebtools.org "roslibjs"
[4]: http://github.com/RobotWebTools/roslibjs "ROS"
[5]: http://twitter.github.io/bootstrap "Bootstrap by Twitter"
[6]: http://www.datatables.net/ "Datatables"
[7]: http://datatables.net/blog/Twitter_Bootstrap_2 "Datatables & Bootstrap"
[8]: http://raphaeljs.com "Raphael JS Drawing library"
[10]: https://github.com/RobotWebTools/tf2_web_republisher "TF Web Republisher"
