<script setup lang="ts">
import { onMounted, ref, useAttrs, reactive, watch, computed } from 'vue';
import { calcPosition, setTransform } from './../helpers/utils';
import { getControlPosition, createCoreData } from './../helpers/draggableUtils';
import { Position, DomPosition } from './../helpers/types';
import interact from 'interactjs';

// varibles
const itemDom = ref();
// const marginLeft = inject('marginLeft');
// const marginTop = inject('marginTop');
// const rowHeight = inject('rowHeight');
// const useCssTransforms = inject('useCssTransforms');
// const isDraggable = inject('isDraggable');
// const isResizable = inject('isResizable');

const attrs = useAttrs();
const props = defineProps({
    colWidth: { type: Number, default: 0 },
    dragIgnoreFrom: { type: String, required: false, default: 'a, button' },
    resizeIgnoreFrom: { type: String, required: false, default: 'a, button' },
    dragAllowFrom: { type: String, required: false, default: null },
    updateCounter: { type: Number, required: true },
    colNum: { type: Number, required: true },
    isResizable: { type: Boolean, required: true },
    isDraggable: { type: Boolean, required: true },
    useCssTransforms: { type: Boolean, required: true },
    rowHeight: { type: Number, required: true },
    marginTop: { type: Number, required: true },
    marginLeft: { type: Number, required: true }
});

const state = reactive({
    inner: {
        x: attrs.x,
        y: attrs.y,
        w: attrs.w,
        h: attrs.h
    },
    previous: {
        x: attrs.x,
        y: attrs.y
    },
    last: {
        x: NaN,
        y: NaN,
        w: NaN,
        h: NaN
    },
    maxRows: Infinity,
    style: {},
    isDragging: false,
    dragging: null,
    isResizing: false,
    resizing: null,
    draggable: props.isDraggable, //why?
    resizable: props.isResizable, //why?
    resizableHandleClass: 'vue-resizable-handle'
});

let interactObj: any = null;
let dragEventSet = false; //flag for bind drag event.
let resizeEventSet = false;

const emit = defineEmits(['move', 'moved', 'drag-event', 'resize', 'resized', 'resize-event']);

// methods
// 根据xy的实际坐标折算为网格坐标
const calcXY = (top: number, left: number): { x: number; y: number } => {
    const colWidth = props.colWidth;

    let x = Math.round(left / (colWidth + props.marginLeft));
    let y = Math.round(top / (props.marginTop + props.rowHeight));

    // Capping
    x = Math.max(Math.min(x, props.colNum - state.inner.w), 0);
    y = Math.max(Math.min(y, state.maxRows - state.inner.h), 0);
    return { x, y };
};

// 传入数字类型高度 和 宽度。 计算出比例坐标
const calcWH = (height: number, width: number, autoSizeFlag = false): { w: number; h: number } => {
    const colWidth = props.colWidth; //得到每个列宽

    // width = colWidth * w - (margin * (w - 1))
    // ...
    // w = (width + margin) / (colWidth + margin)
    let w = Math.round((width + props.marginLeft) / (colWidth + props.marginLeft));
    let h = 0;
    if (!autoSizeFlag) {
        h = Math.round((height + props.marginTop) / (props.marginTop + props.rowHeight));
    } else {
        h = Math.ceil((height + props.marginTop) / (props.marginTop + props.rowHeight));
    }

    // Capping
    w = Math.max(Math.min(w, props.colNum - state.inner.x), 0);
    h = Math.max(Math.min(h, state.maxRows - state.inner.y), 0);
    return { w, h };
};

