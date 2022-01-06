import { Layout, LayoutItem, Position } from './types';

export const getStatics = (layout: Layout): Layout => layout.filter((l) => l.static);

export function sortLayoutItemsByRowCol(layout: Layout): Layout {
    return ([] as Layout).concat(layout).sort((a: LayoutItem, b: LayoutItem) => {
        if (a.y === b.y && a.x === b.x) {
            return 0;
        }
        if (a.y > b.y || (a.y === b.y && a.x > b.x)) {
            return 1;
        }
        return -1;
    });
}

// Given two layoutitems, check if they collide.  True if colliding.
export function collides(l1: LayoutItem, l2: LayoutItem): boolean {
    if (l1 === l2) return false; // same element
    if (l1.x + l1.w <= l2.x) return false; // l1 is left of l2
    if (l1.x >= l2.x + l2.w) return false; // l1 is right of l2
    if (l1.y + l1.h <= l2.y) return false; // l1 is above l2
    if (l1.y >= l2.y + l2.h) return false; // l1 is below l2
    return true; // boxes overlap
}

export function getFirstCollision(layout: Layout, layoutItem: LayoutItem): LayoutItem | void {
    for (let i = 0, len = layout.length; i < len; i++) {
        if (collides(layout[i], layoutItem)) return layout[i];
    }
}

// Compact an item in the layout.
export function compactItem(compareWith: Layout, l: LayoutItem, verticalCompact: boolean): LayoutItem {
    if (verticalCompact) {
        // Move the element up as far as it can go without colliding.
        while (l.y > 0 && !getFirstCollision(compareWith, l)) {
            // 只要不碰撞，尽量向上移动，防止坍塌
            l.y--;
        }
    }

    // Move it down, and keep moving it down if it's colliding.
    let collides;
    while ((collides = getFirstCollision(compareWith, l))) {
        //从已经放入的块中找y轴的合适位置
        l.y = collides.y + collides.h;
    }
    return l;
}

// 从layout中找出所有与layoutItem 相互碰撞的item
export function getAllCollisions(layout: Layout, layoutItem: LayoutItem): Layout {
    // console.log("当前布局进度为:", JSON.stringify(layout), layoutItem)
    return layout.filter((l) => collides(l, layoutItem));
}

// Compact layout
export function compact(layout: Layout, verticalCompact: boolean): Layout {
    // Statics go in the compareWith array right away so items flow around them.
    const compareWith = getStatics(layout);
    const sorted = sortLayoutItemsByRowCol(layout);
    // Holding for new items.
    const out = Array(layout.length);
    for (let i = 0, len = sorted.length; i < len; i++) {
        let l = sorted[i];
        // Don't move static elements
        if (!l.static) {
            l = compactItem(compareWith, l, verticalCompact);
            // Add to comparison array. We only collide with items before this one.
            // Statics are already in this array.
            compareWith.push(l);
        }
        // Add to output array to make sure they still come out in the right order.
        out[layout.indexOf(l)] = l;
        // Clear moved flag, if it exists.
        l.moved = false;
    }

    return out;
}

export function calcColWidth(containerWidth: number, cols: number, marginLeft: number): number {
    return (containerWidth - marginLeft * (cols - 1)) / cols;
}

export function calcPosition(x: number, y: number, w: number, h: number, marginLeft: number, marginTop: number, colWidth: number, rowHeight: number): Position {
    // const colWidth = this.calcColWidth(); //计算出单列的宽度
    const pos: Position = {
        left: colWidth * x + x * marginLeft, // 列宽度 ✖️ x轴坐标 + 边距处理
        top: rowHeight * y + y * marginTop, //rowHeight 是从外部获得的。 系统中直接给的。
        // 0 * Infinity === NaN, which causes problems with resize constriants;
        // Fix this if it occurs.
        // Note we do it here rather than later because Math.round(Infinity) causes deopt
        width: w === Infinity ? w : colWidth * w + Math.max(0, w - 1) * marginLeft, // 问题就出现在这里，这样这里就会出现间隙
        height: h === Infinity ? h : rowHeight * h + Math.max(0, h - 1) * marginTop
    };
    pos.left = Math.floor(pos.left);
    pos.top = Math.floor(pos.top);
    pos.width = Math.floor(pos.width);
    pos.height = Math.floor(pos.height);

    if (x !== 0) {
        pos.left = pos.left - 1;
        pos.width = pos.width + 1;
    }
    if (y !== 0) {
        pos.top = pos.top - 1;
        pos.height = pos.height + 1;
    }
    return pos;
}

