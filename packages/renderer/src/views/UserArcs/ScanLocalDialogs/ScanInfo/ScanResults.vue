<script setup lang="ts">
import { ref, computed } from 'vue';

const selectedArcs = ref<string[]>([]);

const props = defineProps<{
    scanState: searchUpdate | undefined
    
}>();

const emit = defineEmits(['update:selectedArcs']);

// Create a computed property to reverse the array without mutating the original
const ARCInfo = computed(() => {
  let arcInfo = []
  return props.scanState?.new_arcs?.map((arcPath) => {
    return {name:arcPath.split('/').pop(), path:arcPath};
  }) || [];

});

function selectAll() {
    selectedArcs.value = props.scanState?.new_arcs || [];
    emit('update:selectedArcs', selectedArcs.value);
}

function deselectAll() {
    selectedArcs.value = [];
    emit('update:selectedArcs', selectedArcs.value);
}

</script>

<template>
    <div style="height:100%">
        <div class="text-subtitle2">
            <span v-if="scanState?.new_arcs?.length ?? 0 > 0">Found Arcs:</span>
            <span v-else>No ARCs found yet</span>
        </div>
        <div class="flex flex-row q-gutter-sm q-py-md">
           <q-btn size="sm" color="primary" @click="selectAll">All</q-btn>
           <q-btn size="sm" color="primary" @click="deselectAll">Deselect All</q-btn>
        </div>
        <div class="scroll" style="height:75%">
            <div v-for="(info, index) in ARCInfo" :key="index" style="font-size: 0.75em;" class="flex flex-row q-px-md q-py-xs">
                <div>
                    <q-checkbox size="xs" v-model="selectedArcs" :val="info.path" @update:model-value="$emit('update:selectedArcs',selectedArcs)"/>
                </div>
                <div style="width:85%" class="">
                    <div class="text-subtitle1 text-weight-bold text-no-wrap" style="overflow: hidden;">{{info.name}}</div>
                    <div class="text-no-wrap" style="overflow: hidden;">{{info.path}}</div>
                </div>
            </div>
        </div>
    </div>
</template>