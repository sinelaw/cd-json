#! /usr/bin/env node
/*
 * cd-json
 * https://github.com/sinelaw/cd-json
 *
 * Copyright (c) 2013 Noam Lewis
 * Licensed under the MIT license.
 */
console.log(process.argv);

var fileName = process.argv[2];
console.log(fileName);

fs = require('fs');
fs.readFile(fileName, 'utf8', function (err, data) {
    var jsonObj = JSON.parse(data);

    console.log(jsonObj);
});
