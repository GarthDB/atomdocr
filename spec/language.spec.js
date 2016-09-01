"use babel"

import JsParser from '../lib/languages/javascript';
import CoffeeParser from '../lib/languages/coffee';

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

// Hack to let us call parsers by filename
let parsers = {
    JsParser,
    CoffeeParser
};

var filepath = path.resolve(path.join(__dirname, 'dataset/languages'));
var files = fs.readdirSync(filepath);

for (let name of files) {
    let file_name = "Parser_" + name.split('.')[0];
    describe(file_name, () => {
        let parser;
        let dataset = yaml.load(fs.readFileSync(path.join(filepath, name), 'utf8'));
        let parser_name = dataset['name'];
        delete dataset['name'];

        beforeEach(() => {
            return atom.packages.activatePackage('docblockr')
                .then(() => {
                    parser = new parsers[parser_name](atom.config.get('docblockr'));
                });
        });

        for(let key in dataset) {
            describe(key, () => {
                dataset[key].forEach((data) => {
                    it(data[0], () => {
                        let out;
                        if (Array.isArray(data[1])) {
                            out = parser[key].apply(parser, data[1]);
                        } else {
                            out = parser[key](data[1]);
                        }
                        expect(out).to.deep.equal(data[2]);
                    });
                });
            });
        }
    });
}
