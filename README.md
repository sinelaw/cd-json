# cd-json

Pretend your json is a filesystem.

Example:

    $ cd-json package.json
    cd-json: opening local file package.json
    package.json # ls
    .:
     name   description     version homepage        author  repository      bugs    licenses        main    engines scripts devDependencies keywords        preferGlobal    bin
    package.json # cd devDependencies/grunt
    package.json/devDependencies/grunt # cat .
    ~0.3.17
    package.json/devDependencies/grunt # cd ../../engines
    package.json/engines # ls
    .:
     node
    package.json/engines # cat node
    >= 0.6.0
    package.json/engines # cat .
    { node: '>= 0.6.0' }
    package.json/engines #

### What's it for?

I don't know yet. If you have ideas, drop me a line.

## Getting Started

Install the module with: `npm install cd-json`

Then run it

> cd-json my_json_file.json

You can also use a url:

> cd-json http://example.com/something.json

## Commands

Use `help` to find out what commands are available.

Available commands:

    cd      Change current context
    cat     Print json contents of object
    ls      List cd-able properties of object
    exit    exit cd-json
    help    Show help


## License
Copyright (c) 2013 Noam Lewis  
Licensed under the MIT license.
