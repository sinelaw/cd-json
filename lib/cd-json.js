#! /usr/bin/env node
/*
 * cd-json
 * https://github.com/sinelaw/cd-json
 *
 * Copyright (c) 2013 Noam Lewis
 * Licensed under the MIT license.
 */

(function () {
    'use strict';


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
                var completions, targetContext,
                    hits, cmd, relativePath,
                    lineParts = line.split(' '),
                    commandPartOfLine = lineParts[0],
                    pathString = (lineParts[1] || ''),
                    partOfLineToMatch = line;


                completions = getPropertyNames(me.commands).map(prefixSuffixFunc('', ' '));
                hits = getHits(completions, commandPartOfLine);
                if ((hits.length === 1) && (hits[0].length <= line.length)) {
                    partOfLineToMatch = pathString;
                    targetContext = getContextFromJson(pathString, true);
                    relativePath = targetContext.context.path.substr(me.context.path.length);
                    if (relativePath.length > 0) {
                        // change '/path/to' into 'path/to/'
                        relativePath = relativePath.substr(1) + '/';
                    }
                    if (typeof targetContext.context.json !== 'object') {
                        completions = [partOfLineToMatch];
                    } else {
                        completions = getPropertyNames(targetContext.context.json).map(prefixSuffixFunc(relativePath));
                    }
                }
                hits = getHits(completions, partOfLineToMatch);
                return [hits.length ? hits : completions, partOfLineToMatch];
            }
        });

    /**
     * @param {Array} completions
     * @param {string} partOfLineToMatch
     * @returns {Array}
     */
    function getHits(completions, partOfLineToMatch) {
        return completions.filter(function (c) {
            return c.indexOf(partOfLineToMatch) === 0;
        });
    }

    /**
     *
     * @param {string} prefix
     * @param {string} suffix
     * @returns {Function}
     */
    function prefixSuffixFunc(prefix, suffix) {
        return function (x) {
            return (prefix || '') + x + (suffix || '');
        }
    }

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

    function getContextFromJson(compositeTarget, useBestMatch) {
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
            if (useBestMatch) {
                return { found: false, context: context };
            }
            console.error('Invalid path:', target, 'in: ./' + targets.slice(0, i).join('/'));
            return { found: false, context: me.context };
        }
        return { found: true, context: context };
    }

    function argumentsOrDefault(args, defaultValue) {
        return (args.length > 0 ? args : [defaultValue]);
    }

    me.commands = {
        cd: {
            helpText: 'Change current context',
            action: function (target) {
                var nextContext = getContextFromJson(target).context;

                if (undefined === nextContext) {
                    console.error(target + ': No such property');
                    return;
                }

                me.context = nextContext;
            }
        },

        cat: {
            helpText: 'Print json contents of object',
            action: function () {
                var target, i, targets = argumentsOrDefault(arguments, '.');
                for (i in targets) {
                    target = targets[i];
                    console.log(getContextFromJson(target).context.json);
                }
            }
        },

        ls: {
            helpText: 'List cd-able properties of object',
            action: function () {
                var i, target, targets = argumentsOrDefault(arguments, '.'),
                    context, prop, obj, shallowProps;

                function getPrettyVal(val) {
                    return val.toString();
                }

                for (i in targets) {
                    target = targets[i];
                    context = getContextFromJson(target).context;

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

                    console.log(target + ':', shallowProps);
                }
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


    me.registerCommandHandler = function () {

        rl.on('line',function (line) {
            var commandParts, command, commandArgs;
            commandParts = line.trim().split(' ');
            command = commandParts[0];
            if (!(command || '').trim()) {
                me.commandLoop();
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
            me.commandLoop();
        }).on('close', function () {
                console.info('Exiting...');
                process.exit(0);
            });
    };

    me.commandLoop = function () {
        var basePath = me.fileName,
            subPath = me.context.path.slice(basePath.length),
            ansiCodesLen = 0,
            message;

        function appendAnsi(ansiStr) {
            ansiCodesLen += ansiStr.length;
            return ansiStr;
        }

        message = appendAnsi('\u001b[1;30;40m')
            + basePath
            + appendAnsi('\u001b[0m')
            + subPath + ' # ';

        rl.setPrompt(message, message.length - ansiCodesLen);
        rl.prompt();

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
            rl.close();
        }

        me.registerCommandHandler();

        if (!me.fileName) {
            console.error('Usage: cd-json <filename or url of json data>');
            rl.close();
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
