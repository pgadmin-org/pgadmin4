### Change log

**10.11.2015**

**Summary**:

- indexDev.html, bower.json, package.json and Gruntfile.js updated for: 
    - lodash dependency (is included in wcDocker.js and wcDocker.min.js)
    - Code/tests added, only with a basic test


#### indexDev.html
- added lodash package in require config
- added lodash shim in require config

#### bower.json

- added lodash - AMD - compat dependency
- added dojo dependency (required by test-units)


#### package.json
 
- updated intern-testing dependency to 3.0

#### Compiler/GruntFile.js

- added lodash to require-js build tasks (adds 40kb to the final build)


#### Code/tests

- added files and folders to run unit-tests with Sitepen's 'intern' unit-testing framework

See Code/tests/intern/intern.js



**NEW:** Testing


wcDocker uses [intern](https://theintern.github.io/) for unit-testing.

In order to run the unit-tests in your browser, open [this](http://localhosts/wcDocker/Compiler/node_modules/intern/client.html?config=../Code/tests/intern/intern) (adjust your url!)

This will load a config from Code/tests/intern/intern.js which will load unit-tests
from See Code/tests/basics/*

There is currently only a dummy unit. 
 
Todos: 

- add/update grunt tasks for server-side unit - tests via Source-Labs.

- add/update grunt tasks for local command line unit - tests via Source-Labs-Local.



###Status

#### Converting to AMD/DCL/Require-JS compatible classes/modules: done
#### Converting comments jsDoc module tags: 99% done
#### Creating grunt tasks to compile themes and library: done
#### Creating grunt tasks for unit-testing (at least the base): missing

#### Open issues:


- index.html: for some reason ./demo.js is evaluated before ./Build/wcDocker.js

I had to put a delay in demo.js. However, the very same demo exists also as AMD version in Code/samples/demoAMD.js
which is used by indexDev.html



###General changes for developers

#### Require-JS - Setup & Configuration

Remarks, please run bower install after checkout!

1. Setup, include the Require.JS

    
        <!-- include Require-JS --->
        <script src="bower_components/requirejs/require.js"></script>
    

2. Configure Require.JS

    
        <script type="text/javascript">    
            require.config({
                baseUrl: "./bower_components",
                packages: [
                    {
                        name: 'dcl',
                        location: './dcl'   //points to bower_components/dcl
                    },
                    {
                        name: 'wcDocker',
                        location: '../Code'
                    }
                ]
            });
        </script>
        

3. Pull in modules

        
        <script type="text/javascript">    
            //setup demo module
            require.config({
                config: {    
                    'wcDocker/samples/demoAMD':{
                        //  enable/disable theme builder
                        themeBuilder: true,
                        //  enable/disable tutorials
                        tutorials:false
                    }
                }
            });            
            try {                
                //require demo (your main)
                require([
                    "wcDocker/samples/demoAMD"
                ], function (demo) {
                    //nada, all done in demo
                });
            }catch(e){
                console.error('error loading demo ' + e , e);
                console.dir(e.stack);
            }
        </script>

#### DCL 

Since we use now DCL for OOP, all classes have been wrapped 
into DCL classes. Furthermore, a base class ./Code/base has been
added to all wcDocker classes
 
Please follow for more details how to use dcl here[here](www.dcljs.org/docs/cheatsheet)


 
#### Build

Everything has been defined as grunt-tasks in Gruntfile.js
 
#### build code & themes:
 
    #grunt build

#### Remarks: 

- this will compile a minified version of the wcDocker lib, including
everything automatically what has been put into Compiler/wcDockerLibrary.js

- The build contains a very small version of require.js called "Almond" which
has been also developed by require.js


### Low-Level Changes

#### Constants & Enumerations: 

Since AMD/require-js doesn't provide save cyclic dependencies:
 
- constants and enumerations have been moved to Code/types.js
- in some places, instanceOf have been replaced with Base::instanceOf

Another issue was that jsDoc doesn't enumerate constants and enumerations
listed in Code/types.js within the wcDocker class documentation. I duplicated
them in wcDocker. This is will be solved.


### Overriding wcDocker base classes

wcDocker sub classes can be created as any other AMD module.
 
- create a sub class of wcPanel, ie: as file myPanelClass.js
  
          
          define([
              "dcl/dcl",
              "wcDocker/panel"
          ], function (dcl,wcPanel) {      
              return dcl(wcPanel,{
                  /**
                   * Override wcPanel#__init
                   */
                  __init: dcl.superCall(function(sup){
                      return function(){
                          //call super
                          return sup && sup.apply(this, arguments);
                      };
                  })
              });
          });
 
 
- now pass the new version of wcPanel in the docker options: 

    
        define([
            "dcl/dcl",
            "wcDocker/docker",
            "app/myPanelClass"
        ], function (dcl,wcDocker,myPanelClass){
            var myDocker = new wcDocker('.dockerContainer', {
                    allowDrawers: true,
                    responseRate: 10,
                    wcPanelClass:myPanelClass
            });
        }
 

- or create your panel sub class directly:

        
        define([
            "dcl/dcl",
            "wcDocker/docker",
            "wcDocker/panel"
        ], function (dcl,wcDocker,wcPanel){
            var myDocker = new wcDocker('.dockerContainer', {
                    allowDrawers: true,
                    responseRate: 10,
                    wcPanelClass:dcl(wcPanel,{
                        //your overrides and implementation
                    })
            });
        }