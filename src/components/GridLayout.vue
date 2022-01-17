<script setup lang="ts">
import { nextTick, onMounted, reactive, ref, watch, provide, onUnmounted } from 'vue';
import { Layout, EventType } from './../helpers/types';
import GridItem from './GridItem.vue';
import { compact, getLayoutItem, moveElement, getAllCollisions } from './../helpers/utils';
// import { addWindowEventListener, removeWindowEventListener } from '../helpers/DOM';
import { validateLayout, calcColWidth, calcContainerHeight, cloneLayout } from '../helpers/utils';
import { getBreakpointFromWidth, getColsFromBreakpoint, findOrGenerateResponsiveLayout } from './../helpers/responsiveUtils';

const props = defineProps({
    layout: {
        type: Array,
        required: true
    },
    isDraggable: {
        type: Boolean,
        default: true
    },
    isResizable: {
        type: Boolean,
        default: true
    },
    colNum: {
        type: Number,
        default: 12
    },
    marginLeft: {
        type: Number,
        default: 1
    },
    marginTop: {
        type: Number,
        default: 1
    },
    rowHeight: {
        type: Number,
        default: 45
    },
    useCssTransforms: {
        type: Boolean,
        default: true
    },
    verticalCompact: {
        type: Boolean,
        default: true
    },
    preventCollision: {
        // 防止碰撞(源码中是false) 如果true 发生碰撞后将会直接恢复，原来的布局。 true的情况下 简单粗暴 回退。false的情况下会尝试着去解冲突
        type: Boolean,
        default: false
    },
    responsive: {
        // 功能是说，根据不同的屏幕适配不同的宽度
        // 这个变量没有使用watch方法。。。。。。 先看透逻辑
        type: Boolean,
        default: false
    },
    breakpoints: {
        type: Object,
        default: () => ({ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 })
    },
    cols: {
        type: Object,
        default: () => ({ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 })
    }
});

const emit = defineEmits(['layout-mounted', 'layout-updated', 'breakpoint-changed', 'update:layout']);
const gridLayout = ref(null);
const mergedStyle = ref({ height: 0 });

const state = reactive({
    originalLayout: props.layout as Layout, //store for original layout. 这个变量不需要reactive ， 不知道会不会和下面的冲突。
    width: 0 as number,
    colWidth: 0 as number,
    layout: props.layout as Layout,
    isDragging: false,
    placeholder: {
        x: 0,
        y: 0,
        w: 0,
        h: 0,
        i: -1
    },
    layouts: {}, // array to store all layouts from different breakpoints.   需要reactive吗?
    lastBreakpoint: null, // store last active breakpoint,  同样的这个需要reactive吗
    updateCounter: 0
});
// provide('colNum', props.colNum);
provide('marginLeft', props.marginLeft);
provide('marginTop', props.marginTop);
provide('rowHeight', props.rowHeight);
provide('useCssTransforms', props.useCssTransforms);
provide('isDraggable', props.isDraggable);
provide('isResizable', props.isResizable);
// initial
validateLayout(state.layout);
compact(state.layout, props.verticalCompact);

// methods
const getLayoutWidth = () => gridLayout.value !== null && gridLayout.value !== undefined && (state.width = gridLayout.value.offsetWidth);

const reLayout = () => {
    // console.log("宽度为:", newValue)
    state.colWidth = calcColWidth(state.width, props.colNum, props.marginLeft);
    updateHeight();
    // console.log("单行宽度为:", state.colWidth);
    // const containerHeight = calcContainerHeight(props.layout, props.rowHeight, props.marginTop);
    // // console.log("容器高度为:", containerHeight)
    // mergedStyle.value = {
    //     height: `${containerHeight}px`,
    //     backgroundImage: `repeating-linear-gradient(90deg,transparent 0px, transparent ${state.colWidth}px, #eee ${state.colWidth}px, #eee ${
    //         state.colWidth + props.marginLeft
    //     }px, transparent ${state.colWidth + props.marginLeft}px),
    //  repeating-linear-gradient(180deg, transparent 0px, transparent ${props.rowHeight}px, #eee ${props.rowHeight + props.marginTop}px,transparent ${
    //         props.rowHeight + props.marginTop
    //     }px)`
    // };
};

