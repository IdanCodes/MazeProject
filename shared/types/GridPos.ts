export type GridPos = {
    row: number;
    col: number;
};

export function equalPos(p1: GridPos, p2: GridPos): boolean {
    return p1.row === p2.row && p1.col === p2.col;
}