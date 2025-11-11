<script lang="ts" setup>
import { onMounted, onUnmounted, ref, defineProps } from 'vue';

defineProps({
  modelValue: Boolean,
});

import ScanAction from './ScanAction.vue';
import ScanInfo from './ScanInfo/ScanInfo.vue';

const emit = defineEmits(['update:modelValue']);

const selectedArcs = ref<string[]>([]);
const scanAll = ref(false);
const scanState = ref<searchUpdate>();
const isScanning = ref(false);
const isSelection = ref(false);


function upDateScanState(newState: searchUpdate) {
  scanState.value = newState;
  console.log('Scan state updated:', newState);
}

function finishScanState() {
  isScanning.value = false;
  isSelection.value = true;
  console.log('Scan finished');
}

onMounted(() => {
  // Initialize any necessary data or state
  console.log('ScanLocalDialogStart mounted');
    window.ipc.on('searchUpdate', upDateScanState);
    window.ipc.on('searchFinished', finishScanState);
});


async function startScan() {
  console.log('Starting scan for local arcs:', scanAll.value);
  isScanning.value = true;
  window.ipc.invoke('LocalArcService.scanFileSystemForArcs', scanAll.value);
}

async function addSelectedArcs() {
  console.log('Adding selected arcs');
  try {
    await window.ipc.invoke('LocalArcService.addSelectedArcs');
    isScanning.value = false;
    isSelection.value = false;
    scanState.value = undefined;
    emit('update:modelValue', false);
  } catch (e) {
    console.error('Error adding selected arcs:', e);
  }
}

function updateSelected(newSelected: string[]) {
  selectedArcs.value = newSelected;
  console.log("selected updated")
}

function scanAllChanged(value: boolean) {
  scanAll.value = value;
  console.log('Scan all changed:', value);
}

function cancel(){
  console.log('Scan cancelled');
  isScanning.value = false;
  isSelection.value = false;
  scanState.value = undefined;
  emit('update:modelValue', false);
}

</script>

<template>
  <q-dialog 
    :model-value="modelValue" 
    @update:model-value="val => $emit('update:modelValue', val)"
    persistent
    >
    <q-card class="q-pa-md" style="width: 60vw; max-width: 90vw;">
      
      <q-card-section class="text-h6">
        Scan Local Arcs
      </q-card-section>
      
      <ScanInfo 
          :scanState="scanState"
          :isSelection="isSelection"
          :isScanning="isScanning"
          :v-model:selected-arcs="selectedArcs"
          @update:selectedArcs="updateSelected"
       />

      <ScanAction
          :isScanning="isScanning"
          :isSelection="isSelection"
          :startScan="startScan"
          :addSelectedArcs="addSelectedArcs"
          :scanAll="scanAll"
          :cancel="cancel"
          @update:scanAll="val => scanAllChanged(val)"
      />
    </q-card>
  </q-dialog>
</template>