const updateHeight = () => {
    const containerHeight = calcContainerHeight(state.layout, props.rowHeight, props.marginTop);
    // console.log("容器高度为:", containerHeight)
    mergedStyle.value = {
        height: `${containerHeight}px`,
        backgroundImage: `repeating-linear-gradient(90deg,transparent 0px, transparent ${state.colWidth}px, #eee ${state.colWidth}px, #eee ${
            state.colWidth + props.marginLeft
        }px, transparent ${state.colWidth + props.marginLeft}px),
      repeating-linear-gradient(180deg, transparent 0px, transparent ${props.rowHeight}px, #eee ${props.rowHeight + props.marginTop}px,transparent ${
            props.rowHeight + props.marginTop
        }px)`
    };
};
const dragEvent = async (event: EventType) => {
    const { eventType: eventName, i: id, x, y, h, w } = event;
    let l = getLayoutItem(state.layout, id);
    //GetLayoutItem sometimes returns null object
    if (l === undefined || l === null) {
        l = { x: 0, y: 0 };
    }

    if (eventName === 'dragmove' || eventName === 'dragstart') {
        // 启动影子DOM
        state.placeholder.i = id;
        state.placeholder.x = l.x;
        state.placeholder.y = l.y;
        state.placeholder.w = w;
        state.placeholder.h = h;
        await nextTick();
        state.isDragging = true;
    } else {
        await nextTick();
        state.isDragging = false; //本意是隐藏
    }

    // Move the element to the dragged location.
    moveElement(state.layout, l, x, y, true, props.preventCollision); // l 是根据拖动的id获得的item信息，(x,y)是移动后新的位置。true:表示用户触发, preventCollision 阻止冲突
    // console.log('元素移动后的元素为:', JSON.stringify(state.layout))
    state.layout = compact(state.layout, props.verticalCompact); // 这块其实不赋值也是可以的，因为是引用的问题。
    // needed because vue can't detect changes on array element properties
    // this.eventBus.emit("compact");  // 通知子层进行刷新 调用createStyle
    updateHeight(); // 并非宽度调整导致的，这里不计算宽度。
    state.updateCounter++;

    if (eventName === 'dragend') emit('layout-updated', state.layout);
};

// finds or generates new layouts for set breakpoints
const responsiveGridLayout = () => {
    const newBreakpoint = getBreakpointFromWidth(props.breakpoints, state.width);
    const newCols = getColsFromBreakpoint(newBreakpoint, props.cols); // 这块需要做缓存处理。。。。。
    console.log('the newBreakpoint:', newCols);
    // save actual layout in layouts, Cache.
    if (state.lastBreakpoint != null && !state.layouts[state.lastBreakpoint]) {
        state.layouts[state.lastBreakpoint] = cloneLayout(state.layout);
    }
    // Find or generate a new layout.
    let layout = findOrGenerateResponsiveLayout(state.originalLayout, state.layouts, props.breakpoints, newBreakpoint, state.lastBreakpoint, newCols, props.verticalCompact);
    console.log('new Layout:', layout);
    // Store the new layout.
    state.layouts[newBreakpoint] = layout;
    if (state.lastBreakpoint !== newBreakpoint) {
        emit('breakpoint-changed', newBreakpoint, layout); // 表明新的
    }
    // new prop sync
    emit('update:layout', layout);
    state.lastBreakpoint = newBreakpoint;

    const newColsTmp = getColsFromBreakpoint(newBreakpoint, props.cols);
    state.colNum = newColsTmp;
    reLayout();
    // this.eventBus.emit("setColNum", getColsFromBreakpoint(newBreakpoint, this.cols)); // 这个地方需要梳理
};

