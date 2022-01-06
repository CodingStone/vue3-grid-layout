<script setup lang="ts">
import GridLayout from './components/GridLayout.vue';
import { Layout } from './helpers/types';
import { reactive } from '@vue/reactivity';
let testLayout = [
    { x: 0, y: 0, w: 3, h: 2, i: '0', resizable: true, draggable: true, static: false, minY: 0, maxY: 2 },
    { x: 0, y: 0, w: 1, h: 2, i: '1-8', resizable: null, draggable: null, static: false },
    { x: 4, y: 0, w: 2, h: 5, i: '2', resizable: false, draggable: false, static: false, minX: 4, maxX: 4, minW: 2, maxW: 2, preserveAspectRatio: true },
    { x: 6, y: 0, w: 2, h: 3, i: '3', resizable: false, draggable: false, static: false },
    { x: 8, y: 0, w: 2, h: 3, i: '4', resizable: false, draggable: false, static: false },
    { x: 10, y: 0, w: 2, h: 3, i: '5', resizable: false, draggable: false, static: false },
    { x: 0, y: 5, w: 2, h: 5, i: '6', resizable: false, draggable: false, static: false },
    { x: 2, y: 5, w: 2, h: 5, i: '7', resizable: false, draggable: false, static: false },
    { x: 4, y: 5, w: 2, h: 5, i: '8', resizable: false, draggable: false, static: false },
    { x: 6, y: 3, w: 2, h: 4, i: '9', resizable: false, draggable: false, static: true },
    { x: 8, y: 4, w: 2, h: 4, i: '10', resizable: false, draggable: false, static: false },
    { x: 10, y: 4, w: 2, h: 4, i: '11', resizable: false, draggable: false, static: false, minY: 4 },
    { x: 0, y: 10, w: 2, h: 5, i: '12', resizable: false, draggable: false, static: false },
    { x: 2, y: 10, w: 2, h: 5, i: '13', resizable: false, draggable: false, static: false },
    { x: 4, y: 8, w: 2, h: 4, i: '14', resizable: false, draggable: false, static: false },
    { x: 6, y: 8, w: 2, h: 4, i: '15', resizable: false, draggable: false, static: false },
    { x: 8, y: 10, w: 2, h: 5, i: '16', resizable: false, draggable: false, static: false },
    { x: 10, y: 4, w: 2, h: 2, i: '17', resizable: false, draggable: false, static: false },
    { x: 0, y: 9, w: 2, h: 3, i: '18', resizable: false, draggable: false, static: false },
    { x: 2, y: 6, w: 2, h: 2, i: '19', resizable: false, draggable: false, static: false }
];
const layoutMountedEvent = (layout: Layout) => {};
const state = reactive({
    layout: JSON.parse(JSON.stringify(testLayout)),
    responsive: true
});
const decreaseWidth = () => {
    let width = document.getElementById('content').offsetWidth;
    width -= 20;
    document.getElementById('content').style.width = width + 'px';
};
defineExpose();
</script>

<template>
    <div id="demoLayout">
        <h1>vue3-grid-layout</h1>
        <div class="layoutJSON">
            Displayed as <code>[x, y, w, h]</code>:
            <div class="columns">
                <div v-for="item in state.layout" :key="item.i" class="layoutItem">
                    <b>{{ item.i }}</b
                    >: [{{ item.x }}, {{ item.y }}, {{ item.w }}, {{ item.h }}]
                </div>
            </div>
        </div>

        <div id="content">
            <!-- <button @click="decreaseWidth">decrease width</button>
            <input v-model="state.responsive" type="checkbox" /> Responsive -->
            <div style="height: 10px"></div>
            <grid-layout v-model:layout="state.layout" :responsive="state.responsive" @layout-mounted="layoutMountedEvent"> </grid-layout>
        </div>
    </div>
</template>

<style>
html,
body {
    height: 100%;
    width: 100%;
    margin: 0;
    padding: 0px;
}
#app {
    font-family: Avenir, Helvetica, Arial, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    color: #2c3e50;
}
#content {
    padding: 20px 0px;
}
#content button {
    margin-right: 10px;
}
#demoLayout {
    width: 80%;
    min-height: 800px;
    margin: 0 auto;
}
h1 {
    text-align: center;
    font-size: 25px;
    padding-top: 30px;
}
.layoutJSON {
    background: #ddd;
    border: 1px solid black;
    margin-top: 10px;
    padding: 10px;
}
.columns {
    -moz-columns: 120px;
    -webkit-columns: 120px;
    columns: 120px;
}
</style>
