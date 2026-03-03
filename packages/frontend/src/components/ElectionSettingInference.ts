import archive_settings from './public_archive_settings.yaml';
import { StringObject } from './util';

export const inferElectionSettings = (file_name: string): object => {
    // get meta from filename
    const name = file_name.split('.')[0];
    const [jurisdiction, date, race] = name.split('_');
    const year = date.slice(4);
    const state = Object.keys(archive_settings.states).find(state =>
        jurisdiction === state || archive_settings.states[state].includes(jurisdiction)
    )

    if(state == undefined) throw `Couldn't infer state from ${file_name}`
    const meta = {jurisdiction, date, race, year: year, state, name}

    const inferences = archive_settings.rules.find(rule => ruleMatch(rule.rule, meta));
    inferences.meta = {...meta, ...inferences.meta}

    return inferences
}

const ruleMatch = (ruleExpression: string, meta: StringObject): boolean => {
    const rules = ruleExpression.split(', ');
    return rules.every(rule => {
        const ops: [string, (key: string, value: string) => boolean][] = [
            ['<=', (key, value) => Number(meta[key]) <= Number(value)],
            ['>=', (key, value) => Number(meta[key]) >= Number(value)],
            ['=', (key, value) => meta[key] === value],
            [' contains ', (key, value) => meta[key].includes(value)],
        ];
        for(let i = 0; i < ops.length; i++){
            const [op, func] = ops[i];
            if(!rule.includes(op)) continue;
            const [key, value] = rule.split(op);
            return func(key, value);
        }
    })
}