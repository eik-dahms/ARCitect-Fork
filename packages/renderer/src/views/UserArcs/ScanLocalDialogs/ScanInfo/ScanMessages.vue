<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    scanState: searchUpdate | undefined
}>();

// Create a computed property to reverse the array without mutating the original
const reversedInfos = computed(() => {
  return props.scanState?.infos ? [...props.scanState.infos].reverse() : [];
});

</script>

<template>
    <div style="height:100%">
    <div class="text-subtitle2">
        <span v-if="scanState?.infos?.length ?? 0 > 0">Scan Info:</span>
        <span v-else>No scan info available</span>
    </div>
    <div class="scroll" style="height:90%">
        <div v-for="(info, index) in reversedInfos" :key="index" style="font-size: 0.75em;">
            {{info.data}} <br />
        </div>
    </div>
    </div>
</template>