/* eslint-disable @typescript-eslint/no-require-imports -- standalone CJS script, run directly with `node` */
const PluralityResults = require('./PluralityResults')

const candidates = ['Alice','Bob','Carol','Dave']

const votes = [
    [0,0,0,1],
    [1,0,0,0],
    [1,0,0,0],
    [0,0,0,1],
    [0,0,0,1],
]


PluralityResults(candidates,votes)