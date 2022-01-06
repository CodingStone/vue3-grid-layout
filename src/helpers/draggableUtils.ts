// 获得触点距离父节点 边框 距离。
export function offsetXYFromParentOf(evt: MouseEvent): { x: number; y: number } {
    //evt: 就是常规的鼠标事件

    const offsetParent = (evt.target as HTMLElement).offsetParent || document.body; // 获得父元素
    const offsetParentRect = offsetParent === document.body ? { left: 0, top: 0 } : offsetParent.getBoundingClientRect(); // 这个地方要注意 算得得是父节点 距离视图得位置。
    // 注意关于： getBoundingClientRect()： 当滚动位置发生了改变，top和left属性值就会随之立即发生变化（因此，它们的值是相对于视口的，而不是绝对的）

    //计算得到点击点 (x, y) 相对于 父亲节点的坐标
    const x = evt.clientX + offsetParent.scrollLeft - offsetParentRect.left;
    const y = evt.clientY + offsetParent.scrollTop - offsetParentRect.top;

    // console.log('offsetParent Dom:', offsetParent, offsetParentRect, offsetParentRect.left , offsetParentRect.top, x, y, evt.clientX, evt.clientY)
    /*const x = Math.round(evt.clientX + offsetParent.scrollLeft - offsetParentRect.left);
    const y = Math.round(evt.clientY + offsetParent.scrollTop - offsetParentRect.top);*/
    return { x, y };
}
// Get {x, y} positions from event.
export function getControlPosition(e: MouseEvent): { x: number; y: number } {
    return offsetXYFromParentOf(e);
}
function isNum(num: any): boolean {
    //如果是数字 并且
    return typeof num === 'number' && !isNaN(num);
}
// Create an data object exposed by <DraggableCore>'s events
// 注意注意： 前两个参数 如果在resize情况下，lastX,lastY 是 最新的宽度和高度(this.lastW, this.lastH).
// 如果在move的情况下是坐标的x和y(this.lastX, this.lastY). 并非比例是具体的位置。
export function createCoreData(lastX: number, lastY: number, x: number, y: number): { deltaX: number; deltaY: number; lastX: number; lastY: number; x: number; y: number } {
    // State changes are often (but not always!) async. We want the latest value.
    const isStart = !isNum(lastX); //判断是否刚开始

    if (isStart) {
        // 如果首次移动将增量变化为0，最新的位置赋值为原来的位置。
        // If this is our first move, use the x and y as last coords.
        return { deltaX: 0, deltaY: 0, lastX: x, lastY: y, x: x, y: y };
    } else {
        // Otherwise calculate proper values.
        return { deltaX: x - lastX, deltaY: y - lastY, lastX: lastX, lastY: lastY, x: x, y: y };
    }
}
