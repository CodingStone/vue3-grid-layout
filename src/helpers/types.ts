// // 验证布局正确性
type LayoutItem = {
    i: string;
    x: number;
    y: number;
    h: number;
    w: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
    static?: boolean;
    moved?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
};
type Layout = Array<LayoutItem>;

type Position = {
    left: number;
    top: number;
    width: number;
    height: number;
};

type DomPosition = {
    x: number;
    y: number;
};

type EventType = {
    eventName: string;
    id: string;
    x: number;
    y: number;
    h: number;
    w: number;
};

type Breakpoints = {
    lg?: number;
    md?: number;
    sm?: number;
    xs?: number;
    xxs?: number;
};
export { LayoutItem, Layout, Position, DomPosition, EventType, Breakpoints };