const resizeEvent = async (event: EventType) => {
    // 当布局完成后，会触发改变大小的事件， 从内部向外部透出事件，这里进行碰撞检测。
    // emit("resize-event", { eventType: event.type, i: attrs.i, x: state.inner.x, y: state.inner.y, h: pos.h, w: pos.w }); // 只要拖动了，就会向外部发出事件。
    const { eventType: eventName, i: id, x, y, h, w } = event;
    // console.log("resizeEvent:", eventName, id, x, y, h, w)
    let l = getLayoutItem(state.layout, id); // 根据id 从布局中获得item信息，可能为空，因为有些时候就是为了rerender。
    //GetLayoutItem sometimes return null object
    if (l === undefined || l === null) {
        l = { h: 0, w: 0 };
    }
    let hasCollisions;
    if (props.preventCollision) {
        // 没看懂 这个的意义是什么。
        console.log('combine:', { ...l, w, h });
        // 如果第二个位置参数没有传入，也就是udnefined, 那么就会永远的碰撞。
        const collisions = getAllCollisions(state.layout, { ...l, w, h }).filter(
            //l是根据id找到的，w，h会因为拖动而改变大小.  如果只是调整大小这块影响里面的布局是{h:undefined, w:undefined}
            (layoutItem) => layoutItem.i !== l.i // 需要将自身去掉
        );
        hasCollisions = collisions.length > 0; // collisions 在layout中除了自身外的事故者

        // If we're colliding, we need adjust the placeholder.
        if (hasCollisions) {
            // 有碰撞的元素放生
            // adjust w && h to maximum allowed space
            let leastX = Infinity,
                leastY = Infinity; // 找到与碰撞者大的  最近肇事者。
            // 调整
            collisions.forEach((layoutItem) => {
                // 碰撞的元素列表
                if (layoutItem.x > l.x)
                    //l 是被撞 的肇事者。
                    leastX = Math.min(leastX, layoutItem.x); // 从肇事者中找到比l.x 大的最小肇事者。
                if (layoutItem.y > l.y) leastY = Math.min(leastY, layoutItem.y); // 从肇事者中找到比l.y 大的最小肇事者。
            });

            if (Number.isFinite(leastX)) l.w = leastX - l.x; //调整了 碰撞元素的宽度
            if (Number.isFinite(leastY)) l.h = leastY - l.y; //调整了 碰撞元素的高度
        }
    }

    if (!hasCollisions) {
        // 将调整后的宽度和高度给当前元素， 注意这个地方的特别之处是l 是个引用，如果修改了他的宽度其实就直接修改了实际的宽度。
        // Set new width and height.
        l.w = w;
        l.h = h;
    }

    if (eventName === 'resizestart' || eventName === 'resizemove') {
        // 将shadow开启
        state.placeholder.i = id;
        state.placeholder.x = x;
        state.placeholder.y = y;
        state.placeholder.w = l.w;
        state.placeholder.h = l.h;
        await nextTick();
        state.isDragging = true; //for shadow

        // this.eventBus.emit("updateWidth", this.width); // 向item更新数据，修改宽度， 没太看懂对与内部item的含义是什么
    } else {
        await nextTick();
        state.isDragging = false;
    }

    // if (props.responsive) { // 这块暂时是有问题的。
    //     responsiveGridLayout(); // 这个有什么含义呢
    // }

    compact(state.layout, props.verticalCompact);

    // this.eventBus.emit("compact");
    // this.updateHeight();
    state.updateCounter++;
    updateHeight();

    if (eventName === 'resizeend') emit('layout-updated', state.layout);
};

// watch
watch(
    () => state.width,
    (newValue) => {
        reLayout();
    }
);
onUnmounted(async () => {
    // window.onresize = null;
});
//hooks
onMounted(async () => {
    emit('layout-mounted', state.layout);
    getLayoutWidth();
    // let bAntiShike = false;
    // window.onresize = () => {
    //     if (!bAntiShike) {
    //         bAntiShike = true;
    //         setTimeout(() => {
    //             updateHeight();
    //             reLayout();
    //             state.updateCounter++;
    //             bAntiShike = false;
    //         }, 300);
    //     }
    // };
});
</script>

<template>
    <div ref="gridLayout" class="vue-grid-layout" :style="mergedStyle">
        <grid-item
            v-for="item in state.layout"
            :key="item.i"
            :col-width="state.colWidth"
            :update-counter="state.updateCounter"
            :col-num="colNum"
            :is-draggable="isDraggable"
            :is-resizable="isResizable"
            :use-css-transforms="useCssTransforms"
            :row-height="rowHeight"
            :margin-top="marginTop"
            :margin-left="marginLeft"
            :static="item.static"
            :x="item.x"
            :y="item.y"
            :w="item.w"
            :h="item.h"
            :i="item.i"
            :minw="item.minW || 1"
            :maxw="item.maxW || Infinity"
            :minh="item.minH || 1"
            :maxh="item.maxH || Infinity"
            :miny="item.minY"
            :maxy="item.maxY"
            @drag-event="dragEvent"
            @resize-event="resizeEvent"
        >
            {{ item.i }}
        </grid-item>

        <grid-item
            v-show="state.isDragging"
            class="vue-grid-item vue-grid-placeholder"
            :col-width="state.colWidth"
            :col-num="colNum"
            :is-draggable="false"
            :is-resizable="false"
            :use-css-transforms="useCssTransforms"
            :row-height="rowHeight"
            :margin-top="marginTop"
            :margin-left="marginLeft"
            :update-counter="state.updateCounter"
            :x="state.placeholder.x"
            :y="state.placeholder.y"
            :w="state.placeholder.w"
            :h="state.placeholder.h"
            :i="state.placeholder.i"
            :min-w="1"
            :max-w="Infinity"
            :min-h="1"
            :max-h="Infinity"
        >
        </grid-item>
    </div>
</template>

<style scoped>
.vue-grid-layout {
    position: relative;
    transition: height 200ms ease;
    border: 1px green dotted;
}
.vue-grid-item.vue-grid-placeholder {
    background: red;
    opacity: 0.2;
    transition-duration: 100ms;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -o-user-select: none;
    user-select: none;
}
</style>
