<script setup lang="ts">

const props = defineProps<{
    isScanning: boolean,
    isSelection: boolean,
    scanAll: boolean,
    startScan: () => void,
    addSelectedArcs: () => void,
    cancel: () => void
}>();

</script>

<template>
    <q-card-actions align="right" class="q-pt-xl bg-white">        
        <q-toggle 
            :model-value="scanAll" 
            label="Scan All Local Arcs"
            @update:model-value="$emit('update:scanAll', $event)"
            class="q-pl-md q-pr-xl"
        />
        <q-btn v-if="!isSelection" label="Start Scan" color="primary" @click="startScan" :disable="isScanning"/>
        <q-btn v-if="isSelection" label="Add Selected Arcs" color="primary" @click="addSelectedArcs" :disable="isScanning"/>
        <q-btn label="Cancel" color="secondary" @click="cancel" />
  </q-card-actions>
</template>