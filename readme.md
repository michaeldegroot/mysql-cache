# What it does

###### Replaces your console object with a more stylish and practical way of displaying notices,warn,info,debug,log and errors. It automagically shows you the line number and filename where the command was executed, along with a timestamp. There is also the ability to catch uncaughtExceptions, disable the output colors, and log to file. You can also setup filters if you want the console or log to not show a certain debug message type. ######


# How does it look?

![console-debug.gif](https://bitbucket.org/repo/a7AMxL/images/462483730-console-debug.gif)

    console.log("I am a log!");
    console.warn("I am a warn!");
    console.error("I am a error!");
    console.debug("I am a debug!");
    console.info("I am a info!");
![Example1](http://s21.postimg.org/8sgu1k0dj/image.png)

    Idonotexists();
![Example2](http://s21.postimg.org/7rglcfjdz/image.png)


#  How do I use it?

## 1. Start by installing the package:
    npm install console-debug

## 2. Put this in your nodejs server file:

    var Debug = require('console-debug');
    
	var console = new Debug({
		uncaughtExceptionCatch: false, // Do we want to catch uncaughtExceptions?
		consoleFilter: [], // Filter these console output types, Examples: 'LOG', 'WARN', 'ERROR', 'DEBUG', 'INFO'
		logToFile: true, // if true, will put console output in a log file folder called 'logs'
		logFilter: ['LOG','DEBUG','INFO'], // Examples: Filter these types to not log to file, Examples: 'LOG', 'WARN', 'ERROR', 'DEBUG', 'INFO'
		colors: true // do we want pretty pony colors in our console output?
	}); 




	
## 3. Now you can do stuff like:

    console.log("I am a log!");
    console.warn("I am a warn!");
    console.error("I am a error!");
    console.debug("I am a debug!");
    console.info("I am a info!");
	
	// can also display objects
	obj = {
		test1: [1,2,3,4],
		test3: ["ohai","there"],
		test4: true
	};
    console.log(obj);
	
	
## 4. (optional) Passing the console object to other modules:
    
    require('./myfile')(console); // myfile local scope will have now console object overwritten.

# Contact
    You can contact me at specamps@gmail.com