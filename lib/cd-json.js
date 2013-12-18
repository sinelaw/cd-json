#! /usr/bin/env node
/*
 * cd-json
 * https://github.com/sinelaw/cd-json
 *
 * Copyright (c) 2013 Noam Lewis
 * Licensed under the MIT license.
 */

(function () {
    var me = {
            fileName: process.argv[2],
            rootJson: {},
            path: [],
            context: null
        },
        prompt = require('prompt'),
        http = require('http'),
        fs = require('fs');

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
            context = { json: context.json[target], parent: context, path: context.path + '/' + target };
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

        exit: { helpText: 'exit cd-json', action: function () { } },

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
        prompt.start();

        prompt.get([
            {
                name: 'command',
                required: true,
                message: me.context.path,
                pattern: /[0-9a-zA-Z\/\s\-_]/
            }
        ], function (err, result) {
            var commandParts, command, commandArgs;
            if (err) {
                console.error('Error:', err);
                return;
            }

            commandParts = result.command.split(' ');
            command = commandParts[0];
            if (command === 'exit') {
                return;
            }
            commandArgs = commandParts.splice(1);
            if (me.commands.hasOwnProperty(command)) {
                me.commands[command].action.apply(null, commandArgs);
            } else {
                console.error('Unknown command: ' + command + ' - for help type "help".');
            }
            me.commandLoop();
        });
    };

    me.main = function () {
        function dataCallback(data) {
            me.rootJson = JSON.parse(data);
            me.context = { json: me.rootJson, path: me.fileName };
            me.context.parent = me.context;

            console.info(me.fileName);
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
