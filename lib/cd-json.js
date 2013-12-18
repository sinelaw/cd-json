#! /usr/bin/env node
/*
 * cd-json
 * https://github.com/sinelaw/cd-json
 *
 * Copyright (c) 2013 Noam Lewis
 * Licensed under the MIT license.
 */

(function () {
    var readline = require('readline'),
    //prompt = require('prompt'),
        http = require('http'),
        fs = require('fs'),
        me = {
            fileName: process.argv[2],
            rootJson: {},
            context: null
        },
        rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            completer: function completer(line) {
                var completions,
                    commands = [], hits, cmd,
                    lineParts = line.split(' '),
                    commandPartOfLine = lineParts[0],
                    partOfLineToMatch = line;

                completions = commands;
                for (cmd in me.commands) {
                    commands.push(cmd);
                    if (cmd === commandPartOfLine) {
                        completions = getPropertyNames(me.context.json).map(function (x) { return ' ' + x; });
                        completions.push(' .');
                        completions.push(' ..');
                        partOfLineToMatch = ' ' + lineParts.slice(1).join(' ');
                        break;
                    }
                }
                hits = completions.filter(function (c) {
                    return c.indexOf(partOfLineToMatch) == 0;
                });
                return [hits.length ? hits : completions, partOfLineToMatch];
            }
        });

    /**
     * @param obj
     * @returns {Array}
     */
    function getPropertyNames(obj) {
        var x, result = [];
        for (x in obj) {
            if (obj.hasOwnProperty(x)) {
                result.push(x);
            }
        }
        return result;
    }

    function getContextFromJson(compositeTarget) {
        var i, target,
            targets = (compositeTarget || '').split('/'),
            context = me.context;
        for (i in targets) {
            target = targets[i];
            if (target === '.' || !target) {
                continue;
            }
            if (target === '..') {
                context = context.parent;
                continue;
            }
            if (context.json.hasOwnProperty(target)) {
                context = { json: context.json[target], parent: context, path: context.path + '/' + target };
                continue;
            }
            console.error('Invalid path:', target, 'in: ./' + targets.slice(0, i).join('/'));
            return me.context;
        }
        return context;
    }

    me.commands = {
        cd: {
            helpText: 'Change current context',
            action: function (target) {
                var nextContext = getContextFromJson(target);

                if (undefined === nextContext) {
                    console.error(target + ': No such property');
                    return;
                }

                me.context = nextContext;
            }
        },

        cat: {
            helpText: 'Print json contents of object',
            action: function (target) {
                var context = getContextFromJson(target);
                console.log(context.json);
            }
        },

        ls: {
            helpText: 'List cd-able properties of object',
            action: function (target) {
                var context = getContextFromJson(target),
                    prop, obj, shallowProps;

                function getPrettyVal(val) {
                    return val.toString();
                }

                obj = context.json;

                if (typeof obj !== 'object') {
                    shallowProps = '';
                } else {
                    shallowProps = {};
                    for (prop in obj) {
                        if (obj.hasOwnProperty(prop)) {
                            shallowProps[prop] = getPrettyVal(obj[prop]);
                        }
                    }
                }

                console.log(shallowProps);
            }
        },

        exit: { helpText: 'exit cd-json', action: function () {
        } },

        help: {
            helpText: 'Show help',
            action: function () {
                var cmd;
                console.info('cd-json - navigate json as if it were a filesystem.');
                console.info('Available commands:');
                for (cmd in me.commands) {
                    console.info(cmd + '\t' + me.commands[cmd].helpText);
                }
            }
        }

    };


    me.commandLoop = function () {
        rl.setPrompt(me.context.path + ': ');
        rl.prompt();

        rl.on('line',function (line) {
            var commandParts, command, commandArgs;
            commandParts = line.trim().split(' ');
            command = commandParts[0];
            if (!(command || '').trim()) {
                rl.prompt();
                return;
            }
            if (command === 'exit') {
                rl.close();
            }
            commandArgs = commandParts.splice(1);
            if (me.commands.hasOwnProperty(command)) {
                me.commands[command].action.apply(null, commandArgs);
            } else {
                console.error('Unknown command: ' + command + ' - for help type "help".');
            }
            rl.prompt();
        }).on('close', function () {
                console.info('Exiting...');
            });
    };

    me.main = function () {
        function dataCallback(data) {
            me.rootJson = JSON.parse(data);
            me.context = { json: me.rootJson, path: me.fileName };
            me.context.parent = me.context;

            me.commands.ls.action('.');
            me.commandLoop();
        }

        function errorCallback(error) {
            console.error('Error reading data:', error);
        }

        if (!me.fileName) {
            console.error('Usage: cd-json filename.json');
            return;
        }
        if (fs.existsSync(me.fileName)) {
            console.log('cd-json: opening local file ' + me.fileName);
            fs.readFile(me.fileName, 'utf8', function (err, data) {
                if (err) {
                    errorCallback(err);
                    return;
                }
                dataCallback(data);
            });
        } else {
            console.info('cd-json: getting http resource ' + me.fileName);
            http.get(me.fileName, function (res) {
                var pageData = '';
                res.on('data', function (chunk) {
                    pageData += chunk;
                });

                res.on('end', function () {
                    dataCallback(pageData);
                });
            })
                .on('error', errorCallback);
        }
    };

    me.main();
}());