export function calcContainerHeight(layout: Layout, rowHeight: number, marginTop: number): number {
    return bottom(layout) * (rowHeight + marginTop) - marginTop;
}
export function bottom(layout: Layout): number {
    let max = 0,
        bottomY;
    for (let i = 0, len = layout.length; i < len; i++) {
        bottomY = layout[i].y + layout[i].h;
        bottomY > max && (max = bottomY);
    }
    return max;
}

export function validateLayout(layout: Layout, contextName = 'Layout'): void {
    const subProps = ['x', 'y', 'w', 'h'];
    if (!Array.isArray(layout)) throw new Error(contextName + ' must be an array!');
    for (let i = 0, len = layout.length; i < len; i++) {
        const item = layout[i];
        //for (let j = 0; j < subProps.length; j++) {
        if (!Number.isFinite(item.x) || !Number.isFinite(item.y) || !Number.isFinite(item.w) || !Number.isFinite(item.w)) {
            throw new Error('VueGridLayout: ' + contextName + '[' + i + ']. [x,y,w,h] must be a number!');
        }
        //}
        if (item.static !== undefined && typeof item.static !== 'boolean') {
            throw new Error('VueGridLayout: ' + contextName + '[' + i + '].static must be a boolean!');
        }
    }
}

export function setTransform(top: number, left: number, width: number, height: number) {
    const translate = `translate3d(${left}px, ${top}px, 0)`;
    return {
        transform: translate,
        WebkitTransform: translate,
        MozTransform: translate,
        msTransform: translate,
        OTransform: translate,
        width: width + 'px',
        height: height + 'px',
        position: 'absolute'
    };
}

// Get a layout item by ID. Used so we can override later on if necessary.

export function getLayoutItem(layout: Layout, id: string): LayoutItem | undefined {
    for (let i = 0, len = layout.length; i < len; i++) {
        if (layout[i].i === id) return layout[i];
    }
}

// 移动解决冲突，一个块远离另外一个。
export function moveElementAwayFromCollision(layout: Layout, collidesWith: LayoutItem, itemToMove: LayoutItem, isUserAction: boolean) {
    const preventCollision = false; // we're already colliding
    // If there is enough space above the collision to put this element, move it there.
    // We only do this on the main collision as this can get funky in cascades and cause
    // unwanted swapping behavior.
    if (isUserAction) {
        // Make a mock item so we don't modify the item here, only modify in moveElement.
        const fakeItem: LayoutItem = {
            // 先用一个假的item. 填上移动后的信息
            x: itemToMove.x,
            y: itemToMove.y,
            w: itemToMove.w,
            h: itemToMove.h,
            i: '-1'
        };
        fakeItem.y = Math.max(collidesWith.y - itemToMove.h, 0); // 碰撞块的纵坐标 不够 坐标纵坐标修改为0
        if (!getFirstCollision(layout, fakeItem)) {
            //如果没有冲突 就 直接移动位置
            return moveElement(layout, itemToMove, undefined, fakeItem.y, preventCollision);
        }
    }

    // Previously this was optimized to move below the collision directly, but this can cause problems
    // with cascading moves, as an item may actually leapflog a collision and cause a reversal in order.
    return moveElement(layout, itemToMove, undefined, itemToMove.y + 1, preventCollision);
}

