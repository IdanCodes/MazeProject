import {clamp} from "../utils/common-helpers";

export type GridPos = {
    row: number;
    col: number;
};

export function equalPos(p1: GridPos, p2: GridPos): boolean {
    return p1.row === p2.row && p1.col === p2.col;
}

export function addPos(p1: GridPos, p2: GridPos): GridPos {
    return { row: p1.row + p2.row, col: p1.col + p2.col };
}

export const ZERO_POS: GridPos = { row: 0, col: 0 };