const handleDrag = (event: MouseEvent) => {
    if (attrs.static) return;
    if (state.isResizing) return;

    const position: DomPosition = getControlPosition(event);
    // Get the current drag point from the event. This is used as the offset.
    if (position === null) return; // not possible but satisfies flow
    const { x, y } = position;
    // let shouldUpdate = false;
    let newPosition = { top: 0, left: 0 };
    switch (event.type) {
        case 'dragstart': {
            // 拖动开始
            state.previous.x = state.inner.x;
            state.previous.y = state.inner.y;

            let parentRect = (event.target as HTMLElement).offsetParent.getBoundingClientRect(); // 父节点距离视口的距离
            let clientRect = (event.target as HTMLElement).getBoundingClientRect(); // 子节点距离视口的距离

            newPosition.left = clientRect.left - parentRect.left; // 获得新位置，距离外边的左侧距离
            newPosition.top = clientRect.top - parentRect.top;

            state.dragging = newPosition; //当前的新位置
            state.isDragging = true;
            break;
        }
        case 'dragend': {
            // 拖动结束
            if (!state.isDragging) return;
            let parentRect = (event.target as HTMLElement).offsetParent.getBoundingClientRect();
            let clientRect = (event.target as HTMLElement).getBoundingClientRect();

            newPosition.left = clientRect.left - parentRect.left;
            newPosition.top = clientRect.top - parentRect.top;

            state.dragging = null;
            state.isDragging = false;

            break;
        }
        case 'dragmove': {
            // 拖动移动中
            const coreEvent = createCoreData(state.last.x, state.last.y, x, y);
            newPosition.left = state.dragging.left + coreEvent.deltaX;
            newPosition.top = state.dragging.top + coreEvent.deltaY;
            state.dragging = newPosition;
            break;
        }
    }

    // Get new XY
    let pos = calcXY(newPosition.top, newPosition.left);

    state.last.x = x; // 最新的x坐标(最终的像素坐标)
    state.last.y = y;

    if (state.inner.x !== pos.x || state.inner.y !== pos.y) {
        // 向外部抛出移动的事件
        emit('move', attrs.i, pos.x, pos.y);
    }
    if (event.type === 'dragend' && (state.previous.y !== state.inner.x || state.previous.y !== state.inner.y)) {
        // 拖动结束
        emit('moved', attrs.i, pos.x, pos.y);
    }
    // console.log('drag event:', {eventType: event.type, i: attrs.i, x: pos.x, y: pos.y, h: state.inner.h, w: state.inner.w})
    emit('drag-event', { eventType: event.type, i: attrs.i, x: pos.x, y: pos.y, h: state.inner.h, w: state.inner.w });
};

const handleResize = (event: MouseEvent) => {
    if (attrs.static) return;
    const position = getControlPosition(event);
    // Get the current drag point from the event. This is used as the offset.
    if (position == null) return; // not possible but satisfies flow //不可能的情况，但是满足流程
    const { x, y } = position;

    const newSize = { width: 0, height: 0 };
    let pos;
    switch (
        event.type // 根据不同类型选择不同逻辑
    ) {
        case 'resizestart': {
            state.previous.w = state.inner.w; //保存原来的值
            state.previous.h = state.inner.h;
            // resizestart pos parms: 0 0 3 2 1 1 118.58333333333333 1
            pos = calcPosition(state.inner.x, state.inner.y, state.inner.w, state.inner.h, props.marginLeft, props.marginTop, props.colWidth, props.rowHeight); // 原来的位置大小信息
            newSize.width = pos.width;
            newSize.height = pos.height;
            state.resizing = newSize; // 大小赋值
            state.isResizing = true; //当前是否在移动
            break;
        }
        case 'resizemove': {
            // console.log(`### resize =>  ${event.type} , lastW= ${state.last.w} , lastH= ${state.last.h}, x= ${x}, y= ${y}`);
            const coreEvent = createCoreData(state.last.w, state.last.h, x, y); //x, y, 是 原来的 实际的位置信息。 lastW,lastH 是变化后的实际信息
            newSize.width = state.resizing.width + coreEvent.deltaX;
            newSize.height = state.resizing.height + coreEvent.deltaY;

            // console.log("### resize => " + event.type + ", deltaX=" + coreEvent.deltaX + ", deltaY=" + coreEvent.deltaY);
            state.resizing = newSize;
            break;
        }
        case 'resizeend': {
            // console.log("### resize end => x=" +state.inner.x + " y=" + state.inner.y + " w=" + state.inner.w + " h=" + state.inner.h)
            pos = calcPosition(state.inner.x, state.inner.y, state.inner.w, state.inner.h, props.marginLeft, props.marginTop, props.colWidth, props.rowHeight);
            newSize.width = pos.width;
            newSize.height = pos.height;
            // console.log("### resize end => " + JSON.stringify(newSize));
            state.resizing = null; // 当前置换为空
            state.isResizing = false; // 停止当前调整大小
            break;
        }
    }

    // Get new WH
    pos = calcWH(newSize.height, newSize.width); // 根据新的宽高 获得 网格坐标
    pos.w = pos.w < attrs.minw ? attrs.minw : pos.w;
    pos.w = pos.w > attrs.maxw ? attrs.maxw : pos.w;

    pos.h = pos.h < attrs.minh ? attrs.minh : pos.h;
    pos.h = pos.h > attrs.maxh ? attrs.maxh : pos.h;

    pos.h = pos.h < 1 ? 1 : pos.h;
    pos.w = pos.w < 1 ? 1 : pos.w;

    // 对于拖拽来说，图形对右下角 就是拖拽点。
    state.last.w = x; // 最终的坐标的右下角 距离 外容器的宽度。
    state.last.h = y; // 最终的坐标右下角   距离 外容器的高度。
    // console.log("当前的宽度为:", this.innerW, this.innerH, pos.w, pos.h);
    if (state.inner.w !== pos.w || state.inner.h !== pos.h) {
        //  这块没有看懂呢。
        emit('resize', attrs.i, pos.h, pos.w, newSize.height, newSize.width);
    }
    if (event.type === 'resizeend' && (state.previous.w !== state.inner.w || state.previous.h !== state.inner.h)) {
        // 如果调整结束，并且宽度发生了变化向外抛出事件。
        emit('resized', attrs.i, pos.h, pos.w, newSize.height, newSize.width);
    }

    emit('resize-event', { eventType: event.type, i: attrs.i, x: state.inner.x, y: state.inner.y, h: pos.h, w: pos.w }); // 只要拖动了，就会向外部发出事件。
};

