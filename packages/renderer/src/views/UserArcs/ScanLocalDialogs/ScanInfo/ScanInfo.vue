<script setup lang="ts">
import ScanMessages from './ScanMessages.vue';
import SearchInfoTable from './SearchInfoTable.vue';
import ScanResults from './ScanResults.vue';
import { ref } from 'vue';

const selectedArcs = ref<string[]>([]);
const emit = defineEmits(['update:selectedArcs']);

const props = defineProps<{
    scanState: searchUpdate | undefined
    isScanning: boolean
    isSelection: boolean
}>();


</script>

<template>
    <q-card-section style="height:50vh;" class="">
        <SearchInfoTable :scanState="scanState"/>
        <div class="flex flex-row q-gutter-md" style="height: 90%">
            <ScanResults 
                v-if="isSelection" 
                :scanState="scanState" 
                style="width:47%;height:100%"
                v-model:selectedArcs="selectedArcs"
                @update:selectedArcs="$emit('update:selectedArcs', $event)"
                />
            
            <ScanMessages :scanState="scanState" style="width:47%;height:100%"/>
            
            <div v-if="isScanning" style="width:47%; height:100%">
                <q-spinner
                    color="primary" 
                    class="middle"
                    style="width: 50%; height: 50%; margin: auto; display: block;"
                />
            </div>
        </div>
    </q-card-section>
</template>