// 移动元素到指定的位置: layout是布局信息，l是根据id获得得到的位置信息，(x,y)是新的位置, isUserAction: 是否用户行为
export function moveElement(layout: Layout, l: LayoutItem, x: number | undefined, y: number, isUserAction: boolean, preventCollision = false): Layout {
    if (l.static) return layout; // 如果是静态的块，那就不要动了。

    // Short-circuit if nothing to do.
    // if (l.y === y && l.x === x) return layout;

    const oldX = l.x; //移动前的x坐标
    const oldY = l.y; //移动前的y坐标

    const movingUp = y && l.y > y; //判断移动方向 是否 👆， 判定为向上移动。
    // This is quite a bit faster than extending the object
    if (typeof x === 'number') l.x = x; // 给新的值，直接移动
    if (typeof y === 'number') l.y = y; // 直接移动
    l.moved = true; //将元素标记为移动 （将item标记为已经移动）

    // If this collides with anything, move it.
    // When doing this comparison, we have to sort the items we compare with
    // to ensure, in the case of multiple collisions, that we're getting the
    // nearest collision.
    let sorted = sortLayoutItemsByRowCol(layout); //再次进行排序，排序后最大的x,y 在最后。
    if (movingUp) sorted = sorted.reverse(); // 向上移动 就反转下数组，便于查找。
    const collisions = getAllCollisions(sorted, l); // 获得拖动后与l 发生碰撞的items

    if (preventCollision && collisions.length) {
        // 防止碰撞情况下，发生了碰撞，那直接恢复现场。
        l.x = oldX;
        l.y = oldY;
        l.moved = false;
        return layout;
    }

    // Move each item that collides away from this element.
    for (let i = 0, len = collisions.length; i < len; i++) {
        // 如果发生了碰撞，那就把碰撞的元素都挪开
        const collision = collisions[i];
        // console.log('resolving collision between', l.i, 'at', l.y, 'and', collision.i, 'at', collision.y); // 作者的这种注释就很便捷

        // Short circuit so we can't infinite loop
        if (collision.moved) continue; // 标记移动自身.
        // This makes it feel a bit more precise by waiting to swap for just a bit when moving up.
        if (l.y > collision.y && l.y - collision.y > collision.h / 4) continue; // 满足一定条件后，再进行移动(满足一定位置 进行拖动).

        // Don't move static items - we have to move *this* element away
        if (collision.static) {
            layout = moveElementAwayFromCollision(layout, collision, l, isUserAction);
        } else {
            layout = moveElementAwayFromCollision(layout, l, collision, isUserAction);
        }
    }

    return layout;
}

export function cloneLayout(layout: Layout): Layout {
    const newLayout = Array(layout.length);
    for (let i = 0, len = layout.length; i < len; i++) {
        newLayout[i] = cloneLayoutItem(layout[i]);
    }
    return newLayout;
}

// Fast path to cloning, since this is monomorphic
export function cloneLayoutItem(layoutItem: LayoutItem): LayoutItem {
    return JSON.parse(JSON.stringify(layoutItem));
}

/**
 * Given a layout, make sure all elements fit within its bounds.
 *
 * @param  {Array} layout Layout array.
 * @param  {Number} bounds Number of columns.
 */
export function correctBounds(layout: Layout, bounds: { cols: number }): Layout {
    const collidesWith = getStatics(layout);
    for (let i = 0, len = layout.length; i < len; i++) {
        const l = layout[i];
        // Overflows right
        if (l.x + l.w > bounds.cols) l.x = bounds.cols - l.w;
        // Overflows left
        if (l.x < 0) {
            l.x = 0;
            l.w = bounds.cols;
        }
        if (!l.static) collidesWith.push(l);
        else {
            // If this is static and collides with other statics, we must move it down.
            // We have to do something nicer than just letting them overlap.
            while (getFirstCollision(collidesWith, l)) {
                l.y++;
            }
        }
    }
    return layout;
}