const tryMakeDraggable = () => {
    interactObj = interactObj === null || interactObj === undefined ? interact(itemDom.value) : interactObj;
    if (state.draggable && !attrs.static) {
        const opts = {
            ignoreFrom: props.dragIgnoreFrom,
            allowFrom: props.dragAllowFrom
        };
        interactObj.draggable(opts);
        // interactObj.draggable({allowFrom: '.vue-draggable-handle'})
        if (!dragEventSet) {
            dragEventSet = true;
            interactObj.on('dragstart dragmove dragend', (event) => {
                handleDrag(event);
            });
        }
    } else {
        interactObj.draggable({
            enabled: false
        });
    }
};

const tryMakeResizable = () => {
    // 调整item大小
    interactObj = interactObj === null || interactObj === undefined ? interact(itemDom.value) : interactObj;
    if (state.resizable && !attrs.static) {
        // notice 这块有问题。 因为在 mounted 中 props.colWidth 尚未定义。
        let maximum = calcPosition(0, 0, attrs.maxw || Infinity, attrs.maxh || Infinity, props.marginLeft, props.marginTop, props.colWidth, props.rowHeight); // 控制模块能够变化的最大宽度
        let minimum = calcPosition(0, 0, attrs.minw || 1, attrs.minh || 1, props.marginLeft, props.marginTop, props.colWidth, props.rowHeight);

        // console.log('### MAX ' + JSON.stringify(maximum));
        // console.log('### MIN ' + JSON.stringify(minimum));

        const opts = {
            preserveAspectRatio: false, //保持宽高比
            edges: {
                // 配置可以拖动的边
                left: false,
                right: `.${state.resizableHandleClass}`, // Resize if pointer target matches selector  这里还可以是 handleEl https://interactjs.io/docs/api/Interactable.html
                bottom: `.${state.resizableHandleClass}`,
                top: false
            },
            ignoreFrom: props.resizeIgnoreFrom,
            restrictSize: {
                min: {
                    height: minimum.height,
                    width: minimum.width
                },
                max: {
                    height: maximum.height,
                    width: maximum.width
                }
            }
        };
        interactObj.resizable(opts);
        if (!resizeEventSet) {
            resizeEventSet = true;
            interactObj.on('resizestart resizemove resizeend', (event) => {
                handleResize(event);
            });
        }
    } else {
        interactObj.resizable({
            enabled: false
        });
    }
};

