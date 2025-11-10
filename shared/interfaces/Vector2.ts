export interface Vector2 {
    x: number;
    y: number;
}

export function calcMagnitude(vec: Vector2): number {
    return Math.sqrt(vec.x ** 2 + vec.y ** 2);
}

export const ZERO_VEC: Vector2 = { x: 0, y: 0 };

export function calcNormalized(vec: Vector2): Vector2 {
    const mag = calcMagnitude(vec);
    return mag == 0
        ? ZERO_VEC
        : {
            x: vec.x / mag,
            y: vec.y / mag,
        };
}

export function scaleVec(vec: Vector2, scale: number): Vector2 {
    return {
        x: vec.x * scale,
        y: vec.y * scale,
    };
}

export function equalVec(v1: Vector2, v2: Vector2 ) {
    return v1.x === v2.x && v1.y === v2.y;
}