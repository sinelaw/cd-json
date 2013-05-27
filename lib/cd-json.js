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
            root: {},
            path: []
        },
        prompt = require('prompt');

    me.cd = function (args) {
        var target = args[0],
            nextContext = me.context[target];

        if (target === '.') {
            return;
        }
        if (undefined === nextContext) {
            console.error(target + ': No such property');
            return;
        }

        me.context = nextContext;
        me.path.push(target);
    };

    me.cat = function (args) {
        var target = args[0],
            data = me.context[target];

        if (target === '.') {
            data = me.context;
        }
        console.log(data);
    };

    me.commandLoop = function () {
        var pathStr = me.fileName + '/' + me.path.join('/');

        prompt.start();

        prompt.get([{
            name: 'command',
            required: true,
            message: pathStr
        }], function (err, result) {
            if (err) {
                console.log('Error:', err);
                return;
            }

            commandParts = result.command.split(' ');
            commandArgs = commandParts.splice(1);
            if (commandParts[0] === 'cd') {
                me.cd(commandArgs);
            }
            if (commandParts[0] === 'cat') {
                me.cat(commandArgs);
            }
            me.commandLoop();
        });
    };

    me.main = function () {
        console.log(me.fileName);

        fs = require('fs');
        fs.readFile(me.fileName, 'utf8', function (err, data) {
            if (err) {
                console.log('Error reading file:', err);
                return;
            }
            me.root = JSON.parse(data);
            me.context = me.root;
            me.path = [];
            me.commandLoop();
        });
    };

    me.main();
}());