const createStyle = () => {
    if (attrs.x + attrs.w > props.colNum) {
        state.inner.x = 0;
        state.inner.w = attrs.w > props.colNum ? props.colNum : state.inner.w;
    } else {
        // 没有的话，直接赋值
        state.inner.x = attrs.x;
        state.inner.w = attrs.w;
    }
    state.inner.y = attrs.y;
    state.inner.h = attrs.h;
    let pos: Position = calcPosition(state.inner.x, state.inner.y, state.inner.w, state.inner.h, props.marginLeft, props.marginTop, props.colWidth, props.rowHeight);
    if (state.isDragging) {
        pos.top = state.dragging.top;
        pos.left = state.dragging.left;
    }
    if (state.isResizing) {
        pos.width = state.resizing.width;
        pos.height = state.resizing.height;
    }

    state.style = props.useCssTransforms ? setTransform(pos.top, pos.left, pos.width, pos.height) : setTopLeft(pos.top, pos.left, pos.width, pos.height);
};

const classObj = computed(() => {
    return {
        static: attrs.static,
        'vue-resizable': resizableAndNotStatic(),
        'disable-userselect': state.isDragging
    };
});

const resizableAndNotStatic = () => state.resizable && !attrs.static;

// initial
watch([() => props.colWidth, () => props.updateCounter], () => {
    createStyle();
});

// watch( [()=>attrs.x, ()=>attrs.y, ()=>attrs.w, ()=>attrs.h],
//     ()=>{
//         createStyle()
//     }
// )

onMounted(async () => {
    state.draggable && tryMakeDraggable();
    state.resizable && tryMakeResizable();
});
</script>

<template>
    <div ref="itemDom" :style="state.style" class="vue-grid-item" :class="classObj">
        <slot></slot>
        <span v-if="resizableAndNotStatic()" ref="handle" :class="state.resizableHandleClass"></span>
    </div>
</template>

<style scoped>
.vue-grid-item {
    transition: all 800ms ease;
    transition-property: left, top, right;
    background-color: #cccccc;
    border: 1px solid #bbbbbb;
}
.vue-grid-item.no-touch {
    -ms-touch-action: none;
    touch-action: none;
}
.vue-grid-item.cssTransforms {
    transition-property: transform;
    left: 0;
    right: auto;
}
.vue-grid-item.static {
    background: #cce;
}
.vue-grid-item.cssTransforms.render-rtl {
    left: auto;
    right: 0;
}
.vue-grid-item.resizing {
    opacity: 0.6;
    z-index: 3;
}
.vue-grid-item.vue-draggable-dragging {
    transition: none;
    z-index: 3;
}
.vue-grid-item.vue-grid-placeholder {
    background: red;
    opacity: 0.2;
    transition-duration: 100ms;
    z-index: 2;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -o-user-select: none;
    user-select: none;
}

.vue-grid-item > .vue-resizable-handle {
    position: absolute;
    width: 20px;
    height: 20px;
    bottom: 0;
    right: 0;
    background: url('data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBzdGFuZGFsb25lPSJubyI/Pg08IS0tIEdlbmVyYXRvcjogQWRvYmUgRmlyZXdvcmtzIENTNiwgRXhwb3J0IFNWRyBFeHRlbnNpb24gYnkgQWFyb24gQmVhbGwgKGh0dHA6Ly9maXJld29ya3MuYWJlYWxsLmNvbSkgLiBWZXJzaW9uOiAwLjYuMSAgLS0+DTwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DTxzdmcgaWQ9IlVudGl0bGVkLVBhZ2UlMjAxIiB2aWV3Qm94PSIwIDAgNiA2IiBzdHlsZT0iYmFja2dyb3VuZC1jb2xvcjojZmZmZmZmMDAiIHZlcnNpb249IjEuMSINCXhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkveGxpbmsiIHhtbDpzcGFjZT0icHJlc2VydmUiDQl4PSIwcHgiIHk9IjBweCIgd2lkdGg9IjZweCIgaGVpZ2h0PSI2cHgiDT4NCTxnIG9wYWNpdHk9IjAuMzAyIj4NCQk8cGF0aCBkPSJNIDYgNiBMIDAgNiBMIDAgNC4yIEwgNCA0LjIgTCA0LjIgNC4yIEwgNC4yIDAgTCA2IDAgTCA2IDYgTCA2IDYgWiIgZmlsbD0iIzAwMDAwMCIvPg0JPC9nPg08L3N2Zz4=');
    background-position: bottom right;
    padding: 0 3px 3px 0;
    background-repeat: no-repeat;
    background-origin: content-box;
    box-sizing: border-box;
    cursor: se-resize;
}

