"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseState = parseState;
exports.serializeState = serializeState;
exports.replaceState = replaceState;
const types_1 = require("../types");
// Markers
const STATE_START = '<!-- HEIST_STATE_START -->';
const STATE_END = '<!-- HEIST_STATE_END -->';
// Parse
// parseState("<!-- HEIST_STATE_START -->{\"money\":50}<!-- HEIST_STATE_END -->")
//   -> { ...DEFAULT_STATE, money: 50 }
function parseState(body) {
    const start = body.indexOf(STATE_START);
    const end = body.indexOf(STATE_END);
    if (start === -1 || end === -1 || end <= start)
        return null;
    const json = body.slice(start + STATE_START.length, end).trim();
    try {
        const parsed = JSON.parse(json);
        return { ...types_1.DEFAULT_STATE, ...parsed };
    }
    catch {
        return null;
    }
}
// Serialize
function serializeState(state) {
    return `\n${STATE_START}\n${JSON.stringify(state)}\n${STATE_END}\n`;
}
// replaceState(body, state) -> body with the hidden JSON block overwritten
function replaceState(body, state) {
    const start = body.indexOf(STATE_START);
    const end = body.indexOf(STATE_END);
    const block = serializeState(state).trim();
    if (start === -1 || end === -1)
        return `${body}\n${block}\n`;
    return `${body.slice(0, start)}${block}${body.slice(end + STATE_END.length)}`;
}