.vue-grid-item > .vue-rtl-resizable-handle {
    bottom: 0;
    left: 0;
    background: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAuMDAwMDAwMDAwMDAwMDAyIiBoZWlnaHQ9IjEwLjAwMDAwMDAwMDAwMDAwMiIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KIDwhLS0gQ3JlYXRlZCB3aXRoIE1ldGhvZCBEcmF3IC0gaHR0cDovL2dpdGh1Yi5jb20vZHVvcGl4ZWwvTWV0aG9kLURyYXcvIC0tPgogPGc+CiAgPHRpdGxlPmJhY2tncm91bmQ8L3RpdGxlPgogIDxyZWN0IGZpbGw9Im5vbmUiIGlkPSJjYW52YXNfYmFja2dyb3VuZCIgaGVpZ2h0PSIxMiIgd2lkdGg9IjEyIiB5PSItMSIgeD0iLTEiLz4KICA8ZyBkaXNwbGF5PSJub25lIiBvdmVyZmxvdz0idmlzaWJsZSIgeT0iMCIgeD0iMCIgaGVpZ2h0PSIxMDAlIiB3aWR0aD0iMTAwJSIgaWQ9ImNhbnZhc0dyaWQiPgogICA8cmVjdCBmaWxsPSJ1cmwoI2dyaWRwYXR0ZXJuKSIgc3Ryb2tlLXdpZHRoPSIwIiB5PSIwIiB4PSIwIiBoZWlnaHQ9IjEwMCUiIHdpZHRoPSIxMDAlIi8+CiAgPC9nPgogPC9nPgogPGc+CiAgPHRpdGxlPkxheWVyIDE8L3RpdGxlPgogIDxsaW5lIGNhbnZhcz0iI2ZmZmZmZiIgY2FudmFzLW9wYWNpdHk9IjEiIHN0cm9rZS1saW5lY2FwPSJ1bmRlZmluZWQiIHN0cm9rZS1saW5lam9pbj0idW5kZWZpbmVkIiBpZD0ic3ZnXzEiIHkyPSItNzAuMTc4NDA3IiB4Mj0iMTI0LjQ2NDE3NSIgeTE9Ii0zOC4zOTI3MzciIHgxPSIxNDQuODIxMjg5IiBzdHJva2Utd2lkdGg9IjEuNSIgc3Ryb2tlPSIjMDAwIiBmaWxsPSJub25lIi8+CiAgPGxpbmUgc3Ryb2tlPSIjNjY2NjY2IiBzdHJva2UtbGluZWNhcD0idW5kZWZpbmVkIiBzdHJva2UtbGluZWpvaW49InVuZGVmaW5lZCIgaWQ9InN2Z181IiB5Mj0iOS4xMDY5NTciIHgyPSIwLjk0NzI0NyIgeTE9Ii0wLjAxODEyOCIgeDE9IjAuOTQ3MjQ3IiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz4KICA8bGluZSBzdHJva2UtbGluZWNhcD0idW5kZWZpbmVkIiBzdHJva2UtbGluZWpvaW49InVuZGVmaW5lZCIgaWQ9InN2Z183IiB5Mj0iOSIgeDI9IjEwLjA3MzUyOSIgeTE9IjkiIHgxPSItMC42NTU2NCIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2U9IiM2NjY2NjYiIGZpbGw9Im5vbmUiLz4KIDwvZz4KPC9zdmc+);
    background-position: bottom left;
    padding-left: 3px;
    background-repeat: no-repeat;
    background-origin: content-box;
    cursor: sw-resize;
    right: auto;
}

.vue-grid-item.disable-userselect {
    user-select: none;
    z-index: 5;
    opacity: 0.8;
}
</style>
